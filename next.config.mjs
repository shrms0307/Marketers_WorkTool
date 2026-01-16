/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
    typescript: {
          // TypeScript 에러가 있어도 빌드 진행
          ignoreBuildErrors: true,
        },
        eslint: {
          // ESLint 에러가 있어도 빌드 진행
          ignoreDuringBuilds: true,
        },
    experimental: {
        serverComponentsExternalPackages: [
            'ssh2',
            'cpu-features',
            'ssh2-sftp-client',
            'canvas'
        ],
        serverActions: {
            bodySizeLimit: '2mb',
        },
    },
    images: {
      domains: [
        'blogpfthumb-phinf.pstatic.net',
        'ssl.pstatic.net',
      ],
      remotePatterns: [
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'localhost',
                port: '',
                pathname: '/**',
            }
        ],
    },
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                'ssh2': false,
                'cpu-features': false,
                'ssh2-sftp-client': false,
                'fs': false,
                'net': false,
                'tls': false,
                'path': false,
                'os': false,
                'crypto': false,
                'stream': false,
                'buffer': false,
                'http': false,
                'https': false,
                'zlib': false,
                'node:fs': false,
                'node:path': false,
                'node:crypto': false,
                'node:buffer': false,
                'node:stream': false,
                'node:util': false,
            };
        }
  
        if (isServer) {
            config.externals = [
                ...config.externals,
                'ssh2',
                'cpu-features',
                'ssh2-sftp-client'
            ];
        }
  
        return config;
    },
  };
  
  export default nextConfig;
  
  
  
  
  // /** @type {import('next').NextConfig} */
  // const nextConfig = {
  //   typescript: {
  //     // TypeScript 에러가 있어도 빌드 진행
  //     ignoreBuildErrors: true,
  //   },
  //   eslint: {
  //     // ESLint 에러가 있어도 빌드 진행
  //     ignoreDuringBuilds: true,
  //   },
    
  // };
    
  // export default nextConfig;