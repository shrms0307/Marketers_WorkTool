'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Card,
    CardContent,
    CardFooter,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import Image from 'next/image';
import { IMAGE_PATHS } from '@/lib/constants';
import { ResetPasswordModal } from '@/app/(auth)/login/reset-password-modal';
import { login } from './actions';

export function LoginForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    const handleLogin = async (formData: FormData) => {
        setIsLoading(true);
        try {
            const response = await login(formData);
            
            if (!response.success) {
                throw new Error(response.message);
            }

            toast({
                title: '로그인 성공',
                description: '로그인되었습니다.',
            });
            router.push('/auth/agreement');
        } catch (error) {
            console.error('Login error:', error);
            toast({
                title: '로그인 실패',
                description: (error as Error).message || '로그인에 실패했습니다.',
                action: <ToastAction altText="Try again">확인</ToastAction>,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen">
            <Card className="w-[350px]">
                <div className="flex justify-center pt-8">
                    <Image 
                        src={`${IMAGE_PATHS.ICONS}/logo.png`}
                        alt="더바이럴" 
                        width={150} 
                        height={40} 
                        className="w-auto h-full dark:brightness-0 dark:invert"
                    />
                </div>
                <CardContent className="pt-8">
                    <form
                        className="flex flex-col space-y-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.target as HTMLFormElement);
                            handleLogin(formData);
                        }}
                    >
                        <div className="space-y-2">
                            <Label htmlFor="email">이메일</Label>
                            <Input 
                                id="email" 
                                name="email" 
                                type="email" 
                                required 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">비밀번호</Label>
                            <Input 
                                id="password" 
                                name="password" 
                                type="password" 
                                required 
                            />
                            <div className="text-right">
                                <button
                                    type="button"
                                    onClick={() => setShowResetModal(true)}
                                    className="text-sm text-[#56b4d7] hover:underline"
                                >
                                    혹시 비밀번호를 잊으셨나요?
                                </button>
                            </div>
                        </div>
                        <Button 
                            type="submit" 
                            disabled={isLoading} 
                            className="mt-2 bg-[#56b4d7] hover:bg-[#56b4d7]/90"
                        >
                            {isLoading ? '로그인 중...' : '로그인'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                    <div className="relative w-full">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="px-2 text-muted-foreground">
                                또는
                            </span>
                        </div>
                    </div>
                    <div className="text-center text-sm text-muted-foreground">
                        회원이 아니신가요?{" "}
                        <Link href="/signup" className="text-[#56b4d7] hover:underline">
                            회원가입 하러가기
                        </Link>
                    </div>
                </CardFooter>
            </Card>
            <ResetPasswordModal
                isOpen={showResetModal}
                onClose={() => setShowResetModal(false)}
            />
        </div>
    );
}
