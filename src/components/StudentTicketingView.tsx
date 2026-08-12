import React, { useState, useEffect } from 'react';
import { Desk, Student, ClassroomConfig, TicketingState, TicketingClaim } from '../types';
import { soundManager } from '../utils/sound';
import confetti from 'canvas-confetti';
import {
  Ticket,
  UserCheck,
  RefreshCw,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Monitor,
  ShieldCheck,
  HelpCircle,
  Check,
  RotateCcw,
  Volume2,
  ArrowRight
} from 'lucide-react';
import { DESK_WIDTH, DESK_HEIGHT } from '../utils/classroom';

interface StudentTicketingViewProps {
  students: Student[];
  desks: Desk[];
  setDesks: React.Dispatch<React.SetStateAction<Desk[]>>;
  config: ClassroomConfig;
  ticketingState: TicketingState;
  onUpdateTicketingState: (newState: TicketingState) => void;
  onRefreshData: () => void;
  onSwitchToTeacherView?: () => void;
}

export const StudentTicketingView: React.FC<StudentTicketingViewProps> = ({
  students,
  desks,
  setDesks,
  config,
  ticketingState,
  onUpdateTicketingState,
  onRefreshData,
  onSwitchToTeacherView,
}) => {
  // Selected Student ID
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    try {
      return sessionStorage.getItem('student_ticketing_my_id') || '';
    } catch {
      return '';
    }
  });

  // Target desk student wants to book
  const [confirmDesk, setConfirmDesk] = useState<Desk | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeStudents = students.filter((s) => !s.isAbsent);
  const currentStudent = activeStudents.find((s) => s.id === selectedStudentId);

  // Find if current student already claimed a desk
  const currentStudentClaimEntry = (Object.entries(ticketingState.claims) as [string, TicketingClaim][]).find(
    ([_, claim]) => claim.studentId === selectedStudentId
  );
  const currentStudentDeskId = currentStudentClaimEntry ? currentStudentClaimEntry[0] : null;
  const currentStudentDesk = desks.find((d) => d.id === currentStudentDeskId);

  // Save selected student ID to sessionStorage
  const handleSelectStudent = (id: string) => {
    setSelectedStudentId(id);
    try {
      sessionStorage.setItem('student_ticketing_my_id', id);
    } catch {
      // Ignore
    }
  };

  // Toast feedback helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Handle Refresh Button
  const handleRefreshClick = () => {
    setIsRefreshing(true);
    soundManager.playPop();
    onRefreshData();
    showToast('🔄 실시간 응모 현황을 불러왔습니다!');
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  // Execute Seat Claiming
  const handleConfirmClaim = () => {
    if (!selectedStudentId || !currentStudent) {
      alert('먼저 본인 이름을 선택해주세요!');
      setConfirmDesk(null);
      return;
    }

    if (!confirmDesk) return;

    if (!ticketingState.isOpen) {
      alert('현재 티켓팅이 마감되었거나 진행 중이 아닙니다.');
      setConfirmDesk(null);
      return;
    }

    // Double check if seat was taken during click
    if (ticketingState.claims[confirmDesk.id]) {
      alert('⚠️ 방금 다른 학생이 이 자리를 선택했습니다! 다른 빈 자리를 선택해 주세요.');
      onRefreshData();
      setConfirmDesk(null);
      return;
    }

    const newClaims = { ...ticketingState.claims };

    // Remove old claim if changing seat
    if (currentStudentDeskId) {
      delete newClaims[currentStudentDeskId];
    }

    const nowStr = new Date().toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // Add new claim
    newClaims[confirmDesk.id] = {
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      claimedAt: nowStr,
    };

    const updatedState: TicketingState = {
      ...ticketingState,
      claims: newClaims,
      lastUpdated: new Date().toISOString(),
    };

    // Update parent ticketing state
    onUpdateTicketingState(updatedState);

    // Sync desks assignedStudentId for classroom representation
    setDesks((prev) =>
      prev.map((d) => {
        if (d.id === confirmDesk.id) {
          return { ...d, assignedStudentId: currentStudent.id };
        }
        if (d.id === currentStudentDeskId) {
          return { ...d, assignedStudentId: null };
        }
        return d;
      })
    );

    // Sound & Confetti Effect!
    soundManager.playFanfare();
    try {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }

    showToast(`🎉 [${confirmDesk.label}번 자리] 티켓팅 성공!`);
    setConfirmDesk(null);
  };

  // Cancel Claim
  const handleCancelClaim = () => {
    if (!currentStudentDeskId || !currentStudent) return;

    if (window.confirm('현재 자리 응모를 취소하시겠습니까?')) {
      const newClaims = { ...ticketingState.claims };
      delete newClaims[currentStudentDeskId];

      const updatedState: TicketingState = {
        ...ticketingState,
        claims: newClaims,
        lastUpdated: new Date().toISOString(),
      };

      onUpdateTicketingState(updatedState);

      setDesks((prev) =>
        prev.map((d) => (d.id === currentStudentDeskId ? { ...d, assignedStudentId: null } : d))
      );

      soundManager.playPop();
      showToast('자리 응모가 취소되었습니다.');
    }
  };

  // Calculate statistics
  const totalDesks = desks.length;
  const claimedCount = Object.keys(ticketingState.claims).length;
  const remainingDesks = Math.max(0, totalDesks - claimedCount);

  // Compute canvas size
  const maxDeskY = desks.reduce((max, d) => Math.max(max, d.y + DESK_HEIGHT), 400);
  const maxDeskX = desks.reduce((max, d) => Math.max(max, d.x + DESK_WIDTH), 700);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center space-x-3 animate-bounce">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span className="font-bold text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner for Student View */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-emerald-500/30 relative overflow-hidden">
        {/* Background Decorative Element */}
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 font-extrabold text-xs rounded-full border border-emerald-500/40 flex items-center space-x-1">
                <Ticket className="w-3.5 h-3.5" />
                <span>학생 실시간 응모 전용</span>
              </span>

              {ticketingState.isOpen ? (
                <span className="px-3 py-1 bg-emerald-500 text-slate-950 font-black text-xs rounded-full animate-pulse flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-slate-950"></span>
                  <span>티켓팅 진행 중</span>
                </span>
              ) : (
                <span className="px-3 py-1 bg-rose-500/30 text-rose-300 font-bold text-xs rounded-full border border-rose-500/40 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>티켓팅 대기 / 마감</span>
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              🎟️ 우리반 자율 자리 티켓팅
            </h2>
            <p className="text-slate-300 text-sm mt-1">
              본인 이름을 선택한 후 원하시는 빈 자리를 눌러 빠르게 자리를 응모하세요!
            </p>
          </div>

          {/* Controls: Realtime Update Button & Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRefreshClick}
              disabled={isRefreshing}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-95 transition shadow-lg shadow-emerald-500/20 ${
                isRefreshing ? 'opacity-70 cursor-wait' : ''
              }`}
              title="실시간 현황 업데이트"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>실시간 업데이트</span>
            </button>

            {onSwitchToTeacherView && (
              <button
                onClick={onSwitchToTeacherView}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                <Monitor className="w-4 h-4 text-indigo-400" />
                <span>교사 관리자 창으로 돌아가기</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 text-center">
            <div className="text-slate-400 text-xs font-semibold">전체 좌석</div>
            <div className="text-xl font-black text-white mt-0.5">{totalDesks}석</div>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 text-center">
            <div className="text-emerald-400 text-xs font-semibold">응모 완료</div>
            <div className="text-xl font-black text-emerald-400 mt-0.5">{claimedCount}명</div>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 text-center">
            <div className="text-amber-400 text-xs font-semibold">남은 빈 자리</div>
            <div className="text-xl font-black text-amber-300 mt-0.5">{remainingDesks}석</div>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 text-center">
            <div className="text-sky-400 text-xs font-semibold">참여율</div>
            <div className="text-xl font-black text-sky-300 mt-0.5">
              {totalDesks > 0 ? Math.round((claimedCount / totalDesks) * 100) : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Student Identification Bar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold text-lg">
              👤
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                1단계: 본인 확인
              </label>
              <h3 className="text-lg font-bold text-slate-900">누구의 이름으로 응모할까요?</h3>
            </div>
          </div>

          {/* Student Selector Dropdown */}
          <div className="w-full md:w-72">
            <select
              value={selectedStudentId}
              onChange={(e) => handleSelectStudent(e.target.value)}
              className="w-full p-3 bg-slate-50 border-2 border-indigo-300 focus:border-indigo-600 rounded-xl font-bold text-slate-900 text-base shadow-2xs focus:outline-none transition"
            >
              <option value="">-- 내 이름 선택하기 --</option>
              {activeStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.gender === 'male' ? '(남)' : s.gender === 'female' ? '(여)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Student Status Display */}
        {selectedStudentId ? (
          <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200 gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-extrabold flex items-center justify-center text-base">
                {currentStudent?.name.substring(0, 1)}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-black text-slate-900 text-lg">{currentStudent?.name} 학생</span>
                  <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold">
                    선택됨
                  </span>
                </div>

                {currentStudentDesk ? (
                  <div className="text-sm font-bold text-emerald-600 flex items-center space-x-1 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>현재 [{currentStudentDesk.label}번 자리]에 티켓팅 응모 완료!</span>
                  </div>
                ) : (
                  <div className="text-sm font-medium text-amber-600 flex items-center space-x-1 mt-0.5">
                    <AlertCircle className="w-4 h-4" />
                    <span>아직 응모한 자리가 없습니다. 아래 배치도에서 초록색 빈 자리를 선택하세요!</span>
                  </div>
                )}
              </div>
            </div>

            {currentStudentDesk && (
              <button
                onClick={handleCancelClaim}
                disabled={!ticketingState.isOpen}
                className="w-full sm:w-auto px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1"
              >
                <XCircle className="w-4 h-4" />
                <span>응모 취소하기</span>
              </button>
            )}
          </div>
        ) : (
          <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-amber-900 text-sm font-semibold flex items-center space-x-2">
            <HelpCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>상단 드롭다운에서 먼저 본인 이름을 선택해야 자리를 누르고 티켓팅할 수 있습니다!</span>
          </div>
        )}
      </div>

      {/* Interactive Classroom Seat Selection Canvas */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
            <h3 className="text-lg font-bold text-slate-900">2단계: 자리 선택 및 티켓팅</h3>
          </div>

          <div className="flex items-center space-x-4 text-xs font-semibold text-slate-600">
            <span className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded bg-emerald-100 border-2 border-emerald-500 inline-block"></span>
              <span>응모 가능 (빈자리)</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded bg-amber-100 border-2 border-amber-500 inline-block"></span>
              <span>내 자리</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded bg-slate-200 border-2 border-slate-400 inline-block"></span>
              <span>응모 완료 (선점됨)</span>
            </span>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="relative w-full overflow-x-auto bg-slate-900/5 p-4 rounded-3xl border border-slate-200 shadow-inner select-none">
          <div
            className="relative bg-white rounded-2xl border border-slate-300 shadow-md p-6 mx-auto min-w-[760px]"
            style={{
              minHeight: `${Math.max(520, maxDeskY + 120)}px`,
              width: `${Math.max(860, maxDeskX + 120)}px`,
            }}
          >
            {/* Blackboard */}
            <div className="w-full flex flex-col items-center mb-8 relative">
              <div className="w-11/12 max-w-2xl bg-slate-800 text-slate-100 rounded-xl py-3 px-6 shadow-md border-4 border-amber-900 flex items-center justify-between relative overflow-hidden">
                <div className="flex items-center space-x-2 font-bold text-sm tracking-wider text-emerald-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>[앞] 칠 판 (BLACKBOARD)</span>
                </div>
                <div className="text-xs text-slate-300 font-mono">교탁 및 화면 방향</div>
              </div>
            </div>

            {/* Left Window */}
            <div className="absolute left-2 top-24 bottom-16 w-8 bg-sky-50/80 border-r-2 border-l border-sky-300/80 rounded-r-xl flex flex-col items-center justify-center space-y-8 text-sky-700 shadow-2xs pointer-events-none">
              <div className="writing-mode-vertical font-bold text-xs tracking-widest text-sky-800">
                [왼쪽] 창 문
              </div>
            </div>

            {/* Right Hallway */}
            <div className="absolute right-2 top-24 bottom-16 w-8 bg-amber-50/80 border-l-2 border-r border-amber-300/80 rounded-l-xl flex flex-col items-center justify-center space-y-8 text-amber-800 shadow-2xs pointer-events-none">
              <div className="writing-mode-vertical font-bold text-xs tracking-widest text-amber-900">
                [오른쪽] 복 도
              </div>
            </div>

            {/* Desks */}
            <div className="relative my-4 ml-8 mr-8" style={{ minHeight: `${maxDeskY + 40}px` }}>
              {desks.map((desk) => {
                const claim = ticketingState.claims[desk.id];
                const isClaimedByMe = claim && claim.studentId === selectedStudentId;
                const isClaimedByOther = claim && claim.studentId !== selectedStudentId;
                const isVacant = !claim;

                return (
                  <div
                    key={desk.id}
                    onClick={() => {
                      if (!ticketingState.isOpen) {
                        alert('현재 티켓팅이 닫혀 있습니다.');
                        return;
                      }
                      if (!selectedStudentId) {
                        alert('먼저 위에서 본인 이름을 선택해주세요!');
                        return;
                      }
                      if (desk.isLocked) {
                        alert('이 자리는 교사에 의해 지정 고정된 자리입니다.');
                        return;
                      }
                      if (isClaimedByOther) {
                        alert(`이미 ${claim.studentName} 학생이 응모한 자리입니다.`);
                        return;
                      }
                      setConfirmDesk(desk);
                    }}
                    className={`absolute rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between p-2.5 shadow-sm ${
                      desk.isLocked
                        ? 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed'
                        : isClaimedByMe
                        ? 'bg-gradient-to-b from-amber-50 to-amber-100 border-amber-500 shadow-lg ring-4 ring-amber-300/80 cursor-pointer scale-105 z-20'
                        : isClaimedByOther
                        ? 'bg-slate-100/90 border-slate-300 text-slate-600 cursor-not-allowed opacity-90'
                        : ticketingState.isOpen
                        ? 'bg-gradient-to-b from-emerald-50 to-emerald-100/80 border-emerald-400 hover:border-emerald-600 hover:scale-105 hover:shadow-xl cursor-pointer ring-2 ring-emerald-200/50 active:scale-95 z-10'
                        : 'bg-slate-50 border-slate-200 cursor-not-allowed'
                    }`}
                    style={{
                      left: `${desk.x}px`,
                      top: `${desk.y}px`,
                      width: `${desk.width || DESK_WIDTH}px`,
                      height: `${desk.height || DESK_HEIGHT}px`,
                    }}
                  >
                    {/* Desk Label */}
                    <div className="flex items-center justify-between text-[11px] font-bold pb-1 border-b border-slate-200/60">
                      <span className="bg-slate-200/80 text-slate-800 px-2 py-0.5 rounded font-mono">
                        {desk.label}번
                      </span>
                      {desk.sectionId && (
                        <span className="text-[10px] text-indigo-600 font-bold">
                          {desk.sectionId}분단
                        </span>
                      )}
                    </div>

                    {/* Desk Status Text */}
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-1">
                      {isClaimedByMe ? (
                        <div>
                          <span className="inline-block bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded mb-0.5">
                            ⭐ 내 자리
                          </span>
                          <div className="font-black text-slate-900 text-base leading-tight truncate">
                            {claim.studentName}
                          </div>
                        </div>
                      ) : isClaimedByOther ? (
                        <div>
                          <div className="font-extrabold text-slate-700 text-sm leading-tight truncate">
                            {claim.studentName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                            응모 완료
                          </div>
                        </div>
                      ) : desk.isLocked ? (
                        <div className="text-slate-400 text-xs font-semibold">🔒 고정석</div>
                      ) : (
                        <div className="text-emerald-700 font-black text-sm flex items-center space-x-1 animate-pulse">
                          <span>🎟️ 응모 가능</span>
                        </div>
                      )}
                    </div>

                    {/* Action Hint */}
                    {isVacant && !desk.isLocked && ticketingState.isOpen && (
                      <div className="text-[10px] text-center font-bold text-emerald-800 bg-emerald-200/70 rounded py-0.5">
                        클릭하여 응모
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Live Applicants Activity Log */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <span>📋 실시간 응모 기록</span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
              {claimedCount}건 완료
            </span>
          </h3>

          <button
            onClick={handleRefreshClick}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center space-x-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>새로고침</span>
          </button>
        </div>

        {claimedCount === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            아직 응모한 학생이 없습니다. 가장 먼저 자리를 신청해보세요!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1">
            {(Object.entries(ticketingState.claims) as [string, TicketingClaim][]).map(([deskId, claim]) => {
              const desk = desks.find((d) => d.id === deskId);
              return (
                <div
                  key={deskId}
                  className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="font-bold text-slate-900">{claim.studentName} 학생</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {desk?.label}번 자리
                    </span>
                    <span className="text-[10px] text-slate-400">{claim.claimedAt}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmDesk && currentStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-6 animate-in fade-in zoom-in duration-150">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center text-3xl font-extrabold shadow-inner">
                🎟️
              </div>
              <h3 className="text-2xl font-black text-slate-900">자리 응모 확정</h3>
              <p className="text-sm text-slate-600">
                선택하신 자리가 맞는지 확인한 후 확정 버튼을 눌러주세요.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">신청 학생:</span>
                <span className="font-extrabold text-slate-900 text-base">
                  {currentStudent.name} 학생
                </span>
              </div>

              <div className="flex justify-between items-center text-sm border-t border-slate-200/80 pt-2">
                <span className="text-slate-500 font-medium">선택 자리:</span>
                <span className="font-black text-indigo-600 text-lg bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-200">
                  {confirmDesk.label}번 자리 ({confirmDesk.sectionId || 1}분단)
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setConfirmDesk(null)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 transition text-sm"
              >
                취소
              </button>

              <button
                onClick={handleConfirmClaim}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 font-black text-white shadow-lg shadow-emerald-500/30 transition text-sm flex items-center justify-center space-x-1"
              >
                <Sparkles className="w-4 h-4" />
                <span>티켓팅 응모 확정!</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
