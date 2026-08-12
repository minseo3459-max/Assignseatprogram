import React, { useState } from 'react';
import { Student, Desk, TicketingState, TicketingClaim } from '../types';
import { soundManager } from '../utils/sound';
import {
  Ticket,
  Play,
  Pause,
  RefreshCw,
  Trash2,
  ExternalLink,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  Eye,
  Monitor,
  RotateCcw
} from 'lucide-react';

interface TicketingControlProps {
  students: Student[];
  desks: Desk[];
  setDesks: React.Dispatch<React.SetStateAction<Desk[]>>;
  ticketingState: TicketingState;
  setTicketingState: React.Dispatch<React.SetStateAction<TicketingState>>;
  onRefreshTicketing: () => void;
  onOpenStudentView: () => void;
}

export const TicketingControl: React.FC<TicketingControlProps> = ({
  students,
  desks,
  setDesks,
  ticketingState,
  setTicketingState,
  onRefreshTicketing,
  onOpenStudentView,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const activeStudents = students.filter((s) => !s.isAbsent);
  const totalDesks = desks.length;
  const claimedCount = Object.keys(ticketingState.claims).length;
  const remainingDesks = Math.max(0, totalDesks - claimedCount);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Toggle Ticketing Open/Close
  const handleToggleTicketing = () => {
    const nextState = !ticketingState.isOpen;
    setTicketingState((prev) => ({
      ...prev,
      isOpen: nextState,
      lastUpdated: new Date().toISOString(),
    }));

    if (nextState) {
      soundManager.playFanfare();
      showToast('🟢 학생 자리 티켓팅이 시작되었습니다!');
    } else {
      soundManager.playPop();
      showToast('🔴 학생 자리 티켓팅이 마감되었습니다.');
    }
  };

  // Manual Refresh Button Action (enabled strictly for ticketing)
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    soundManager.playPop();
    onRefreshTicketing();
    showToast('🔄 최신 학생 응모 현황을 불러왔습니다!');
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  // Reset Ticketing Claims
  const handleResetClaims = () => {
    if (window.confirm('모든 학생의 티켓팅 응모 내역을 초기화하시겠습니까?')) {
      const resetState: TicketingState = {
        isOpen: ticketingState.isOpen,
        claims: {},
        lastUpdated: new Date().toISOString(),
      };
      setTicketingState(resetState);

      // Reset assignedStudentId on desks
      setDesks((prev) => prev.map((d) => ({ ...d, assignedStudentId: null })));

      soundManager.playPop();
      showToast('티켓팅 응모 현황이 초기화되었습니다.');
    }
  };

  // Cancel individual claim by teacher
  const handleCancelSingleClaim = (deskId: string, studentName: string) => {
    if (window.confirm(`${studentName} 학생의 자리 응모를 취소하시겠습니까?`)) {
      const newClaims = { ...ticketingState.claims };
      delete newClaims[deskId];

      setTicketingState((prev) => ({
        ...prev,
        claims: newClaims,
        lastUpdated: new Date().toISOString(),
      }));

      setDesks((prev) =>
        prev.map((d) => (d.id === deskId ? { ...d, assignedStudentId: null } : d))
      );

      soundManager.playPop();
      showToast(`${studentName} 학생의 응모가 취소되었습니다.`);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center space-x-3 animate-bounce">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span className="font-bold text-sm">{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-black text-slate-900">🎟️ 실시간 학생 자리 티켓팅 제어</h2>

            {ticketingState.isOpen ? (
              <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-3 py-1 rounded-full border border-emerald-300 flex items-center space-x-1 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>티켓팅 진행 중</span>
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full border border-slate-300 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5" />
                <span>티켓팅 대기/마감</span>
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            교사가 자리를 지정해두면 학생들이 실시간으로 빈 자리에 응모할 수 있습니다.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Toggle Button */}
          <button
            onClick={handleToggleTicketing}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-black text-white shadow-md transition transform active:scale-95 ${
              ticketingState.isOpen
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'
            }`}
          >
            {ticketingState.isOpen ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>티켓팅 마감하기</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>티켓팅 시작하기</span>
              </>
            )}
          </button>

          {/* REALTIME REFRESH BUTTON (Requested by user: enabled only for ticketing!) */}
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-md transition ${
              isRefreshing ? 'opacity-70 cursor-wait' : ''
            }`}
            title="학생들의 실시간 응모 현황을 즉시 불러옵니다"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>실시간 업데이트</span>
          </button>

          {/* Open Student View Button */}
          <button
            onClick={onOpenStudentView}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 transition shadow-md"
          >
            <Monitor className="w-4 h-4 text-emerald-400" />
            <span>학생 응모 창 보기</span>
          </button>

          {/* Reset Button */}
          <button
            onClick={handleResetClaims}
            title="응모 내역 초기화"
            className="p-2.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 rounded-xl transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="text-xs font-bold text-slate-500">배정 대상 학생</div>
          <div className="text-xl font-black text-slate-900 mt-1">{activeStudents.length}명</div>
        </div>

        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
          <div className="text-xs font-bold text-emerald-800">응모 완료 학생</div>
          <div className="text-xl font-black text-emerald-700 mt-1">{claimedCount}명</div>
        </div>

        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
          <div className="text-xs font-bold text-amber-800">남은 빈 자리</div>
          <div className="text-xl font-black text-amber-700 mt-1">{remainingDesks}석</div>
        </div>

        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
          <div className="text-xs font-bold text-indigo-800">응모 달성률</div>
          <div className="text-xl font-black text-indigo-700 mt-1">
            {activeStudents.length > 0
              ? Math.round((claimedCount / activeStudents.length) * 100)
              : 0}
            %
          </div>
        </div>
      </div>

      {/* Live Applications Table / List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
            <span>📋 학생별 응모 자리 현황</span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
              총 {claimedCount}명
            </span>
          </h3>

          <span className="text-xs text-slate-400">
            마지막 업데이트: {new Date(ticketingState.lastUpdated).toLocaleTimeString('ko-KR')}
          </span>
        </div>

        {claimedCount === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            아직 학생들의 응모 내역이 없습니다. [티켓팅 시작하기]를 누르고 학생 응모 창에서 응모를 시작해 보세요!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {(Object.entries(ticketingState.claims) as [string, TicketingClaim][]).map(([deskId, claim]) => {
              const desk = desks.find((d) => d.id === deskId);
              return (
                <div
                  key={deskId}
                  className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="font-extrabold text-slate-900">{claim.studentName}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {desk?.label || '자리'}번 ({desk?.sectionId || 1}분단)
                    </span>

                    <button
                      onClick={() => handleCancelSingleClaim(deskId, claim.studentName)}
                      title="응모 취소"
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
