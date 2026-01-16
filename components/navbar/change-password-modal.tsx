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

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    
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

    const handleChangePassword = async () => {
        // 기본 유효성 검사
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast({
                title: "입력 오류",
                description: "모든 필드를 입력해주세요.",
                variant: "destructive",
            });
            return;
        }

        // 새 비밀번호 확인
        if (newPassword !== confirmPassword) {
            toast({
                title: "비밀번호 불일치",
                description: "새 비밀번호가 일치하지 않습니다.",
                variant: "destructive",
            });
            return;
        }

        // 새 비밀번호 유효성 검사
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
            // 현재 비밀번호로 로그인 시도하여 확인
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: (await supabase.auth.getUser()).data.user?.email!,
                password: currentPassword,
            });

            if (signInError) {
                toast({
                    title: "인증 실패",
                    description: "현재 비밀번호가 올바르지 않습니다.",
                    variant: "destructive",
                });
                return;
            }

            // 비밀번호 변경
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (updateError) {
                throw updateError;
            }

            toast({
                title: "성공",
                description: "비밀번호가 성공적으로 변경되었습니다.",
            });

            // 모달 닫고 상태 초기화
            handleClose();

        } catch (error) {
            console.error('비밀번호 변경 중 오류:', error);
            toast({
                title: "오류 발생",
                description: "비밀번호 변경 중 오류가 발생했습니다.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError('');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>비밀번호 변경</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="currentPassword">현재 비밀번호</Label>
                        <Input
                            id="currentPassword"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="현재 비밀번호 입력"
                        />
                    </div>
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
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleClose}>
                        취소
                    </Button>
                    <Button 
                        onClick={handleChangePassword} 
                        disabled={isLoading}
                    >
                        {isLoading ? "변경 중..." : "변경하기"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
} 