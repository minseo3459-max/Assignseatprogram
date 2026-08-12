import React, { useState, useEffect, useRef } from 'react';
import { Lock, KeyRound, CheckCircle2, AlertCircle, X, ShieldAlert } from 'lucide-react';
import { soundManager } from '../utils/sound';

interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  adminPassword?: string;
}

export const AdminPasswordModal: React.FC<AdminPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  adminPassword = '2580',
}) => {
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setErrorMessage('');
      setIsShaking(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyPassword(password);
  };

  const verifyPassword = (inputPwd: string) => {
    if (inputPwd === adminPassword) {
      soundManager.playFanfare();
      onSuccess();
      onClose();
    } else {
      soundManager.playPop();
      setErrorMessage('비밀번호가 올바르지 않습니다.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    if (errorMessage) setErrorMessage('');
    // Auto submit if entered length matches admin password length
    if (val.length === adminPassword.length) {
      verifyPassword(val);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div
        className={`bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 transition-transform ${
          isShaking ? 'animate-bounce border-rose-500' : ''
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">관리자 인증 모드</h3>
              <p className="text-[11px] text-slate-500">비밀 자리 설정 전용 접근</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2 text-center">
              관리자 비밀번호를 입력하세요
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="password"
                maxLength={6}
                value={password}
                onChange={handleInputChange}
                placeholder="비밀번호 4자리"
                className="w-full text-center text-2xl font-mono tracking-[0.5em] py-3 px-4 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
              />
            </div>

            {errorMessage ? (
              <div className="flex items-center justify-center space-x-1 mt-2 text-xs text-rose-600 font-semibold animate-pulse">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 text-center mt-2">
                4자리 수치를 입력하면 자동 확인됩니다.
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
              확인
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
