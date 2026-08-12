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
  ArrowRight,
  Lock,
  KeyRound,
  UserX,
  ArrowLeftRight,
} from 'lucide-react';
import { DESK_WIDTH, DESK_HEIGHT } from '../utils/classroom';

interface StudentTicketingViewProps {
  students: Student[];
  desks: Desk[];
  setDesks: React.Dispatch<React.SetStateAction<Desk[]>>;
  config: ClassroomConfig;
  ticketingState: TicketingState;
  onUpdateTicketingState: (newState: TicketingState) => void;
  onRefreshData: () => void | Promise<void>;
  onSwitchToTeacherView?: () => void;
  isStudentOnlyMode?: boolean;
  classId?: string;
}

const formatDeskLabel = (label?: string) => {
  if (!label) return '자리';
  return label.endsWith('번') ? label : `${label}번`;
};

export const StudentTicketingView: React.FC<StudentTicketingViewProps> = ({
  students,
  desks,
  setDesks,
  config,
  ticketingState,
  onUpdateTicketingState,
  onRefreshData,
  onSwitchToTeacherView,
  isStudentOnlyMode,
  classId,
}) => {
  // Selected Student ID
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    try {
      return sessionStorage.getItem('student_ticketing_my_id') || '';
    } catch {
      return '';
    }
  });

  // Modal states for seat claim, swap, and cancellation
  const [confirmDesk, setConfirmDesk] = useState<Desk | null>(null);
  const [swapConfirmDesk, setSwapConfirmDesk] = useState<Desk | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // PIN Verification Modal states
  const [pinModalStudent, setPinModalStudent] = useState<Student | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

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

  // Handle student name selection with PIN verification check
  const handleSelectStudent = (id: string) => {
    if (!id) {
      setSelectedStudentId('');
      try {
        sessionStorage.removeItem('student_ticketing_my_id');
      } catch {
        // ignore
      }
      return;
    }

    const target = activeStudents.find((s) => s.id === id);
    if (!target) return;

    // Check if already verified on this device
    const isVerified = localStorage.getItem(`student_pin_verified_${id}`) === 'true';
    if (isVerified) {
      setSelectedStudentId(id);
      try {
        sessionStorage.setItem('student_ticketing_my_id', id);
      } catch {
        // ignore
      }
      showToast(`🔑 [${target.name}] 학생 본인 확인이 완료되었습니다.`);
    } else {
      // Prompt PIN Modal
      setPinModalStudent(target);
      setPinInput('');
      setPinError(null);
    }
  };

  // Submit PIN for student authentication
  const handleVerifyPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinModalStudent) return;

    const expectedPin = pinModalStudent.pin || '1234';
    if (pinInput.trim() === expectedPin) {
      localStorage.setItem(`student_pin_verified_${pinModalStudent.id}`, 'true');
      setSelectedStudentId(pinModalStudent.id);
      try {
        sessionStorage.setItem('student_ticketing_my_id', pinModalStudent.id);
      } catch {
        // ignore
      }
      soundManager.playPop();
      showToast(`✅ [${pinModalStudent.name}] 학생 본인 인증 성공!`);
      setPinModalStudent(null);
      setPinInput('');
      setPinError(null);
    } else {
      soundManager.playTick();
      setPinError('⚠️ 비밀번호가 일치하지 않습니다. (선생님께 받은 4자리 PIN을 입력하세요)');
    }
  };

  // Switch account / re-authenticate
  const handleSwitchAccount = () => {
    setSelectedStudentId('');
    try {
      sessionStorage.removeItem('student_ticketing_my_id');
    } catch {
      // ignore
    }
    showToast('이름 선택 화면으로 이동합니다.');
  };

  // Toast feedback helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Handle Refresh Button
  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    soundManager.playPop();
    await onRefreshData();
    showToast('🔄 실시간 응모 현황을 불러왔습니다!');
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  // Execute Seat Claiming (First-time claim)
  const handleConfirmClaim = async () => {
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

    // Attempt claim via Server API for real-time atomic claim
    if (classId) {
      try {
        const res = await fetch(`/api/classrooms/${classId}/claim`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: currentStudent.id,
            studentName: currentStudent.name,
            deskId: confirmDesk.id,
            action: 'claim',
            oldDeskId: currentStudentDeskId || undefined,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          onUpdateTicketingState(data.ticketingState);
          if (data.desks) setDesks(data.desks);

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

          showToast(`🎉 [${formatDeskLabel(confirmDesk.label)}] 티켓팅 성공!`);
          setConfirmDesk(null);
          return;
        } else {
          alert(data.error || '⚠️ 방금 다른 학생이 이 자리를 선택했습니다! 다른 빈 자리를 선택해 주세요.');
          if (data.ticketingState) onUpdateTicketingState(data.ticketingState);
          setConfirmDesk(null);
          return;
        }
      } catch {
        // Fallback to local
      }
    }

    // Fallback local update
    const newClaims = { ...ticketingState.claims };
    if (currentStudentDeskId) {
      delete newClaims[currentStudentDeskId];
    }

    const nowStr = new Date().toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

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

    onUpdateTicketingState(updatedState);

    setDesks((prev) =>
      prev.map((d) => {
        if (d.id === confirmDesk.id) return { ...d, assignedStudentId: currentStudent.id };
        if (d.id === currentStudentDeskId) return { ...d, assignedStudentId: null };
        return d;
      })
    );

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

    showToast(`🎉 [${formatDeskLabel(confirmDesk.label)}] 티켓팅 성공!`);
    setConfirmDesk(null);
  };

  // Execute Seat Swap (Changing from Desk A to Desk B)
  const handleConfirmSwap = async () => {
    if (!selectedStudentId || !currentStudent || !swapConfirmDesk) return;

    if (!ticketingState.isOpen) {
      alert('현재 티켓팅이 마감되어 있습니다.');
      setSwapConfirmDesk(null);
      return;
    }

    if (classId) {
      try {
        const res = await fetch(`/api/classrooms/${classId}/claim`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: currentStudent.id,
            studentName: currentStudent.name,
            deskId: swapConfirmDesk.id,
            action: 'swap',
            oldDeskId: currentStudentDeskId || undefined,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          onUpdateTicketingState(data.ticketingState);
          if (data.desks) setDesks(data.desks);

          soundManager.playFanfare();
          try {
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
            });
          } catch {
            // ignore
          }

          showToast(`🎉 [${formatDeskLabel(swapConfirmDesk.label)}]로 성공적으로 변경되었습니다!`);
          setSwapConfirmDesk(null);
          return;
        } else {
          alert(data.error || '⚠️ 해당 자리는 이미 다른 학생이 선점했습니다.');
          if (data.ticketingState) onUpdateTicketingState(data.ticketingState);
          setSwapConfirmDesk(null);
          return;
        }
      } catch {
        // Fallback
      }
    }

    const newClaims = { ...ticketingState.claims };
    if (currentStudentDeskId) {
      delete newClaims[currentStudentDeskId];
    }

    const nowStr = new Date().toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    newClaims[swapConfirmDesk.id] = {
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      claimedAt: nowStr,
    };

    const updatedState: TicketingState = {
      ...ticketingState,
      claims: newClaims,
      lastUpdated: new Date().toISOString(),
    };

    onUpdateTicketingState(updatedState);

    setDesks((prev) =>
      prev.map((d) => {
        if (d.id === swapConfirmDesk.id) return { ...d, assignedStudentId: currentStudent.id };
        if (d.id === currentStudentDeskId) return { ...d, assignedStudentId: null };
        return d;
      })
    );

    soundManager.playFanfare();
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }

    showToast(`🎉 [${formatDeskLabel(swapConfirmDesk.label)}]로 성공적으로 변경되었습니다!`);
    setSwapConfirmDesk(null);
  };

  // Execute Claim Cancellation
  const handleConfirmCancel = async () => {
    if (!currentStudentDeskId || !currentStudent) {
      setIsCancelModalOpen(false);
      return;
    }

    if (classId) {
      try {
        const res = await fetch(`/api/classrooms/${classId}/claim`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: currentStudent.id,
            studentName: currentStudent.name,
            deskId: currentStudentDeskId,
            action: 'cancel',
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          onUpdateTicketingState(data.ticketingState);
          if (data.desks) setDesks(data.desks);

          soundManager.playPop();
          showToast('자리 응모가 성공적으로 취소되었습니다.');
          setIsCancelModalOpen(false);
          return;
        }
      } catch {
        // Fallback
      }
    }

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
    showToast('자리 응모가 성공적으로 취소되었습니다.');
    setIsCancelModalOpen(false);
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
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 font-extrabold text-xs rounded-full border border-emerald-500/40 flex items-center space-x-1">
                <Ticket className="w-3.5 h-3.5" />
                <span>학생 실시간 응모 전용 (로그인 불필요)</span>
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
              별도의 계정 회원가입 없이 내 이름을 선택하고 원하는 빈 자리를 눌러 신청하세요!
            </p>
          </div>

          {/* Controls: Realtime Update Button */}
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
              <span>실시간 현황 업데이트</span>
            </button>

            {!isStudentOnlyMode && onSwitchToTeacherView && (
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
              <div className="flex items-center space-x-2">
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  1단계: 본인 확인 (부정 응모 방지 PIN 지원)
                </label>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300 flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3 text-amber-600" />
                  <span>타인 도용 방지</span>
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">누구의 이름으로 응모할까요?</h3>
            </div>
          </div>

          {/* Student Selector Dropdown */}
          <div className="w-full md:w-80">
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
                  <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>PIN 인증 완료</span>
                  </span>
                </div>

                {currentStudentDesk ? (
                  <div className="text-sm font-bold text-emerald-600 flex items-center space-x-1 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>현재 [{formatDeskLabel(currentStudentDesk.label)}]에 티켓팅 응모 완료!</span>
                  </div>
                ) : (
                  <div className="text-sm font-medium text-amber-600 flex items-center space-x-1 mt-0.5">
                    <AlertCircle className="w-4 h-4" />
                    <span>아직 응모한 자리가 없습니다. 아래 배치도에서 초록색 빈 자리를 선택하세요!</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              {currentStudentDesk && (
                <button
                  onClick={() => setIsCancelModalOpen(true)}
                  disabled={!ticketingState.isOpen}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1"
                >
                  <XCircle className="w-4 h-4" />
                  <span>응모 취소하기</span>
                </button>
              )}

              <button
                onClick={handleSwitchAccount}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition"
                title="다른 계정/이름 선택"
              >
                이름 변경
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-amber-900 text-sm font-semibold flex items-center space-x-2">
            <HelpCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              상단 드롭다운에서 본인 이름을 선택한 후, 4자리 비밀번호(PIN)를 입력하면 응모할 수 있습니다. (기본 PIN: 1234)
            </span>
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
              <div className="w-11/12 max-w-2xl bg-slate-800 text-slate-100 rounded-xl py-3 px-6 shadow-md border-4 border-amber-900 flex items-center justify-center relative overflow-hidden">
                <div className="flex items-center space-x-2 font-bold text-sm sm:text-base tracking-wider text-emerald-300 text-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>칠 판 (BLACKBOARD)</span>
                </div>
              </div>
            </div>

            {/* Left Window */}
            <div className="absolute left-2 top-24 bottom-16 w-12 bg-sky-50/80 border-r-2 border-l border-sky-300/80 rounded-r-xl flex flex-col items-center justify-between py-6 text-sky-700 shadow-2xs pointer-events-none">
              <div className="w-6 h-8 bg-sky-200/60 rounded border border-sky-300 flex flex-col justify-around p-0.5">
                <div className="w-full h-0.5 bg-sky-400"></div>
                <div className="w-full h-0.5 bg-sky-400"></div>
              </div>

              <div className="-rotate-90 whitespace-nowrap font-extrabold text-xs text-sky-900 tracking-wider bg-sky-100/90 px-2.5 py-1 rounded-full border border-sky-300 shadow-2xs">
                🪟 [왼쪽] 창문
              </div>

              <div className="w-6 h-8 bg-sky-200/60 rounded border border-sky-300 flex flex-col justify-around p-0.5">
                <div className="w-full h-0.5 bg-sky-400"></div>
                <div className="w-full h-0.5 bg-sky-400"></div>
              </div>
            </div>

            {/* Right Hallway & Doors */}
            <div className="absolute right-2 top-24 bottom-16 w-12 bg-amber-50/80 border-l-2 border-r border-amber-300/80 rounded-l-xl flex flex-col items-center justify-between py-4 text-amber-800 shadow-2xs pointer-events-none">
              {/* 맨 앞: 앞문 */}
              <div className="w-9 py-1 bg-amber-200/90 border-2 border-amber-500 rounded-lg text-amber-950 font-black text-[11px] text-center shadow-2xs">
                앞문
              </div>

              {/* 중앙: 오른쪽 복도 */}
              <div className="-rotate-90 whitespace-nowrap font-extrabold text-xs text-amber-900 tracking-wider bg-amber-100/90 px-2.5 py-1 rounded-full border border-amber-300 shadow-2xs">
                🚪 [오른쪽] 복도
              </div>

              {/* 맨 뒤: 뒷문 */}
              <div className="w-9 py-1 bg-amber-200/90 border-2 border-amber-500 rounded-lg text-amber-950 font-black text-[11px] text-center shadow-2xs">
                뒷문
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
                        alert('먼저 상단 드롭다운에서 본인 이름을 선택해주세요!');
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
                      if (isClaimedByMe) {
                        // Clicking own seat opens cancel dialog
                        setIsCancelModalOpen(true);
                        return;
                      }
                      if (currentStudentDesk) {
                        // Already holds a seat, clicking another vacant seat -> opens swap confirm modal
                        setSwapConfirmDesk(desk);
                        return;
                      }
                      // Holds no seat, clicking vacant seat -> opens claim confirm modal
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
                        {formatDeskLabel(desk.label)}
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
                            ⭐ 내 자리 (클릭시 취소)
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
                        {currentStudentDesk ? '이 자리로 변경' : '클릭하여 응모'}
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
                      {formatDeskLabel(desk?.label)}
                    </span>
                    <span className="text-[10px] text-slate-400">{claim.claimedAt}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 1. PIN Verification Modal */}
      {pinModalStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 mx-auto flex items-center justify-center text-2xl font-black">
                🔒
              </div>
              <h3 className="text-xl font-black text-slate-900">학생 본인 확인 (PIN 인증)</h3>
              <p className="text-xs text-slate-600">
                <span className="font-bold text-indigo-600">[{pinModalStudent.name}]</span> 학생의 4자리 비밀번호(PIN)를 입력하세요.
              </p>
            </div>

            <form onSubmit={handleVerifyPinSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  maxLength={4}
                  autoFocus
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(null);
                  }}
                  placeholder="비밀번호 4자리 (예: 1234)"
                  className="w-full text-center tracking-widest text-2xl font-black p-3 bg-slate-50 border-2 border-indigo-300 focus:border-indigo-600 rounded-2xl focus:outline-none transition font-mono"
                />
                <p className="text-[11px] text-slate-400 text-center mt-1">
                  * 초기 기본 비밀번호는 <span className="font-mono font-bold text-indigo-600">1234</span> 입니다.
                </p>
              </div>

              {pinError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl text-center">
                  {pinError}
                </div>
              )}

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPinModalStudent(null);
                    setSelectedStudentId('');
                  }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-md shadow-indigo-500/20"
                >
                  본인 인증 및 선택
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. New Seat Confirmation Modal */}
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
                  {formatDeskLabel(confirmDesk.label)} ({confirmDesk.sectionId || 1}분단)
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

      {/* 3. Seat Swap Confirmation Modal */}
      {swapConfirmDesk && currentStudent && currentStudentDesk && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-6 animate-in fade-in zoom-in duration-150">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center text-3xl font-extrabold shadow-inner">
                🔄
              </div>
              <h3 className="text-2xl font-black text-slate-900">자리 변경 확인</h3>
              <p className="text-sm text-slate-600">
                기존 응모 자리를 취소하고 새 자리로 변경하시겠습니까?
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">기존 자리:</span>
                <span className="font-extrabold text-slate-500 line-through">
                  {formatDeskLabel(currentStudentDesk.label)}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm border-t border-slate-200/80 pt-2">
                <span className="text-slate-500 font-medium">변경할 자리:</span>
                <span className="font-black text-emerald-600 text-lg bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                  {formatDeskLabel(swapConfirmDesk.label)} ({swapConfirmDesk.sectionId || 1}분단)
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSwapConfirmDesk(null)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 transition text-sm"
              >
                취소
              </button>

              <button
                onClick={handleConfirmSwap}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 font-black text-white shadow-lg shadow-emerald-500/30 transition text-sm flex items-center justify-center space-x-1"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>자리 변경 확정!</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Seat Cancellation Modal */}
      {isCancelModalOpen && currentStudentDesk && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-6 animate-in fade-in zoom-in duration-150">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center text-3xl font-extrabold shadow-inner">
                ❌
              </div>
              <h3 className="text-2xl font-black text-slate-900">자리 응모 취소</h3>
              <p className="text-sm text-slate-600">
                현재 선택한 자리 응모를 정말 취소하시겠습니까?
              </p>
            </div>

            <div className="bg-rose-50 rounded-2xl p-4 border border-rose-200 text-center">
              <span className="text-xs text-rose-600 font-bold block">취소 대상 자리:</span>
              <span className="font-black text-rose-700 text-xl block mt-1">
                {currentStudentDesk.label}번 자리
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 transition text-sm"
              >
                유지하기
              </button>

              <button
                onClick={handleConfirmCancel}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 font-black text-white shadow-lg shadow-rose-600/30 transition text-sm flex items-center justify-center space-x-1"
              >
                <XCircle className="w-4 h-4" />
                <span>네, 응모 취소하기</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
