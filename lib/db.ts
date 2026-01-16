import { Pool, PoolConnection } from 'mysql2/promise'
import { Client } from 'ssh2'
import mysql from 'mysql2/promise'

let pool: Pool | null = null
let sshClient: Client | null = null

// DB 직접 연결 생성
async function createDirectConnection(): Promise<Pool> {
  try {
    console.log('DB 직접 연결 시도')
    return mysql.createPool({
      host: 'host.docker.internal',
      port: 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      connectionLimit: 10,
      queueLimit: 0,
    })
  } catch (error) {
    console.error('DB 직접 연결 실패:', error)
    throw error
  }
}

// SSH 터널을 통한 DB 연결 생성
async function createSSHTunnelConnection(): Promise<Pool> {
  return new Promise((resolve, reject) => {
    try {
      sshClient = new Client();

      // 에러 핸들링을 먼저 설정
      sshClient.on('error', (err) => {
        console.error('SSH 연결 에러:', err);
        sshClient = null;
        reject(err);
      });

      sshClient.on('ready', () => {
        if (!sshClient) {
          reject(new Error('SSH 클라이언트가 준비되지 않았습니다'));
          return;
        }

        sshClient.forwardOut(
          '127.0.0.1',
          3306,
          'localhost',
          3306,
          async (err, stream) => {
            if (err) {
              console.error('Port forwarding 에러:', err);
              sshClient?.end();
              sshClient = null;
              reject(err);
              return;
            }

            try {
              const pool = mysql.createPool({
                stream,
                host: 'localhost',
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_DATABASE,
                connectionLimit: 10,
                queueLimit: 0,
              });
              resolve(pool);
            } catch (error) {
              console.error('Pool 생성 에러:', error);
              sshClient?.end();
              sshClient = null;
              reject(error);
            }
          }
        );
      });

      // SSH 연결 시도
      sshClient.connect({
        host: process.env.SSH_HOST,
        port: 22,
        username: process.env.SSH_USER,
        password: process.env.SSH_PASSWORD,
      });

    } catch (error) {
      console.error('SSH 터널링 초기화 에러:', error);
      sshClient = null;
      reject(error);
    }
  });
}

export async function getPool() {
  if (!pool) {
    try {
      pool = process.env.USE_SSH === 'true'
        ? await createSSHTunnelConnection()
        : await createDirectConnection()
      
      // 연결 테스트
      const connection = await pool.getConnection()
      connection.release()
      console.log('DB 연결 성공')
    } catch (error) {
      console.error('DB 연결 실패:', error)
      await closePool() // 에러 발생 시 연결 정리
      throw error
    }
  }
  return pool
}

export async function withConnection<T>(
  callback: (connection: PoolConnection) => Promise<T>
): Promise<T> {
  const pool = await getPool()
  const connection = await pool.getConnection()
  
  try {
    const result = await callback(connection)
    await closePool() // 요청 처리 후 연결 종료
    return result
  } catch (error) {
    console.error('쿼리 실행 중 오류:', error)
    await closePool() // 에러 발생 시에도 연결 종료
    throw error
  } finally {
    connection.release()
  }
}

// 모든 연결 종료
export async function closePool() {
  try {
    if (pool) {
      await pool.end()
      pool = null
    }
    if (sshClient) {
      sshClient.end()
      sshClient = null
    }
  } catch (error) {
    console.error('연결 종료 중 오류:', error)
    pool = null
    sshClient = null
    throw error
  }
}