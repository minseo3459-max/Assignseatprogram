import React, { useState, useRef, useEffect } from 'react';
import { Desk, Student, ClassroomConfig, TicketingState } from '../types';
import { DESK_WIDTH, DESK_HEIGHT } from '../utils/classroom';
import { Lock, Unlock, Trash2, GripVertical, User, ArrowLeftRight, Monitor, Eye, ShieldCheck, Ticket } from 'lucide-react';

interface ClassroomCanvasProps {
  desks: Desk[];
  setDesks: React.Dispatch<React.SetStateAction<Desk[]>>;
  students: Student[];
  config: ClassroomConfig;
  mode: 'layout' | 'assignment';
  onSwapDesks?: (deskId1: string, deskId2: string) => void;
  canvasRef?: React.RefObject<HTMLDivElement | null>;
  isAdminMode?: boolean;
  onOpenAdminPanel?: () => void;
  ticketingState?: TicketingState;
}

export const ClassroomCanvas: React.FC<ClassroomCanvasProps> = ({
  desks,
  setDesks,
  students,
  config,
  mode,
  onSwapDesks,
  canvasRef: externalCanvasRef,
  isAdminMode,
  onOpenAdminPanel,
  ticketingState,
}) => {
  const localCanvasRef = useRef<HTMLDivElement>(null);
  const canvasRef = externalCanvasRef || localCanvasRef;

  // Drag state for moving desks in Layout Mode or swapping in Assignment Mode
  const [draggingDeskId, setDraggingDeskId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragOverDeskId, setDragOverDeskId] = useState<string | null>(null);
  const [selectedDeskForSwap, setSelectedDeskForSwap] = useState<string | null>(null);

  // Student map for quick lookup
  const studentMap = new Map<string, Student>();
  students.forEach((s) => studentMap.set(s.id, s));

  // Compute minimum canvas height based on desk positions
  const maxDeskY = desks.reduce((max, d) => Math.max(max, d.y + DESK_HEIGHT), 400);
  const maxDeskX = desks.reduce((max, d) => Math.max(max, d.x + DESK_WIDTH), 700);

  // Mouse Drag handlers for desk movement in Layout Mode
  const handleMouseDown = (e: React.MouseEvent, desk: Desk) => {
    if (e.button !== 0) return; // Only left click
    if ((e.target as HTMLElement).closest('button')) return; // Ignore button clicks inside desk

    setDraggingDeskId(desk.id);
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (canvasRect) {
      setDragOffset({
        x: e.clientX - canvasRect.left - desk.x,
        y: e.clientY - canvasRect.top - desk.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingDeskId) return;

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    let newX = e.clientX - canvasRect.left - dragOffset.x;
    let newY = e.clientY - canvasRect.top - dragOffset.y;

    // Boundaries check
    newX = Math.max(20, Math.min(newX, canvasRect.width - DESK_WIDTH - 20));
    newY = Math.max(20, Math.min(newY, canvasRect.height - DESK_HEIGHT - 20));

    setDesks((prev) =>
      prev.map((d) => (d.id === draggingDeskId ? { ...d, x: newX, y: newY } : d))
    );
  };

  const handleMouseUp = () => {
    setDraggingDeskId(null);
  };

  // Drag and Drop Student Swap Handlers (HTML5 DnD for post-assignment)
  const handleDragStartStudent = (e: React.DragEvent, deskId: string) => {
    e.dataTransfer.setData('text/plain', deskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverDesk = (e: React.DragEvent, deskId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverDeskId !== deskId) {
      setDragOverDeskId(deskId);
    }
  };

  const handleDragLeaveDesk = () => {
    setDragOverDeskId(null);
  };

  const handleDropStudent = (e: React.DragEvent, targetDeskId: string) => {
    e.preventDefault();
    setDragOverDeskId(null);
    const sourceDeskId = e.dataTransfer.getData('text/plain');

    if (sourceDeskId && sourceDeskId !== targetDeskId && onSwapDesks) {
      onSwapDesks(sourceDeskId, targetDeskId);
    }
  };

  // Toggle desk lock
  const handleToggleLock = (deskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDesks((prev) =>
      prev.map((d) => (d.id === deskId ? { ...d, isLocked: !d.isLocked } : d))
    );
  };

  // Delete desk
  const handleDeleteDesk = (deskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDesks((prev) => prev.filter((d) => d.id !== deskId));
  };

  // Click to select desk for swap
  const handleDeskClick = (deskId: string) => {
    if (mode !== 'assignment') return;

    if (!selectedDeskForSwap) {
      setSelectedDeskForSwap(deskId);
    } else if (selectedDeskForSwap === deskId) {
      setSelectedDeskForSwap(null);
    } else {
      if (onSwapDesks) {
        onSwapDesks(selectedDeskForSwap, deskId);
      }
      setSelectedDeskForSwap(null);
    }
  };

  return (
    <div className="relative w-full overflow-x-auto bg-slate-900/5 p-4 rounded-3xl border border-slate-300/70 shadow-inner select-none">
      {/* Container wrapper for image export & layout rendering */}
      <div
        ref={canvasRef as React.RefObject<HTMLDivElement>}
        onMouseMove={mode === 'layout' ? handleMouseMove : undefined}
        onMouseUp={mode === 'layout' ? handleMouseUp : undefined}
        onMouseLeave={mode === 'layout' ? handleMouseUp : undefined}
        className="relative bg-white rounded-2xl border border-slate-300/80 shadow-md p-6 mx-auto min-w-[760px]"
        style={{
          minHeight: `${Math.max(520, maxDeskY + 120)}px`,
          width: `${Math.max(860, maxDeskX + 120)}px`,
        }}
      >
        {/* ================= 1. 맨 앞: 칠판 (Blackboard) & 교탁 ================= */}
        <div className="w-full flex flex-col items-center mb-8 relative">
          <div className="w-11/12 max-w-2xl bg-slate-800 text-slate-100 rounded-xl py-3 px-6 shadow-md border-4 border-amber-900 flex items-center justify-center relative overflow-hidden">
            {/* Blackboard chalk background texture overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none"></div>

            <div className="flex items-center space-x-2 font-bold text-sm sm:text-base tracking-wider text-emerald-300 text-center">
              <span>칠 판 (BLACKBOARD)</span>
            </div>
          </div>

          {/* Teacher Desk / TV Indicator */}
          <div className="mt-2 flex items-center space-x-3">
            <div className="bg-amber-100 border border-amber-300 text-amber-900 text-xs px-4 py-1 rounded-md font-semibold shadow-2xs flex items-center space-x-1">
              <Monitor className="w-3.5 h-3.5 text-amber-700" />
              <span>교 탁</span>
            </div>
          </div>
        </div>

        {/* ================= 2. 왼쪽: 창문 (Window) ================= */}
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

        {/* ================= 3. 오른쪽: 복도 (Hallway) & 앞문/뒷문 ================= */}
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

        {/* ================= 4. 뒤쪽: 사물함 ================= */}
        <div className="absolute bottom-2 left-16 right-16 h-6 border-t border-slate-200 bg-slate-100/80 rounded-t-lg flex items-center justify-center text-[11px] text-slate-500 font-medium">
          [뒤쪽] 사물함
        </div>

        {/* ================= Classroom Desks Canvas Area ================= */}
        <div className="relative my-4 ml-8 mr-8" style={{ minHeight: `${maxDeskY + 40}px` }}>
          {desks.map((desk) => {
            const claim = ticketingState?.claims ? ticketingState.claims[desk.id] : null;
            const assignedStudent = desk.assignedStudentId 
              ? studentMap.get(desk.assignedStudentId) 
              : claim 
              ? ({ id: claim.studentId, name: claim.studentName, gender: 'male', isAbsent: false, frontRowOnly: false } as Student)
              : null;
            const fixedStudentAdmin = isAdminMode ? students.find((s) => s.fixedDeskId === desk.id || s.fixedDeskId === desk.label) : null;
            const isSelectedForSwap = selectedDeskForSwap === desk.id;
            const isHoveredTarget = dragOverDeskId === desk.id;
            const isDraggingThis = draggingDeskId === desk.id;

            return (
              <div
                key={desk.id}
                onMouseDown={mode === 'layout' ? (e) => handleMouseDown(e, desk) : undefined}
                draggable={mode === 'assignment' && !!assignedStudent}
                onDragStart={mode === 'assignment' ? (e) => handleDragStartStudent(e, desk.id) : undefined}
                onDragOver={mode === 'assignment' ? (e) => handleDragOverDesk(e, desk.id) : undefined}
                onDragLeave={mode === 'assignment' ? handleDragLeaveDesk : undefined}
                onDrop={mode === 'assignment' ? (e) => handleDropStudent(e, desk.id) : undefined}
                onClick={() => handleDeskClick(desk.id)}
                className={`absolute transition-shadow duration-150 rounded-xl border-2 cursor-grab active:cursor-grabbing flex flex-col justify-between p-2 shadow-sm ${
                  isDraggingThis
                    ? 'opacity-80 scale-105 z-30 shadow-2xl ring-2 ring-indigo-500 bg-indigo-50'
                    : isSelectedForSwap
                    ? 'ring-4 ring-amber-400 bg-amber-50 border-amber-500 z-20 animate-pulse'
                    : isHoveredTarget
                    ? 'ring-4 ring-emerald-400 bg-emerald-50 border-emerald-500 z-20'
                    : desk.isLocked
                    ? 'bg-slate-100 border-slate-400'
                    : claim
                    ? 'bg-gradient-to-b from-emerald-50 to-emerald-100/90 border-emerald-500 ring-2 ring-emerald-300/50 shadow-md'
                    : assignedStudent
                    ? assignedStudent.gender === 'male'
                      ? 'bg-gradient-to-b from-blue-50/90 to-blue-100/90 border-blue-400 hover:border-blue-500'
                      : assignedStudent.gender === 'female'
                      ? 'bg-gradient-to-b from-rose-50/90 to-rose-100/90 border-rose-400 hover:border-rose-500'
                      : 'bg-gradient-to-b from-indigo-50/90 to-indigo-100/90 border-indigo-300 hover:border-indigo-400'
                    : 'bg-slate-50/90 border-slate-300 border-dashed hover:border-slate-400 hover:bg-slate-100'
                }`}
                style={{
                  left: `${desk.x}px`,
                  top: `${desk.y}px`,
                  width: `${desk.width || DESK_WIDTH}px`,
                  height: `${desk.height || DESK_HEIGHT}px`,
                }}
              >
                {/* Desk Header Bar */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold border-b border-slate-200/60 pb-1">
                  <div className="flex items-center space-x-1">
                    <span className="bg-slate-200/80 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                      {desk.label}
                    </span>
                    {desk.sectionId && config.layoutType !== 'free' && (
                      <span className="text-[9px] text-indigo-600 font-medium hidden sm:inline">
                        {desk.sectionId}{config.layoutType === 'group' ? '모둠' : '분단'}
                      </span>
                    )}
                  </div>

                  {/* Desk Controls */}
                  <div className="flex items-center space-x-0.5">

                    <button
                      onClick={(e) => handleToggleLock(desk.id, e)}
                      title={desk.isLocked ? '고정 해제' : '이 자리 고정하기 (랜덤 변경 방지)'}
                      className={`p-0.5 rounded transition ${
                        desk.isLocked ? 'text-amber-600 bg-amber-100' : 'text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      {desk.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    </button>

                    {mode === 'layout' && (
                      <button
                        onClick={(e) => handleDeleteDesk(desk.id, e)}
                        title="자리 삭제"
                        className="p-0.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-100 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Desk Center Area: Student Name */}
                <div className="flex-1 flex flex-col items-center justify-center text-center px-1 py-1">
                  {assignedStudent ? (
                    <div className="w-full">
                      <div className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight tracking-tight truncate">
                        {assignedStudent.name}
                      </div>

                      <div className="flex items-center justify-center space-x-1 mt-0.5 text-[10px]">
                        {claim && (
                          <span className="bg-emerald-600 text-white font-extrabold text-[9px] px-1 py-0.2 rounded">
                            🎟️ 응모
                          </span>
                        )}
                        {assignedStudent.gender === 'male' && <span className="text-blue-600 font-medium">남</span>}
                        {assignedStudent.gender === 'female' && <span className="text-rose-600 font-medium">여</span>}
                        {assignedStudent.frontRowOnly && <span className="text-amber-600 font-bold">★앞</span>}
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-xs font-medium italic flex items-center space-x-1">
                      <span>빈 자리</span>
                    </div>
                  )}
                </div>

                {/* Drag Handle Indicator in Layout Mode */}
                {mode === 'layout' && (
                  <div className="w-full flex justify-center text-slate-300">
                    <GripVertical className="w-3 h-3" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
