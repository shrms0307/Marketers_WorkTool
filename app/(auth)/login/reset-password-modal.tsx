'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { sendVerificationEmail, verifyEmailCode } from '@/app/(auth)/signup/actions';
import { resetUserPassword } from './actions';

interface ResetPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ResetPasswordModal({ isOpen, onClose }: ResetPasswordModalProps) {
    const [email, setEmail] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<'email' | 'verify' | 'reset'>('email');
    
    const supabase = createClient();
    const { toast } = useToast();

    // 비밀번호 유효성 검사
    const validatePassword = (password: string) => {
        if (password.length < 8) {
            return '비밀번호는 8자 이상이어야 합니다.';
        }
        
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        
        if (!hasLetter || !hasNumber) {
            return '비밀번호는 영문과 숫자를 모두 포함해야 합니다.';
        }

        return '';
    };

    // 이메일로 인증 코드 전송
    const handleSendVerification = async () => {
        if (!email) {
            toast({
                title: "이메일 확인",
                description: "이메일을 입력해주세요.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const response = await sendVerificationEmail(email);
            if (response.success) {
                setStep('verify');
                toast({
                    title: "인증 코드 전송",
                    description: "이메일로 인증 코드가 전송되었습니다.",
                });
            } else {
                toast({
                    title: "전송 실패",
                    description: response.message || "인증 코드 전송에 실패했습니다.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "오류",
                description: "인증 코드 전송 중 오류가 발생했습니다.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    // 인증 코드 확인
    const handleVerifyCode = async () => {
        if (!verificationCode) {
            toast({
                title: "인증 코드 확인",
                description: "인증 코드를 입력해주세요.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const response = await verifyEmailCode(email, verificationCode);
            if (response.success) {
                setStep('reset');
                toast({
                    title: "인증 완료",
                    description: "이메일 인증이 완료되었습니다.",
                });
            } else {
                toast({
                    title: "인증 실패",
                    description: response.message,
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "오류",
                description: "인증 코드 확인 중 오류가 발생했습니다.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    // 비밀번호 재설정
    const handleResetPassword = async () => {
        if (!newPassword || !confirmPassword) {
            toast({
                title: "입력 오류",
                description: "새 비밀번호를 입력해주세요.",
                variant: "destructive",
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            toast({
                title: "비밀번호 불일치",
                description: "새 비밀번호가 일치하지 않습니다.",
                variant: "destructive",
            });
            return;
        }

        const passwordError = validatePassword(newPassword);
        if (passwordError) {
            toast({
                title: "비밀번호 오류",
                description: passwordError,
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const response = await resetUserPassword(email, newPassword);
            
            if (!response.success) {
                toast({
                    title: "오류",
                    description: response.message,
                    variant: "destructive",
                });
                return;
            }

            toast({
                title: "성공",
                description: "비밀번호가 성공적으로 재설정되었습니다. 새 비밀번호로 로그인해주세요.",
            });

            handleClose();
            
            // 3초 후 페이지 새로고침
            setTimeout(() => {
                window.location.reload();
            }, 3000);

        } catch (error) {
            console.error('비밀번호 재설정 중 오류:', error);
            toast({
                title: "오류 발생",
                description: "비밀번호 재설정 중 오류가 발생했습니다.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setEmail('');
        setVerificationCode('');
        setNewPassword('');
        setConfirmPassword('');
        setStep('email');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>비밀번호 찾기</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {step === 'email' && (
                        <div className="grid gap-2">
                            <Label htmlFor="email">이메일</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="가입한 이메일 주소 입력"
                            />
                            <Button 
                                onClick={handleSendVerification}
                                disabled={isLoading}
                            >
                                {isLoading ? "전송 중..." : "인증 코드 받기"}
                            </Button>
                        </div>
                    )}

                    {step === 'verify' && (
                        <div className="grid gap-2">
                            <Label htmlFor="verificationCode">인증 코드</Label>
                            <Input
                                id="verificationCode"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                placeholder="이메일로 받은 인증 코드 입력"
                                maxLength={6}
                            />
                            <p className="text-sm text-muted-foreground">
                                인증 코드는 10분간 유효합니다
                            </p>
                            <div className="flex gap-2">
                                <Button 
                                    variant="outline" 
                                    onClick={handleSendVerification}
                                    disabled={isLoading}
                                >
                                    재전송
                                </Button>
                                <Button 
                                    onClick={handleVerifyCode}
                                    disabled={isLoading}
                                    className="flex-1"
                                >
                                    {isLoading ? "확인 중..." : "확인"}
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 'reset' && (
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="newPassword">새 비밀번호</Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="새 비밀번호 입력"
                                />
                                <p className="text-sm text-muted-foreground">
                                    비밀번호는 8자 이상, 영문과 숫자를 포함해야 합니다.
                                </p>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="새 비밀번호 다시 입력"
                                />
                            </div>
                            <Button 
                                onClick={handleResetPassword}
                                disabled={isLoading}
                            >
                                {isLoading ? "변경 중..." : "비밀번호 변경"}
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
} 