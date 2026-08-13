import React, { useState } from 'react';
import { Student, Desk } from '../types';
import { parseStudentsFromText } from '../utils/classroom';
import { UserPlus, Trash2, UserCheck, UserX, ArrowRight, FileText, CheckCircle2, Sliders, Info, Users, ShieldCheck, KeyRound, Copy, Sparkles, X } from 'lucide-react';

interface StudentManagerProps {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  desks?: Desk[];
  onProceedToLayout: () => void;
  isAdminMode?: boolean;
  adminPassword?: string;
  onOpenAdminPanel?: () => void;
  onOpenAdminPasswordModal?: () => void;
  onOpenChangePasswordModal?: () => void;
}

export const StudentManager: React.FC<StudentManagerProps> = ({
  students,
  setStudents,
  desks = [],
  onProceedToLayout,
  isAdminMode,
  adminPassword = '2580',
  onOpenAdminPanel,
  onOpenAdminPasswordModal,
  onOpenChangePasswordModal,
}) => {
  const [inputText, setInputText] = useState('');
  const [singleNameInput, setSingleNameInput] = useState('');
  const [singleGenderInput, setSingleGenderInput] = useState<'male' | 'female' | 'unspecified'>('unspecified');
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showPasswordPromptModal, setShowPasswordPromptModal] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [pinCopyToast, setPinCopyToast] = useState(false);

  const [pasteMode, setPasteMode] = useState<'append' | 'replace'>('append');

  // Handle PIN button click with password check
  const handleOpenPinManager = () => {
    if (isAdminMode) {
      setShowPinModal(true);
    } else {
      setAdminPasswordInput('');
      setPasswordError(null);
      setShowPasswordPromptModal(true);
    }
  };

  // Verify admin password
  const handleAdminPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput === adminPassword) {
      setShowPasswordPromptModal(false);
      setShowPinModal(true);
    } else {
      setPasswordError('비밀번호가 올바르지 않습니다.');
    }
  };

  // Set all students PIN to '1234'
  const handleResetPins1234 = () => {
    setStudents((prev) => prev.map((s) => ({ ...s, pin: '1234' })));
  };

  // Generate sequence PINs (1001, 1002...)
  const handleAutoSeqPins = () => {
    setStudents((prev) =>
      prev.map((s, idx) => ({
        ...s,
        pin: (1001 + idx).toString(),
      }))
    );
  };

  // Generate random 4-digit PINs
  const handleRandomPins = () => {
    const used = new Set<string>();
    setStudents((prev) =>
      prev.map((s) => {
        let randomPin = '';
        do {
          randomPin = Math.floor(1000 + Math.random() * 9000).toString();
        } while (used.has(randomPin));
        used.add(randomPin);
        return { ...s, pin: randomPin };
      })
    );
  };

  // Copy PIN table to clipboard
  const handleCopyPinList = () => {
    const listText = students
      .map((s, idx) => `${idx + 1}번: ${s.name} (비밀번호: ${s.pin || '1234'})`)
      .join('\n');

    try {
      navigator.clipboard.writeText(`[우리반 자리 배정 PIN 안내표]\n${listText}`);
      setPinCopyToast(true);
      setTimeout(() => setPinCopyToast(false), 2500);
    } catch {
      alert('클립보드 복사에 실패했습니다.');
    }
  };

  // Bulk add students from text
  const handleBatchAdd = () => {
    if (!inputText.trim()) return;
    const newParsed = parseStudentsFromText(inputText);
    if (newParsed.length > 0) {
      if (pasteMode === 'replace') {
        setStudents(newParsed);
      } else {
        setStudents((prev) => [...prev, ...newParsed]);
      }
      setInputText('');
      setShowBatchModal(false);
    } else {
      alert('입력된 텍스트에서 인식할 수 있는 학생 이름이 없습니다. 형식(예: 김철수, 이영희)을 확인해주세요.');
    }
  };

  // Add single student
  const handleSingleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleNameInput.trim()) return;
    const newStudent: Student = {
      id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: singleNameInput.trim(),
      gender: singleGenderInput,
    };
    setStudents((prev) => [...prev, newStudent]);
    setSingleNameInput('');
  };

  // Remove single student
  const handleRemoveStudent = (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
  };

  // Clear all
  const handleClearAll = () => {
    if (window.confirm('모든 학생 명단을 삭제하시겠습니까?')) {
      setStudents([]);
    }
  };

  // Toggle gender
  const handleToggleGender = (id: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const nextGender: 'male' | 'female' | 'unspecified' =
            s.gender === 'male' ? 'female' : s.gender === 'female' ? 'unspecified' : 'male';
          return { ...s, gender: nextGender };
        }
        return s;
      })
    );
  };

  // Toggle front row preference
  const handleToggleFrontRow = (id: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const nextVal = !s.frontRowOnly;
          return {
            ...s,
            frontRowOnly: nextVal,
            backRowOnly: nextVal ? false : s.backRowOnly,
          };
        }
        return s;
      })
    );
  };

  // Toggle back row preference
  const handleToggleBackRow = (id: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const nextVal = !s.backRowOnly;
          return {
            ...s,
            backRowOnly: nextVal,
            frontRowOnly: nextVal ? false : s.frontRowOnly,
          };
        }
        return s;
      })
    );
  };

  // Toggle absent status
  const handleToggleAbsent = (id: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isAbsent: !s.isAbsent } : s))
    );
  };

  const activeCount = students.filter((s) => !s.isAbsent).length;
  const maleCount = students.filter((s) => s.gender === 'male' && !s.isAbsent).length;
  const femaleCount = students.filter((s) => s.gender === 'female' && !s.isAbsent).length;
  const frontRowReqCount = students.filter((s) => s.frontRowOnly && !s.isAbsent).length;
  const backRowReqCount = students.filter((s) => s.backRowOnly && !s.isAbsent).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner / Summary */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-800">1단계: 학생 명단 등록</h2>
            <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-indigo-200">
              총 {students.length}명
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            배정할 학생 이름을 직접 추가하거나 줄바꿈/쉼표로 일괄 붙여넣기 하세요.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenPinManager}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <KeyRound className="w-4 h-4 text-amber-300" />
            <span>🔑 학생 PIN 관리</span>
          </button>

          <button
            onClick={() => setShowBatchModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium text-sm rounded-xl border border-indigo-200 transition"
          >
            <FileText className="w-4 h-4" />
            <span>명단 붙여넣기</span>
          </button>

          <button
            onClick={onProceedToLayout}
            className="flex items-center space-x-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl shadow-md transition transform hover:-translate-y-0.5"
          >
            <span>다음: 자리 배치</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">참석 학생</div>
          <div className="text-2xl font-bold text-slate-900 mt-0.5">{activeCount}명</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-blue-600 font-medium">남학생</div>
          <div className="text-2xl font-bold text-blue-700 mt-0.5">{maleCount}명</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-rose-600 font-medium">여학생</div>
          <div className="text-2xl font-bold text-rose-700 mt-0.5">{femaleCount}명</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-amber-600 font-medium">앞자리 선호</div>
          <div className="text-2xl font-bold text-amber-700 mt-0.5">{frontRowReqCount}명</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-purple-600 font-medium">뒷자리 선호</div>
          <div className="text-2xl font-bold text-purple-700 mt-0.5">{backRowReqCount}명</div>
        </div>
      </div>

      {/* Single Add Form */}
      <form onSubmit={handleSingleAdd} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={singleNameInput}
            onChange={(e) => setSingleNameInput(e.target.value)}
            placeholder="학생 이름 입력 (예: 홍길동)"
            className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-start">
          <select
            value={singleGenderInput}
            onChange={(e) => setSingleGenderInput(e.target.value as 'male' | 'female' | 'unspecified')}
            className="py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
          >
            <option value="unspecified">성별 미지정</option>
            <option value="male">남학생 👦</option>
            <option value="female">여학생 👧</option>
          </select>

          <button
            type="submit"
            className="flex items-center space-x-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-xl transition shadow-sm whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" />
            <span>추가</span>
          </button>
        </div>
      </form>

      {/* Student List Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-slate-800 text-sm">등록된 학생 목록 ({students.length}명)</h3>
            <span className="text-xs text-slate-500 hidden sm:inline">태그 클릭 시 성별 / 앞자리선호 변경</span>
          </div>

          {students.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs text-rose-600 hover:text-rose-700 hover:underline flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>전체 삭제</span>
            </button>
          )}
        </div>

        {students.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-slate-600 font-medium">등록된 학생이 없습니다.</p>
            <p className="text-slate-400 text-sm mt-1">상단 입력창 또는 붙여넣기 버튼을 이용하여 명단을 작성해주세요.</p>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto">
            {students.map((student, index) => (
              <div
                key={student.id}
                className={`group relative p-3 rounded-xl border transition-all flex items-center justify-between ${
                  student.isAbsent
                    ? 'bg-slate-100/80 border-slate-200 opacity-60'
                    : student.gender === 'male'
                    ? 'bg-blue-50/50 border-blue-200 hover:border-blue-300'
                    : student.gender === 'female'
                    ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300'
                    : 'bg-white border-slate-200 hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span className="text-xs font-mono font-medium text-slate-400 w-5 text-right">
                    {index + 1}.
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 text-sm truncate flex items-center space-x-1">
                      <span className={student.isAbsent ? 'line-through text-slate-500' : ''}>
                        {student.name}
                      </span>
                      {student.isAbsent && <span className="text-xs text-rose-500 font-normal">(결석)</span>}
                    </div>

                    <div className="flex items-center space-x-1 mt-1">
                      {/* Gender Badge Toggle */}
                      <button
                        onClick={() => handleToggleGender(student.id)}
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded transition ${
                          student.gender === 'male'
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            : student.gender === 'female'
                            ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title="클릭하여 성별 변경"
                      >
                        {student.gender === 'male' ? '남 👦' : student.gender === 'female' ? '여 👧' : '성별미지정'}
                      </button>

                      {/* Front Row Toggle */}
                      <button
                        onClick={() => handleToggleFrontRow(student.id)}
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded transition ${
                          student.frontRowOnly
                            ? 'bg-amber-100 text-amber-800 border border-amber-300 font-bold'
                            : 'bg-slate-100 text-slate-400 hover:text-slate-600'
                        }`}
                        title="앞자리 우선 배치 설정"
                      >
                        {student.frontRowOnly ? '★ 앞자리' : '앞자리'}
                      </button>

                      {/* Back Row Toggle */}
                      <button
                        onClick={() => handleToggleBackRow(student.id)}
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded transition ${
                          student.backRowOnly
                            ? 'bg-purple-100 text-purple-800 border border-purple-300 font-bold'
                            : 'bg-slate-100 text-slate-400 hover:text-slate-600'
                        }`}
                        title="뒷자리 우선 배치 설정"
                      >
                        {student.backRowOnly ? '★ 뒷자리' : '뒷자리'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleToggleAbsent(student.id)}
                    title={student.isAbsent ? '출석 처리' : '결석 처리'}
                    className={`p-1 rounded hover:bg-slate-200 transition ${
                      student.isAbsent ? 'text-slate-400' : 'text-slate-500 hover:text-rose-600'
                    }`}
                  >
                    {student.isAbsent ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => handleRemoveStudent(student.id)}
                    title="삭제"
                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Batch Text Input Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">학생 명단 일괄 붙여넣기</h3>
            <p className="text-xs text-slate-500 mb-3">
              엑셀, 한글, 워드 또는 텍스트 파일에서 복사한 학생 명단을 붙여넣으세요.
              <br />
              <span className="text-indigo-600 font-medium">Tip: 엑셀 복사/줄바꿈/쉼표/번호(1. 홍길동)/성별(김철수(남)) 모두 자동 인식됩니다.</span>
            </p>

            {/* Mode Selector */}
            <div className="mb-3 p-1.5 bg-slate-100 rounded-xl flex items-center space-x-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPasteMode('append')}
                className={`flex-1 py-1.5 rounded-lg transition text-center ${
                  pasteMode === 'append' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                + 기존 명단에 추가하기
              </button>
              <button
                type="button"
                onClick={() => setPasteMode('replace')}
                className={`flex-1 py-1.5 rounded-lg transition text-center ${
                  pasteMode === 'replace' ? 'bg-rose-500 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🔄 새 명단으로 전체 교체하기
              </button>
            </div>

            <textarea
              rows={7}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`예시 1 (줄바꿈):\n김민준(남)\n이서연(여)\n박도윤\n\n예시 2 (엑셀 복사):\n1\t강민준\t남\n2\t김서연\t여`}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />

            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>
                인식된 학생:{' '}
                <strong className="text-indigo-600 font-bold">
                  {inputText.trim() ? parseStudentsFromText(inputText).length : 0}명
                </strong>
              </span>
              {pasteMode === 'replace' && students.length > 0 && (
                <span className="text-rose-600 font-medium">* 기존 {students.length}명 명단이 교체됩니다.</span>
              )}
            </div>

            <div className="mt-4 flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 font-medium rounded-xl hover:bg-slate-100"
              >
                취소
              </button>

              <button
                onClick={handleBatchAdd}
                className={`px-5 py-2 text-sm font-bold text-white rounded-xl shadow-md transition ${
                  pasteMode === 'replace' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {pasteMode === 'replace' ? '새 명단으로 교체하기' : '명단 추가하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Management Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl font-bold">
                  🔑
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">학생 비밀번호(PIN) 관리</h3>
                  <p className="text-xs text-slate-500">학생들이 다른 친구 이름으로 응모하는 부정행위를 방지합니다.</p>
                </div>
              </div>

              {pinCopyToast && (
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full border border-emerald-300 animate-pulse">
                  ✅ 안내표 복사완료!
                </span>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={handleResetPins1234}
                className="p-2.5 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 text-center transition cursor-pointer"
              >
                <div className="text-indigo-600 font-extrabold mb-0.5">전체 1234 초기화</div>
                <div className="text-[10px] text-slate-500 font-normal">PIN: 1234 동일</div>
              </button>

              <button
                onClick={handleAutoSeqPins}
                className="p-2.5 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 text-center transition cursor-pointer"
              >
                <div className="text-indigo-600 font-extrabold mb-0.5">연번 부여 (1001~)</div>
                <div className="text-[10px] text-slate-500 font-normal">1001, 1002, 1003...</div>
              </button>

              <button
                onClick={handleRandomPins}
                className="p-2.5 bg-amber-50 hover:bg-amber-100 hover:border-amber-400 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 text-center transition cursor-pointer"
              >
                <div className="text-amber-700 font-extrabold mb-0.5 flex items-center justify-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>임의(랜덤) PIN</span>
                </div>
                <div className="text-[10px] text-amber-700 font-normal">랜덤 4자리 번호</div>
              </button>

              <button
                onClick={handleCopyPinList}
                className="p-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-xs font-bold text-center transition shadow-sm flex flex-col items-center justify-center cursor-pointer"
              >
                <div className="flex items-center space-x-1 font-black">
                  <Copy className="w-3.5 h-3.5" />
                  <span>PIN 안내표 복사</span>
                </div>
                <div className="text-[10px] text-emerald-100 font-normal">클립보드에 명단 저장</div>
              </button>
            </div>

            {/* Student PIN Edit Table */}
            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-2xl p-2 bg-slate-50 divide-y divide-slate-200">
              {students.map((s, idx) => (
                <div key={s.id} className="flex items-center justify-between py-2 px-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-slate-400 w-6">{idx + 1}.</span>
                    <span className="text-sm font-bold text-slate-800">{s.name}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400 font-medium">PIN:</span>
                    <input
                      type="text"
                      maxLength={6}
                      value={s.pin || '1234'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStudents((prev) =>
                          prev.map((item) => (item.id === s.id ? { ...item, pin: val } : item))
                        );
                      }}
                      className="w-20 text-center py-1 px-2 bg-white border border-slate-300 font-mono font-bold text-xs rounded-lg focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowPinModal(false)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition"
              >
                닫기 및 저장
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Password Prompt Modal for Student PIN Management */}
      {showPasswordPromptModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-indigo-700 font-bold text-base">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                <span>관리자 비밀번호 확인</span>
              </div>
              <button
                onClick={() => setShowPasswordPromptModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              학생 PIN 정보를 수정하거나 안내표를 복사하려면 관리자 비밀번호를 입력하세요.
            </p>

            <form onSubmit={handleAdminPasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  관리자 비밀번호
                </label>
                <input
                  type="password"
                  autoFocus
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="비밀번호 입력"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-center text-lg font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              {passwordError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl text-center font-medium">
                  {passwordError}
                </div>
              )}

              <div className="flex space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPasswordPromptModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-md shadow-indigo-600/20"
                >
                  확인
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
