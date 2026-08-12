import React, { useState, useEffect, useRef } from 'react';
import { KeyRound, CheckCircle2, AlertCircle, X, Lock, ShieldCheck } from 'lucide-react';
import { soundManager } from '../utils/sound';

interface AdminPasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminPassword: string;
  onChangePassword: (newPassword: string) => void;
}

export const AdminPasswordChangeModal: React.FC<AdminPasswordChangeModalProps> = ({
  isOpen,
  onClose,
  adminPassword,
  onChangePassword,
}) => {
  const [step, setStep] = useState<'verify' | 'change'>('verify');
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const currentInputRef = useRef<HTMLInputElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('verify');
      setCurrentPasswordInput('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMessage('');
      setSuccessMessage('');
      setIsShaking(false);
      setTimeout(() => {
        currentInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Verify existing password
  const handleVerifyCurrent = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPasswordInput === adminPassword) {
      soundManager.playPop();
      setStep('change');
      setErrorMessage('');
      setTimeout(() => {
        newInputRef.current?.focus();
      }, 100);
    } else {
      soundManager.playTick();
      setErrorMessage('기존 비밀번호가 올바르지 않습니다.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  // Submit new password
  const handleChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setErrorMessage('새 비밀번호를 입력해주세요.');
      return;
    }
    if (newPassword.length < 2) {
      setErrorMessage('비밀번호는 최소 2자리 이상이어야 합니다.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    onChangePassword(newPassword.trim());
    soundManager.playFanfare();
    setSuccessMessage('관리자 비밀번호가 성공적으로 변경되었습니다!');

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div
        className={`bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 transition-transform ${
          isShaking ? 'animate-bounce border-rose-500' : ''
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">관리자 비밀번호 수정</h3>
              <p className="text-[11px] text-slate-500">
                {step === 'verify' ? 'Step 1: 기존 비밀번호 확인' : 'Step 2: 새 비밀번호 설정'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Toast Banner */}
        {successMessage ? (
          <div className="py-6 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
            <p className="text-sm font-bold text-slate-800">{successMessage}</p>
          </div>
        ) : step === 'verify' ? (
          /* Step 1: Verify Existing Password */
          <form onSubmit={handleVerifyCurrent} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2 text-center">
                비밀번호 수정을 위해 <span className="text-indigo-600 font-bold">기존 비밀번호</span>를 입력하세요
              </label>
              <div className="relative">
                <input
                  ref={currentInputRef}
                  type="password"
                  value={currentPasswordInput}
                  onChange={(e) => {
                    setCurrentPasswordInput(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="기존 비밀번호 입력"
                  className="w-full text-center text-xl font-mono tracking-widest py-3 px-4 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
                />
              </div>

              {errorMessage ? (
                <div className="flex items-center justify-center space-x-1 mt-2 text-xs text-rose-600 font-semibold animate-pulse">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 text-center mt-2">
                  본인 확인 후 새 비밀번호로 변경할 수 있습니다.
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition"
              >
                취소
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 transition"
              >
                다음
              </button>
            </div>
          </form>
        ) : (
          /* Step 2: Set New Password */
          <form onSubmit={handleChangeSubmit} className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  새 관리자 비밀번호
                </label>
                <input
                  ref={newInputRef}
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="새 비밀번호"
                  className="w-full text-center text-lg font-mono tracking-widest py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  새 비밀번호 확인
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="새 비밀번호 재입력"
                  className="w-full text-center text-lg font-mono tracking-widest py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
                />
              </div>

              {errorMessage && (
                <div className="flex items-center justify-center space-x-1 text-xs text-rose-600 font-semibold animate-pulse">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setStep('verify')}
                className="py-2.5 px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition"
              >
                이전
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-500/20 transition"
              >
                비밀번호 변경 완료
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
