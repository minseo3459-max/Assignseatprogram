import React, { useState } from 'react';
import { Student, Desk, AssignmentMode, ShuffleAnimationSpeed, SystemMode, TicketingState } from '../types';
import { assignSeatsRandomly, generateShuffleTickAssignment, shuffleArray } from '../utils/classroom';
import { soundManager } from '../utils/sound';
import confetti from 'canvas-confetti';
import { Sparkles, RefreshCw, Shuffle, ArrowLeftRight, CheckCircle, Flame, Layers, Lock, AlertCircle, Ticket, Dices } from 'lucide-react';
import { TicketingControl } from './TicketingControl';

interface AssignmentControlProps {
  students: Student[];
  desks: Desk[];
  setDesks: React.Dispatch<React.SetStateAction<Desk[]>>;
  onGoToLayout: () => void;
  systemMode: SystemMode;
  setSystemMode: (mode: SystemMode) => void;
  ticketingState: TicketingState;
  setTicketingState: React.Dispatch<React.SetStateAction<TicketingState>>;
  onRefreshTicketing: () => void | Promise<void>;
  onOpenStudentView: () => void;
}

export const AssignmentControl: React.FC<AssignmentControlProps> = ({
  students,
  desks,
  setDesks,
  onGoToLayout,
  systemMode,
  setSystemMode,
  ticketingState,
  setTicketingState,
  onRefreshTicketing,
  onOpenStudentView,
}) => {
  const [mode, setMode] = useState<AssignmentMode>('random');
  const [speed, setSpeed] = useState<ShuffleAnimationSpeed>('dramatic');
  const [isShuffling, setIsShuffling] = useState(false);
  const [assignedCount, setAssignedCount] = useState<number | null>(null);

  const activeStudents = students.filter((s) => !s.isAbsent);
  const isDeskShortage = activeStudents.length > desks.length;

  // Execute Random Seat Assignment
  const handleExecuteAssignment = async () => {
    if (activeStudents.length === 0) {
      alert('등록된 학생이 없습니다. 1단계에서 학생 명단을 입력해주세요.');
      return;
    }

    if (desks.length === 0) {
      alert('생성된 자리가 없습니다. 2단계에서 자리를 먼저 배치해주세요.');
      return;
    }

    setIsShuffling(true);

    const resultMap = assignSeatsRandomly(students, desks, mode);

    if (speed === 'instant') {
      soundManager.playFanfare();
      applyResult(resultMap);
      triggerConfetti();
      setIsShuffling(false);
    } else if (speed === 'fast') {
      let tickCount = 0;
      const totalTicks = 12;
      const interval = setInterval(() => {
        tickCount++;
        soundManager.playTick();
        const tempResult = generateShuffleTickAssignment(students, desks);
        applyResult(tempResult);

        if (tickCount >= totalTicks) {
          clearInterval(interval);
          applyResult(resultMap);
          soundManager.playFanfare();
          triggerConfetti();
          setIsShuffling(false);
        }
      }, 90);
    } else if (speed === 'dramatic') {
      let tickCount = 0;
      const totalTicks = 24;

      const runTick = () => {
        tickCount++;
        soundManager.playTick();
        const tempResult = generateShuffleTickAssignment(students, desks);
        applyResult(tempResult);

        if (tickCount < totalTicks) {
          const delay = 60 + Math.pow(tickCount, 1.8);
          setTimeout(runTick, delay);
        } else {
          applyResult(resultMap);
          soundManager.playFanfare();
          triggerConfetti();
          setIsShuffling(false);
        }
      };

      runTick();
    } else if (speed === 'sequential') {
      const unassignedDesks = desks.filter((d) => !d.isLocked);
      const deskIdsToFill = unassignedDesks.map((d) => d.id);
      const revealedMap = new Map<string, string | null>();

      desks.forEach((d) => {
        if (d.isLocked && d.assignedStudentId) {
          revealedMap.set(d.id, d.assignedStudentId);
        }
      });

      let idx = 0;
      const interval = setInterval(() => {
        if (idx < deskIdsToFill.length) {
          const deskId = deskIdsToFill[idx];
          const studentId = resultMap.get(deskId) ?? null;
          revealedMap.set(deskId, studentId);

          const remainingDeskIds = deskIdsToFill.slice(idx + 1);
          const usedStudentIds = new Set(
            Array.from(revealedMap.values()).filter(Boolean) as string[]
          );
          const remainingStudents: Student[] = activeStudents.filter((s) => !usedStudentIds.has(s.id));
          const shuffledRemaining = shuffleArray<Student>(remainingStudents);

          setDesks((prev) =>
            prev.map((d) => {
              if (revealedMap.has(d.id)) {
                return { ...d, assignedStudentId: revealedMap.get(d.id) ?? null };
              }
              const remIdx = remainingDeskIds.indexOf(d.id);
              if (remIdx !== -1 && remIdx < shuffledRemaining.length) {
                return { ...d, assignedStudentId: shuffledRemaining[remIdx].id };
              }
              return { ...d, assignedStudentId: null };
            })
          );

          soundManager.playPop();
          idx++;
        } else {
          clearInterval(interval);
          applyResult(resultMap);
          soundManager.playFanfare();
          triggerConfetti();
          setIsShuffling(false);
        }
      }, 150);
    }
  };

  const applyResult = (resultMap: Map<string, string | null>) => {
    setDesks((prev) =>
      prev.map((d) => ({
        ...d,
        assignedStudentId: resultMap.get(d.id) ?? null,
      }))
    );

    let count = 0;
    resultMap.forEach((studentId) => {
      if (studentId) count++;
    });
    setAssignedCount(count);
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  };

  const handleResetAssignments = () => {
    setDesks((prev) => prev.map((d) => ({ ...d, assignedStudentId: null })));
    setAssignedCount(0);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* System Mode Switcher (Random Assignment vs Ticketing) */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="text-xs text-indigo-400 font-bold uppercase tracking-wider mb-1">
            자리 배정 방식 선택
          </div>
          <h2 className="text-lg font-black text-white">
            {systemMode === 'random' ? '🎲 교사 랜덤 자동 배정' : '🎟️ 학생 실시간 자율 티켓팅'}
          </h2>
        </div>

        <div className="flex items-center bg-slate-800 p-1.5 rounded-xl border border-slate-700/80 w-full sm:w-auto">
          <button
            onClick={() => setSystemMode('random')}
            className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition ${
              systemMode === 'random'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Dices className="w-4 h-4" />
            <span>랜덤 배정</span>
          </button>

          <button
            onClick={() => setSystemMode('ticketing')}
            className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition ${
              systemMode === 'ticketing'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Ticket className="w-4 h-4 text-emerald-300" />
            <span>티켓팅 (선착순)</span>
          </button>
        </div>
      </div>

      {/* Render selected mode controls */}
      {systemMode === 'ticketing' ? (
        <TicketingControl
          students={students}
          desks={desks}
          setDesks={setDesks}
          ticketingState={ticketingState}
          setTicketingState={setTicketingState}
          onRefreshTicketing={onRefreshTicketing}
          onOpenStudentView={onOpenStudentView}
        />
      ) : (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          {/* Title */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-slate-800">3단계: 랜덤 자리 추첨 & 드래그 수정</h2>
                <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-indigo-200">
                  배정 대상 {activeStudents.length}명 / 자리 {desks.length}석
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                원하는 옵션을 선택하고 랜덤 자리 배정을 실시하세요. 배정 완료 후 드래그로 손쉽게 자리를 맞바꿀 수 있습니다.
              </p>
            </div>

            {isDeskShortage && (
              <button
                onClick={onGoToLayout}
                className="flex items-center space-x-1 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold hover:bg-amber-100"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>자리 추가하러 가기</span>
              </button>
            )}
          </div>

          {/* Control Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Assignment Rule Mode */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <label className="block text-xs font-bold text-slate-700 mb-2">1. 자리 배정 규칙</label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2.5 text-sm text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="assignMode"
                    checked={mode === 'random'}
                    onChange={() => setMode('random')}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-medium">🔀 완전 랜덤 배정</span>
                </label>

                <label className="flex items-center space-x-2.5 text-sm text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="assignMode"
                    checked={mode === 'gender_alternate'}
                    onChange={() => setMode('gender_alternate')}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-medium">🚻 남여 교대 배정 (지그재그)</span>
                </label>
              </div>
            </div>

            {/* Animation Speed */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <label className="block text-xs font-bold text-slate-700 mb-2">2. 연출 애니메이션</label>
              <select
                value={speed}
                onChange={(e) => setSpeed(e.target.value as ShuffleAnimationSpeed)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="dramatic">🎰 긴장감 넘치는 추첨 (슬롯마신)</option>
                <option value="sequential">⏱️ 순차적 하나씩 공개</option>
                <option value="fast">⚡ 빠른 추첨</option>
                <option value="instant">🚀 즉시 배정</option>
              </select>
            </div>

            {/* Quick Action Button */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-col justify-between">
              <div className="text-xs text-slate-500 font-medium">
                💡 TIP: 자리를 고정하려면 자리 상단 🔒 아이콘을 클릭하세요.
              </div>

              <div className="flex items-center space-x-2 mt-2">
                <button
                  onClick={handleExecuteAssignment}
                  disabled={isShuffling}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-extrabold text-white shadow-lg transition transform active:scale-95 ${
                    isShuffling
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 hover:from-indigo-500 hover:to-sky-400 shadow-indigo-500/25 hover:-translate-y-0.5'
                  }`}
                >
                  <Sparkles className={`w-5 h-5 ${isShuffling ? 'animate-spin' : 'animate-bounce'}`} />
                  <span className="text-base">{isShuffling ? '추첨 진행 중...' : '🎲 랜덤 자리 배정 시작!'}</span>
                </button>

                <button
                  onClick={handleResetAssignments}
                  title="자리 배정 초기화"
                  className="p-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-600 rounded-xl transition"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Guide Banner for Drag and Drop Swapping */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3 text-indigo-900 text-xs sm:text-sm flex items-center space-x-3">
            <ArrowLeftRight className="w-5 h-5 text-indigo-600 shrink-0" />
            <div>
              <span className="font-bold">자리 수정 팁: </span>
              <span>
                배정이 끝난 후 학생 자리 박스를 **마우스로 다른 자리로 드래그 앤 드롭**하거나, **원하는 두 자리를 순서대로 클릭**하면 두 학생의 자리가 즉시 바뀝니다!
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
