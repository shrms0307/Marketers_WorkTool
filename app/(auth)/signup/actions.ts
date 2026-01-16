'use server'

import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 이메일 전송을 위한 설정
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// 이메일 전송 함수
async function sendEmail(to: string, code: string) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject: '[더바이럴]스마트서비스 이메일 인증 코드',
        html: `
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
                <h2 style="color: #333; text-align: center;">이메일 인증 코드</h2>
                <p style="color: #666; text-align: center;">
                    안녕하세요. [더바이럴]스마트서비스 인증을 위한 인증 코드입니다.
                </p>
                <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; text-align: center; border-radius: 5px;">
                    <h3 style="color: #56b4d7; margin: 0; font-size: 24px;">${code}</h3>
                </div>
                <p style="color: #666; text-align: center; font-size: 14px;">
                    이 인증 코드는 10분 동안 유효합니다.
                </p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('이메일 전송 실패:', error);
        return false;
    }
}

export async function checkEmailExists(email: string) {
    try {
        // public.users 테이블에서 이메일 체크
        const { data, error } = await supabaseAdmin
            .from('user')
            .select('email')
            .eq('email', email)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116는 not found 에러
            throw error;
        }

        // 디버깅용 로그
        console.log('이메일 체크 결과:', {
            email,
            exists: !!data
        });

        return { exists: !!data };
    } catch (error) {
        console.error('이메일 중복 확인 중 오류:', error);
        throw error;
    }
}

import { supabase } from '@/lib/supabase';

export const signup = async (formData: FormData) => {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string; // 이름 추출

    // Supabase auth를 사용하여 회원가입 처리 및 user_metadata에 이름 추가
    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                name: name, // 메타데이터로 이름 추가
            },
        },
    });

    // 에러 상황에 따라 메시지 처리
    if (error) {
        let errorMessage = '회원가입 중 문제가 발생했습니다.';

        // Supabase에서 반환하는 에러 메시지별로 처리
        switch (error.message) {
            case 'Invalid login credentials':
                errorMessage = '잘못된 로그인 정보입니다. 이메일 또는 비밀번호를 확인하세요.';
                break;
            case 'Email not confirmed':
                errorMessage = '이메일 인증이 필요합니다. 이메일을 확인해 주세요.';
                break;
            case 'Password should be at least 6 characters':
                errorMessage = '비밀번호는 최소 6자 이상이어야 합니다.';
                break;
            case 'User already registered':
                errorMessage = '이미 등록된 이메일입니다. 다른 이메일을 사용하거나 로그인하세요.';
                break;
            case 'Invalid email':
                errorMessage = '유효하지 않은 이메일 형식입니다.';
                break;
            default:
                errorMessage = '회원가입 중 알 수 없는 오류가 발생했습니다.';
        }

        return { success: false, message: errorMessage };
    }

    // 자동으로 로그인된 상태이므로 로그아웃 처리
    await supabase.auth.signOut();

    return { success: true, message: '회원가입이 완료되었습니다. 관리자의 승인이 필요합니다.' };
};

// 6자리 랜덤 인증 코드 생성
function generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// 이메일 인증 코드 저장을 위한 맵
const verificationCodes = new Map<string, { code: string; expires: number }>();

export async function sendVerificationEmail(email: string) {
    const code = generateVerificationCode();
    const expires = Date.now() + 10 * 60 * 1000;
    
    // 이메일 전송
    const emailSent = await sendEmail(email, code);
    if (!emailSent) {
        return { success: false, message: '이메일 전송에 실패했습니다.' };
    }
    
    verificationCodes.set(email, { code, expires });
    return { success: true, code }; // 개발 환경에서만 코드 반환
}

export async function verifyEmailCode(email: string, code: string) {
    const verification = verificationCodes.get(email);
    
    if (!verification) {
        return { success: false, message: '인증 코드를 찾을 수 없습니다.' };
    }
    
    if (Date.now() > verification.expires) {
        verificationCodes.delete(email);
        return { success: false, message: '인증 코드가 만료되었습니다.' };
    }
    
    if (verification.code !== code) {
        return { success: false, message: '잘못된 인증 코드입니다.' };
    }
    
    verificationCodes.delete(email);
    return { success: true, message: '이메일 인증이 완료되었습니다.' };
}
