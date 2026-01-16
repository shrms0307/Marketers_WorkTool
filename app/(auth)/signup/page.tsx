'use client';

import {
    signup,
    checkEmailExists,
    sendVerificationEmail,
    verifyEmailCode,
} from '@/app/(auth)/signup/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { IMAGE_PATHS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [isEmailChecked, setIsEmailChecked] = useState(false);
    const [isEmailAvailable, setIsEmailAvailable] = useState(false);
    const [isEmailVerified, setIsEmailVerified] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [passwordMatch, setPasswordMatch] = useState(true);
    const [showVerificationInput, setShowVerificationInput] = useState(false);
    const [isPasswordValid, setIsPasswordValid] = useState(false);
    const [passwordError, setPasswordError] = useState<string>('');

    const { toast } = useToast();
    const supabase = createClient();
    const router = useRouter();

    // 비밀번호 유효성 검사
    const validatePassword = (password: string) => {
        // 영문, 숫자 조합 체크
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);

        if (password.length < 8 || !hasLetter || !hasNumber) {
            setPasswordError('비밀번호는 영문과 숫자를 모두 포함하며 8자 이상이어야 합니다.');
            setIsPasswordValid(false);
            return;
        }

        setPasswordError('');
        setIsPasswordValid(true);
    };

    // 비밀번호 변경 시 유효성 검사
    useEffect(() => {
        if (password) {
            validatePassword(password);
        } else {
            setPasswordError('비밀번호는 영문과 숫자를 모두 포함하며 8자 이상이어야 합니다.');
            setIsPasswordValid(false);
        }
    }, [password]);

    // 비밀번호 일치 여부 확인
    useEffect(() => {
        if (passwordConfirm) {
            setPasswordMatch(password === passwordConfirm);
        }
    }, [password, passwordConfirm]);

    // 이메일 중복 확인
    const checkEmail = async () => {
        if (!email) {
            toast({
                title: '이메일 확인',
                description: '이메일을 입력해주세요.',
                variant: 'destructive',
            });
            return;
        }

        // 이메일 형식 검사
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast({
                title: '이메일 확인',
                description: '올바른 이메일 형식이 아닙니다.',
                variant: 'destructive',
            });
            return;
        }

        setIsLoading(true);
        try {
            const { exists } = await checkEmailExists(email);

            if (exists) {
                setIsEmailAvailable(false);
                setIsEmailChecked(true);
                toast({
                    title: '이메일 확인',
                    description: '이미 사용중인 이메일입니다.',
                    variant: 'destructive',
                });
            } else {
                setIsEmailAvailable(true);
                setIsEmailChecked(true);
                toast({
                    title: '이메일 확인',
                    description: '사용 가능한 이메일입니다.',
                });
            }
        } catch (error) {
            setIsEmailAvailable(false);
            setIsEmailChecked(false);
            toast({
                title: '오류',
                description: '이메일 확인 중 오류가 발생했습니다.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    // 이메일 인증 코드 전송
    const handleSendVerification = async () => {
        if (!isEmailChecked || !isEmailAvailable) {
            toast({
                title: '이메일 확인',
                description: '먼저 이메일 중복 확인을 해주세요.',
                variant: 'destructive',
            });
            return;
        }

        setIsLoading(true);
        try {
            const response = await sendVerificationEmail(email);
            if (response.success) {
                setShowVerificationInput(true); // 인증 코드 입력창 표시
                toast({
                    title: '인증 코드 전송',
                    description: '인증 코드가 이메일로 전송되었습니다.',
                });
            } else {
                toast({
                    title: '전송 실패',
                    description: response.message || '인증 코드 전송에 실패했습니다.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: '오류',
                description: '인증 코드 전송 중 오류가 발생했습니다.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    // 이메일 인증 코드 확인
    const handleVerifyCode = async () => {
        if (!verificationCode) {
            toast({
                title: '인증 코드 확인',
                description: '인증 코드를 입력해주세요.',
                variant: 'destructive',
            });
            return;
        }

        setIsLoading(true);
        try {
            const response = await verifyEmailCode(email, verificationCode);
            if (response.success) {
                setIsEmailVerified(true);
                toast({
                    title: '인증 완료',
                    description: response.message,
                });
            } else {
                toast({
                    title: '인증 실패',
                    description: response.message,
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: '오류',
                description: '인증 코드 확인 중 오류가 발생했습니다.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignup = async (formData: FormData) => {
        // 이메일 인증 확인
        if (!isEmailVerified) {
            toast({
                title: '회원가입 실패',
                description: '이메일 인증이 필요합니다.',
                variant: 'destructive',
            });
            return;
        }

        // 이메일 중복 확인 여부 체크
        if (!isEmailChecked || !isEmailAvailable) {
            toast({
                title: '회원가입 실패',
                description: '이메일 중복 확인이 필요합니다.',
                variant: 'destructive',
            });
            return;
        }

        // 비밀번호 유효성 체크
        if (!isPasswordValid) {
            toast({
                title: '회원가입 실패',
                description: '비밀번호 조건을 만족해야 합니다.',
                variant: 'destructive',
            });
            return;
        }

        // 비밀번호 일치 여부 체크
        if (!passwordMatch) {
            toast({
                title: '회원가입 실패',
                description: '비밀번호가 일치하지 않습니다.',
                variant: 'destructive',
            });
            return;
        }

        setIsLoading(true);
        const response = await signup(formData);
        setIsLoading(false);

        toast({
            title: response.success ? '회원가입 성공' : '회원가입 실패',
            description: response.success
                ? '회원가입이 완료되었습니다. 관리자의 승인이 필요합니다.'
                : response.message,
            variant: response.success ? 'default' : 'destructive',
        });

        if (response.success) {
            // 회원가입 성공 시 3초 후 로그인 페이지로 이동
            setTimeout(() => {
                router.push('/login');
            }, 500);
        }
    };

    return (
        <div className="grid grid-cols-2 min-h-screen">
            {/* 왼쪽 브랜드 섹션 */}
            <div className="bg-[#56b4d7] flex items-center justify-center">
                <Image
                    src={`${IMAGE_PATHS.ICONS}/logo.png`}
                    alt="더바이럴"
                    width={200}
                    height={50}
                    className="w-auto h-auto brightness-0 invert dark:brightness-100 dark:invert-0"
                />
            </div>

            {/* 오른쪽 회원가입 폼 */}
            <div className="flex items-center justify-center">
                <Card className="w-[350px]">
                    <CardHeader>
                        <CardTitle>회원가입</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form
                            className="flex flex-col space-y-4"
                            onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.target as HTMLFormElement);
                                handleSignup(formData);
                            }}
                        >
                            <div className="space-y-2">
                                <Label htmlFor="name">이름</Label>
                                <Input id="name" name="name" type="text" required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">이메일</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            setIsEmailChecked(false);
                                            setIsEmailAvailable(false);
                                            setIsEmailVerified(false);
                                        }}
                                        required
                                    />
                                    <Button
                                        type="button"
                                        onClick={checkEmail}
                                        disabled={isLoading}
                                        className="shrink-0"
                                    >
                                        중복확인
                                    </Button>
                                </div>
                            </div>

                            {isEmailAvailable && (
                                <div className="space-y-2">
                                    {!showVerificationInput ? (
                                        <Button
                                            type="button"
                                            onClick={handleSendVerification}
                                            disabled={isLoading || isEmailVerified}
                                            className="w-full"
                                        >
                                            {isEmailVerified ? '인증완료' : '이메일 인증하기'}
                                        </Button>
                                    ) : (
                                        !isEmailVerified && (
                                            <div className="space-y-2">
                                                <div className="flex gap-2">
                                                    <Input
                                                        placeholder="인증 코드 6자리 입력"
                                                        value={verificationCode}
                                                        onChange={(e) =>
                                                            setVerificationCode(e.target.value)
                                                        }
                                                        maxLength={6}
                                                        className="text-center tracking-widest"
                                                    />
                                                    <Button
                                                        type="button"
                                                        onClick={handleVerifyCode}
                                                        disabled={isLoading || !verificationCode}
                                                        className="shrink-0"
                                                    >
                                                        확인
                                                    </Button>
                                                </div>
                                                <div className="flex justify-between items-center text-sm text-muted-foreground">
                                                    <span>인증 코드는 10분간 유효합니다</span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={handleSendVerification}
                                                        disabled={isLoading}
                                                    >
                                                        재전송
                                                    </Button>
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="password">비밀번호</Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />

                                {passwordError && (
                                    <p className="text-sm text-red-500">{passwordError}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Input
                                    id="passwordConfirm"
                                    placeholder="비밀번호 확인"
                                    name="passwordConfirm"
                                    type="password"
                                    value={passwordConfirm}
                                    onChange={(e) => setPasswordConfirm(e.target.value)}
                                    required
                                />
                                {passwordConfirm && !passwordMatch && (
                                    <p className="text-sm text-red-500">
                                        비밀번호가 일치하지 않습니다.
                                    </p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                disabled={isLoading || !passwordMatch || !isPasswordValid}
                                className="mt-5 w-full"
                            >
                                {isLoading ? '로딩 중...' : '회원가입'}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <div className="text-sm text-muted-foreground">
                            계정이 있으신가요?{' '}
                            <Link href="/login" className="text-primary hover:underline">
                                로그인하러 가기
                            </Link>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
