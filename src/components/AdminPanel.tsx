import React, { useState } from 'react';
import { Student, Desk } from '../types';
import { DESK_WIDTH, DESK_HEIGHT } from '../utils/classroom';
import { ShieldCheck, Trash2, X, Sparkles, Monitor, KeyRound } from 'lucide-react';
import { soundManager } from '../utils/sound';

interface AdminPanelProps {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  desks: Desk[];
  isOpen: boolean;
  onClose: () => void;
  onExitAdminMode: () => void;
  onOpenChangePasswordModal?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  students,
  setStudents,
  desks,
  isOpen,
  onClose,
  onExitAdminMode,
  onOpenChangePasswordModal,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeStudents = students.filter((s) => !s.isAbsent);

  // Map of fixedDeskId -> Student
  const fixedMap = new Map<string, Student>();
  students.forEach((s) => {
    if (s.fixedDeskId) {
      fixedMap.set(s.fixedDeskId, s);
    }
  });

  const fixedStudentsCount = students.filter((s) => s.fixedDeskId).length;

  // Max coordinates for canvas container sizing
  const maxDeskY = desks.reduce((max, d) => Math.max(max, d.y + (d.height || DESK_HEIGHT)), 400);
  const maxDeskX = desks.reduce((max, d) => Math.max(max, d.x + (d.width || DESK_WIDTH)), 700);

  // Set fixed desk for a student
  const handleAssignFixedDesk = (studentId: string, deskId: string | null) => {
    soundManager.playPop();
    setStudents((prev) =>
      prev.map((s) => {
        // If assigning a desk that was already fixed to another student, clear from that other student first
        if (deskId && s.fixedDeskId === deskId && s.id !== studentId) {
          return { ...s, fixedDeskId: null };
        }
        if (s.id === studentId) {
          return { ...s, fixedDeskId: deskId };
        }
        return s;
      })
    );
  };

  // Click on desk in visual map
  const handleDeskClickInVisualMap = (desk: Desk) => {
    const fixedStudentOnDesk = fixedMap.get(desk.id) || students.find((s) => s.fixedDeskId === desk.label);

    if (selectedStudentId) {
      // If a student is currently selected in left panel, fix them to this desk!
      handleAssignFixedDesk(selectedStudentId, desk.id);
      setSelectedStudentId(null);
    } else if (fixedStudentOnDesk) {
      // If desk already has a student fixed, clicking it offers to unfix
      if (window.confirm(`${fixedStudentOnDesk.name} 학생의 고정 자리를 해제하시겠습니까?`)) {
        handleAssignFixedDesk(fixedStudentOnDesk.id, null);
      }
    }
  };

  // Clear all fixed desks
  const handleClearAllFixed = () => {
    if (window.confirm('모든 학생의 비밀 고정 자리를 해제하시겠습니까?')) {
      soundManager.playPop();
      setStudents((prev) => prev.map((s) => ({ ...s, fixedDeskId: null })));
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-6xl w-full p-5 sm:p-6 shadow-2xl border border-indigo-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-slate-900">관리자 비밀 자리 고정 설정</h2>
                <span className="bg-purple-100 text-purple-700 font-bold text-xs px-2.5 py-0.5 rounded-full border border-purple-200">
                  고정 {fixedStudentsCount}명
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                시각적 자리 배치도에서 원하는 자리를 직접 클릭하거나 학생을 선택하여 지정하세요. (배정 시 비밀 적용)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onOpenChangePasswordModal && (
              <button
                onClick={onOpenChangePasswordModal}
                className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition"
              >
                <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                <span>비밀번호 변경</span>
              </button>
            )}
            <button
              onClick={onExitAdminMode}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 transition"
            >
              관리자 모드 종료
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notice Banner */}
        <div className="mt-3 bg-purple-50/80 border border-purple-200 rounded-2xl p-3 text-purple-900 text-xs flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
            <span>
              <strong>스텔스 모드 작동</strong>: 실제 자리 배정 화면에서는 고정 여부가 화면에 표시되지 않으며, 자연스러운 추첨으로 진행됩니다.
            </span>
          </div>

          {fixedStudentsCount > 0 && (
            <button
              onClick={handleClearAllFixed}
              className="flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-700 border border-purple-300 rounded-lg font-semibold shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>전체 고정 해제</span>
            </button>
          )}
        </div>

        {/* Main Content Split Area */}
        <div className="mt-4 flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-5 pr-1 min-h-0">
          {/* Left Panel: Student Selection List (4 cols) */}
          <div className="lg:col-span-4 flex flex-col space-y-3 min-h-[300px]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-slate-800">학생 목록 ({activeStudents.length}명)</h3>
              <span className="text-[11px] text-purple-600 font-medium">
                {selectedStudentId ? '학생 선택됨! 자리를 클릭하세요' : '학생 클릭 후 자리 선택 가능'}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[480px]">
              {activeStudents.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">등록된 학생이 없습니다.</p>
              ) : (
                activeStudents.map((student) => {
                  const isSelected = selectedStudentId === student.id;
                  const isFixed = !!student.fixedDeskId;

                  return (
                    <div
                      key={student.id}
                      onClick={() => setSelectedStudentId(isSelected ? null : student.id)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-400'
                          : isFixed
                          ? 'bg-purple-50 border-purple-300 text-purple-900'
                          : 'bg-slate-50 border-slate-200 hover:border-purple-300 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="font-bold text-sm truncate">{student.name}</span>
                        {student.gender === 'male' && <span className={`text-[10px] ${isSelected ? 'text-purple-200' : 'text-blue-600'}`}>남</span>}
                        {student.gender === 'female' && <span className={`text-[10px] ${isSelected ? 'text-purple-200' : 'text-rose-600'}`}>여</span>}
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        {/* Quick Dropdown Selector */}
                        <select
                          value={student.fixedDeskId || ''}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleAssignFixedDesk(student.id, e.target.value || null)}
                          className={`text-xs font-medium py-1 px-2 rounded-lg border focus:outline-none transition ${
                            isSelected
                              ? 'bg-purple-700 text-white border-purple-500'
                              : isFixed
                              ? 'bg-purple-600 text-white border-purple-600 font-bold'
                              : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          <option value="">자유 배치</option>
                          {desks.map((desk) => {
                            const isAssignedToOther = fixedMap.has(desk.id) && fixedMap.get(desk.id)?.id !== student.id;
                            const otherStudentName = isAssignedToOther ? fixedMap.get(desk.id)?.name : null;

                            return (
                              <option key={desk.id} value={desk.id}>
                                {desk.label} {desk.sectionId ? `(${desk.sectionId}분단)` : ''} {otherStudentName ? `[${otherStudentName}]` : ''}
                              </option>
                            );
                          })}
                        </select>

                        {isFixed && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAssignFixedDesk(student.id, null);
                            }}
                            className={`p-1 rounded-lg transition ${
                              isSelected ? 'text-purple-200 hover:text-white' : 'text-purple-600 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                            title="고정 해제"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Visual Classroom Map (8 cols - 2번 자리 배치 그림과 동일 형태) */}
          <div className="lg:col-span-8 flex flex-col space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                <span>시각적 교실 자리 배치도 ({desks.length}석)</span>
                <span className="text-xs font-normal text-slate-500 hidden sm:inline">(Step 2 레이아웃과 동일)</span>
              </h3>
              <span className="text-xs text-slate-500">자리 클릭 시 지정/해제</span>
            </div>

            {/* Scrollable Canvas Box */}
            <div className="relative w-full overflow-auto bg-slate-900/5 p-3 rounded-2xl border border-slate-300 max-h-[500px]">
              <div
                className="relative bg-white rounded-xl border border-slate-300 shadow-sm p-4 mx-auto min-w-[660px]"
                style={{
                  minHeight: `${Math.max(460, maxDeskY + 80)}px`,
                  width: `${Math.max(720, maxDeskX + 80)}px`,
                }}
              >
                {/* 1. 맨 앞: 칠판 & 교탁 */}
                <div className="w-full flex flex-col items-center mb-6 relative">
                  <div className="w-10/12 max-w-xl bg-slate-800 text-slate-100 rounded-lg py-2.5 px-4 shadow-sm border-2 border-amber-900 flex items-center justify-between text-xs font-bold">
                    <span className="text-emerald-300">[맨 앞] 칠 판 (BLACKBOARD)</span>
                    <span className="text-slate-300 font-mono text-[10px]">★ 비밀 자리 고정 모드 ★</span>
                  </div>

                  <div className="mt-1.5 flex items-center space-x-2">
                    <div className="bg-amber-100 border border-amber-300 text-amber-900 text-[10px] px-3 py-0.5 rounded font-semibold flex items-center space-x-1">
                      <Monitor className="w-3 h-3 text-amber-700" />
                      <span>교 탁</span>
                    </div>
                  </div>
                </div>

                {/* 2. 왼쪽 창문 */}
                <div className="absolute left-1.5 top-20 bottom-12 w-6 bg-sky-50 border-r border-sky-300 rounded-r flex flex-col items-center justify-center text-sky-800 pointer-events-none">
                  <div className="writing-mode-vertical text-[10px] font-bold">[왼쪽] 창문</div>
                </div>

                {/* 3. 오른쪽 복도 */}
                <div className="absolute right-1.5 top-20 bottom-12 w-6 bg-amber-50 border-l border-amber-300 rounded-l flex flex-col items-center justify-center text-amber-900 pointer-events-none">
                  <div className="writing-mode-vertical text-[10px] font-bold">[오른쪽] 복도</div>
                </div>

                {/* 4. 뒤쪽 사물함 */}
                <div className="absolute bottom-1 left-12 right-12 h-5 border-t border-slate-200 bg-slate-100 rounded-t flex items-center justify-center text-[10px] text-slate-500 font-medium pointer-events-none">
                  [뒤쪽] 사물함 및 뒷문
                </div>

                {/* 5. Classroom Desks Visual Coordinates Map */}
                <div className="relative my-2 ml-6 mr-6" style={{ minHeight: `${maxDeskY + 20}px` }}>
                  {desks.map((desk) => {
                    const fixedStudent = fixedMap.get(desk.id) || students.find((s) => s.fixedDeskId === desk.label);

                    return (
                      <div
                        key={desk.id}
                        onClick={() => handleDeskClickInVisualMap(desk)}
                        className={`absolute rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between p-2 shadow-sm ${
                          fixedStudent
                            ? 'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-300'
                            : 'bg-white border-slate-300 text-slate-700 hover:border-purple-400 hover:bg-purple-50/50'
                        }`}
                        style={{
                          left: `${desk.x}px`,
                          top: `${desk.y}px`,
                          width: `${desk.width || DESK_WIDTH}px`,
                          height: `${desk.height || DESK_HEIGHT}px`,
                        }}
                      >
                        {/* Desk Label & Section */}
                        <div className="flex items-center justify-between text-[10px] font-semibold opacity-90 border-b border-black/10 pb-0.5">
                          <span className={`px-1 rounded font-mono ${fixedStudent ? 'bg-purple-700 text-purple-100' : 'bg-slate-100 text-slate-700'}`}>
                            {desk.label}
                          </span>
                          {desk.sectionId && (
                            <span className={`text-[9px] ${fixedStudent ? 'text-purple-200' : 'text-indigo-600'}`}>
                              {desk.sectionId}분단
                            </span>
                          )}
                        </div>

                        {/* Student Name or Unassigned Status */}
                        <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
                          {fixedStudent ? (
                            <div className="w-full">
                              <div className="font-extrabold text-xs sm:text-sm truncate flex items-center justify-center space-x-1">
                                <ShieldCheck className="w-3 h-3 text-purple-200 shrink-0" />
                                <span>{fixedStudent.name}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] font-medium italic hover:text-purple-600">
                              {selectedStudentId ? '+ 이 자리에 배치' : '자유 자리'}
                            </span>
                          )}
                        </div>

                        {/* Bottom action bar inside desk card */}
                        {fixedStudent && (
                          <div className="flex justify-end pt-0.5 border-t border-purple-500/50">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAssignFixedDesk(fixedStudent.id, null);
                              }}
                              className="text-[9px] text-purple-200 hover:text-white underline font-semibold"
                            >
                              고정 해제
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            고정 설정 후 창을 닫으면 3단계 랜덤 자리 배정 시 해당 자리에 비밀 지정됩니다.
          </span>

          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition"
          >
            설정 완료 및 창 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
