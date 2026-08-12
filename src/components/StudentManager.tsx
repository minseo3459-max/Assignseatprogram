import React, { useState } from 'react';
import { Student, Desk } from '../types';
import { parseStudentsFromText } from '../utils/classroom';
import { UserPlus, Trash2, UserCheck, UserX, ArrowRight, FileText, CheckCircle2, Sliders, Info, Users, ShieldCheck } from 'lucide-react';

interface StudentManagerProps {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  desks?: Desk[];
  onProceedToLayout: () => void;
  isAdminMode?: boolean;
  onOpenAdminPanel?: () => void;
}

export const StudentManager: React.FC<StudentManagerProps> = ({
  students,
  setStudents,
  desks = [],
  onProceedToLayout,
  isAdminMode,
  onOpenAdminPanel,
}) => {
  const [inputText, setInputText] = useState('');
  const [singleNameInput, setSingleNameInput] = useState('');
  const [singleGenderInput, setSingleGenderInput] = useState<'male' | 'female' | 'unspecified'>('unspecified');
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Bulk add students from text
  const handleBatchAdd = () => {
    if (!inputText.trim()) return;
    const newParsed = parseStudentsFromText(inputText);
    if (newParsed.length > 0) {
      setStudents((prev) => [...prev, ...newParsed]);
      setInputText('');
      setShowBatchModal(false);
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
      prev.map((s) => (s.id === id ? { ...s, frontRowOnly: !s.frontRowOnly } : s))
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

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowBatchModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium text-sm rounded-xl border border-indigo-200 transition"
          >
            <FileText className="w-4 h-4" />
            <span>명단 한 번에 붙여넣기</span>
          </button>

          <button
            onClick={onProceedToLayout}
            className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-600/20 transition transform hover:-translate-y-0.5"
          >
            <span>다음: 자리 배치 조정</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-slate-100 text-slate-400 hover:text-slate-600'
                        }`}
                        title="앞자리 우선 배치 설정"
                      >
                        {student.frontRowOnly ? '★ 앞자리' : '앞자리'}
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
            <h3 className="text-lg font-bold text-slate-900 mb-2">학생 명단 일괄 붙여넣기</h3>
            <p className="text-xs text-slate-500 mb-4">
              엑셀이나 텍스트 파일에서 복사한 학생 이름을 붙여넣으세요. 이름 뒤에 (남), (여)를 적으면 성별이 자동 인식됩니다. (예: 김철수(남), 이영희(여))
            </p>

            <textarea
              rows={8}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`김민준(남)\n이서연(여)\n박도윤\n최지우(여)\n정시우`}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />

            <div className="mt-4 flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 font-medium rounded-xl hover:bg-slate-100"
              >
                취소
              </button>

              <button
                onClick={handleBatchAdd}
                className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md"
              >
                명단 추가하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
