import React, { useState } from 'react';
import { Student, Desk, TicketingState, TicketingClaim } from '../types';
import { soundManager } from '../utils/sound';
import { ShareLinkModal } from './ShareLinkModal';
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
  RotateCcw,
  Share2,
  Copy,
  Check,
  Link as LinkIcon,
  QrCode
} from 'lucide-react';

interface TicketingControlProps {
  students: Student[];
  desks: Desk[];
  setDesks: React.Dispatch<React.SetStateAction<Desk[]>>;
  ticketingState: TicketingState;
  setTicketingState: React.Dispatch<React.SetStateAction<TicketingState>>;
  onRefreshTicketing: () => void | Promise<void>;
  onOpenStudentView: () => void;
  classId?: string;
  onGenerateRandomLink?: () => string;
}

export const TicketingControl: React.FC<TicketingControlProps> = ({
  students,
  desks,
  setDesks,
  ticketingState,
  setTicketingState,
  onRefreshTicketing,
  onOpenStudentView,
  classId,
  onGenerateRandomLink,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedQuickLink, setCopiedQuickLink] = useState(false);

  const activeStudents = students.filter((s) => !s.isAbsent);
  const totalDesks = desks.length;
  const claimedCount = Object.keys(ticketingState.claims).length;
  const remainingDesks = Math.max(0, totalDesks - claimedCount);

  // Dedicated Student Link with unique classId query parameter
  const baseUrl = window.location.origin + window.location.pathname;
  const studentLink = classId
    ? `${baseUrl}?classId=${classId}&mode=student_ticketing`
    : `${baseUrl}?mode=student_ticketing`;

  const handleRandomizeLink = () => {
    if (onGenerateRandomLink) {
      const newId = onGenerateRandomLink();
      soundManager.playFanfare();
      showToast(`🎲 새 학급 전용 링크(코드: ${newId})가 생성되었습니다!`);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleCopyQuickLink = async () => {
    try {
      await navigator.clipboard.writeText(studentLink);
      soundManager.playPop();
      setCopiedQuickLink(true);
      showToast('📋 학생 전용 티켓팅 링크가 복사되었습니다!');
      setTimeout(() => setCopiedQuickLink(false), 2500);
    } catch {
      setCopiedQuickLink(true);
      showToast('📋 학생 전용 티켓팅 링크가 복사되었습니다!');
      setTimeout(() => setCopiedQuickLink(false), 2500);
    }
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
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    soundManager.playPop();
    await onRefreshTicketing();
    showToast('🔄 최신 학생 응모 현황을 불러왔습니다!');
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  // Reset Ticketing Claims
  const handleResetClaims = async () => {
    if (window.confirm('모든 학생의 티켓팅 응모 내역을 초기화하시겠습니까?')) {
      if (classId) {
        try {
          const res = await fetch(`/api/classrooms/${classId}/reset-claims`, {
            method: 'POST',
          });
          if (res.ok) {
            const data = await res.json();
            if (data.classroom) {
              setTicketingState(data.classroom.ticketingState);
              if (data.classroom.desks) setDesks(data.classroom.desks);
            }
          }
        } catch {
          // Fallback
        }
      } else {
        const resetState: TicketingState = {
          isOpen: ticketingState.isOpen,
          claims: {},
          lastUpdated: new Date().toISOString(),
        };
        setTicketingState(resetState);
        setDesks((prev) => prev.map((d) => ({ ...d, assignedStudentId: null })));
      }

      soundManager.playPop();
      showToast('티켓팅 응모 현황이 초기화되었습니다.');
    }
  };

  // Cancel individual claim by teacher
  const handleCancelSingleClaim = async (deskId: string, studentName: string) => {
    if (window.confirm(`${studentName} 학생의 자리 응모를 취소하시겠습니까?`)) {
      const claim = ticketingState.claims[deskId];
      if (classId && claim) {
        try {
          const res = await fetch(`/api/classrooms/${classId}/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentId: claim.studentId,
              studentName: claim.studentName,
              deskId: deskId,
              action: 'cancel',
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.ticketingState) setTicketingState(data.ticketingState);
            if (data.desks) setDesks(data.desks);
          }
        } catch {
          // Fallback
        }
      } else {
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
      }

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
            학생 전용 공유 링크를 통해 학생들이 각자의 디바이스에서 실시간으로 자리를 응모할 수 있습니다.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Link Generation & Share Button */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-black text-sm bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white shadow-md shadow-indigo-500/20 transition transform active:scale-95 animate-pulse"
          >
            <Share2 className="w-4 h-4" />
            <span>🔗 학생 전용 링크 생성 & 공유</span>
          </button>

          {/* Main Toggle Button */}
          <button
            onClick={handleToggleTicketing}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-black text-sm text-white shadow-md transition transform active:scale-95 ${
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

          {/* REALTIME REFRESH BUTTON */}
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 active:scale-95 text-white shadow-md transition ${
              isRefreshing ? 'opacity-70 cursor-wait' : ''
            }`}
            title="학생들의 실시간 응모 현황을 즉시 불러옵니다"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">실시간 업데이트</span>
          </button>

          {/* Open Student View Button */}
          <button
            onClick={onOpenStudentView}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl font-bold text-sm bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition shadow-xs"
          >
            <Monitor className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">학생 화면 열기</span>
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

      {/* Quick Share Link Banner Card */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-4 sm:p-5 rounded-2xl shadow-lg border border-indigo-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center justify-center font-bold text-xl shrink-0">
            🔗
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold text-indigo-300 uppercase tracking-wider">
                학생 전용 티켓팅 자동 생성 링크
              </span>
              {classId && (
                <span className="bg-indigo-500/30 text-indigo-200 text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full border border-indigo-400/40">
                  코드: {classId}
                </span>
              )}
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                실시간 동기화 지원
              </span>
            </div>
            <p className="text-xs text-slate-300 truncate mt-0.5 font-mono">
              {studentLink}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onGenerateRandomLink && (
            <button
              onClick={handleRandomizeLink}
              title="다른 학급과 겹치지 않도록 완전히 새로운 링크를 생성합니다"
              className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-500/30 hover:bg-indigo-500/50 text-indigo-200 border border-indigo-400/30 rounded-xl text-xs font-bold transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>🎲 링크 랜덤 변경</span>
            </button>
          )}

          <button
            onClick={handleCopyQuickLink}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition shadow-md ${
              copiedQuickLink
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-indigo-500 hover:bg-indigo-400 text-white'
            }`}
          >
            {copiedQuickLink ? (
              <>
                <Check className="w-4 h-4" />
                <span>복사 완료!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>링크 복사</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>QR/공유 상세</span>
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
            아직 학생들의 응모 내역이 없습니다. 상단 [학생 전용 링크 생성 & 공유] 버튼으로 학생들에게 링크를 보내보세요!
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
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="font-extrabold text-slate-900">{claim.studentName}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {desk?.label ? (desk.label.endsWith('번') ? desk.label : `${desk.label}번`) : '자리'} ({desk?.sectionId || 1}분단)
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

      {/* Share Link Modal */}
      <ShareLinkModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        ticketingState={ticketingState}
        onToggleTicketing={handleToggleTicketing}
        classId={classId}
        onGenerateRandomLink={onGenerateRandomLink}
      />
    </div>
  );
};

