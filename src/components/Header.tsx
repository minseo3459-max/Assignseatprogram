import React from 'react';
import { LayoutGrid, Users, Sparkles, Download, Volume2, VolumeX, RefreshCw, Save, FolderOpen, Grid3X3, ShieldCheck, KeyRound, Ticket } from 'lucide-react';

interface HeaderProps {
  activeTab: 'students' | 'layout' | 'assignment' | 'student_ticketing';
  setActiveTab: (tab: 'students' | 'layout' | 'assignment' | 'student_ticketing') => void;
  studentCount: number;
  deskCount: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenExportModal: () => void;
  onResetLayout: () => void;
  onSavePreset: () => void;
  onLoadPresetClick: () => void;
  isAdminMode: boolean;
  fixedCount: number;
  onOpenAdminModal: () => void;
  onOpenAdminPanel: () => void;
  isTicketingOpen?: boolean;
  isStudentOnlyMode?: boolean;
  onTeacherUnlockRequest?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  studentCount,
  deskCount,
  soundEnabled,
  onToggleSound,
  onOpenExportModal,
  onResetLayout,
  onSavePreset,
  onLoadPresetClick,
  isAdminMode,
  fixedCount,
  onOpenAdminModal,
  onOpenAdminPanel,
  isTicketingOpen,
  isStudentOnlyMode,
  onTeacherUnlockRequest,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold text-lg">
              <Grid3X3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-white">자리 배정 시스템</h1>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 self-start md:self-center">
            {isStudentOnlyMode ? (
              <div className="flex items-center space-x-2 px-4 py-1.5 rounded-lg text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-sm">
                <Ticket className="w-4 h-4 text-emerald-200" />
                <span>🎟️ 학생 실시간 응모 전용</span>
                {isTicketingOpen && (
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping"></span>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab('students')}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'students'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>1. 학생 명단 ({studentCount}명)</span>
                </button>

                <button
                  onClick={() => setActiveTab('layout')}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'layout'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>2. 자리 배치 ({deskCount}석)</span>
                </button>

                <button
                  onClick={() => setActiveTab('assignment')}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'assignment'
                      ? 'bg-gradient-to-r from-indigo-600 to-sky-500 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>3. 자리 배정 & 티켓팅</span>
                </button>

                <button
                  onClick={() => setActiveTab('student_ticketing')}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all ${
                    activeTab === 'student_ticketing'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-sm'
                      : 'text-emerald-300 hover:text-white hover:bg-emerald-950/40'
                  }`}
                >
                  <Ticket className="w-4 h-4 text-emerald-300" />
                  <span>🎟️ 학생 응모 창</span>
                  {isTicketingOpen && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  )}
                </button>
              </>
            )}
          </div>

          {/* Utility Actions */}
          <div className="flex items-center space-x-2 self-end md:self-center">
            <button
              onClick={onToggleSound}
              title={soundEnabled ? '효과음 끄기' : '효과음 켜기'}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {isStudentOnlyMode ? (
              <button
                onClick={onTeacherUnlockRequest}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/80 transition"
                title="교사 권한으로 교사 관리 화면 전환"
              >
                <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                <span>교사 모드 전환</span>
              </button>
            ) : (
              <>
                <button
                  onClick={onSavePreset}
                  title="현재 설정 저장하기"
                  className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  <Save className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">저장</span>
                </button>

                <button
                  onClick={onLoadPresetClick}
                  title="불러오기"
                  className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">불러오기</span>
                </button>

                <button
                  onClick={onResetLayout}
                  title="자리 초기화"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-400 border border-slate-700 transition"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                <button
                  onClick={onOpenExportModal}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-md shadow-emerald-900/30 transition transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Download className="w-4 h-4" />
                  <span>이미지 다운로드</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
