import React from 'react';
import { ClassroomConfig, Desk } from '../types';
import { generateDesksFromConfig, DESK_WIDTH, DESK_HEIGHT } from '../utils/classroom';
import { Plus, Grid, RefreshCw, Layers, ArrowRight, Sliders, Trash2, AlignCenter } from 'lucide-react';

interface LayoutEditorProps {
  config: ClassroomConfig;
  setConfig: React.Dispatch<React.SetStateAction<ClassroomConfig>>;
  desks: Desk[];
  setDesks: React.Dispatch<React.SetStateAction<Desk[]>>;
  studentCount: number;
  onProceedToAssignment: () => void;
}

export const LayoutEditor: React.FC<LayoutEditorProps> = ({
  config,
  setConfig,
  desks,
  setDesks,
  studentCount,
  onProceedToAssignment,
}) => {
  // Regenerate desks based on grid configuration
  const handleGenerateGrid = () => {
    const newDesks = generateDesksFromConfig(config);
    setDesks(newDesks);
  };

  // Add custom extra desk
  const handleAddCustomDesk = () => {
    const newDeskNumber = desks.length + 1;
    // Position below current bottom-most desk or at default start
    const maxY = desks.reduce((max, d) => Math.max(max, d.y), 40);
    const newDesk: Desk = {
      id: `desk_custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: `${newDeskNumber}번`,
      x: 60,
      y: maxY + 90,
      width: DESK_WIDTH,
      height: DESK_HEIGHT,
      assignedStudentId: null,
      sectionId: 1,
    };
    setDesks((prev) => [...prev, newDesk]);
  };

  // Preset Group Structure change
  const handleGroupPatternChange = (patternType: 'pairs' | 'singles' | 'triples' | 'custom_4x6') => {
    let pattern = [2, 2, 2];
    let cols = 6;
    let rows = 4;

    if (patternType === 'singles') {
      pattern = [1, 1, 1, 1, 1, 1];
      cols = 6;
      rows = 4;
    } else if (patternType === 'triples') {
      pattern = [3, 3];
      cols = 6;
      rows = 4;
    } else if (patternType === 'custom_4x6') {
      pattern = [2, 2, 2];
      cols = 6;
      rows = 5;
    }

    const updatedConfig: ClassroomConfig = {
      ...config,
      rows,
      cols,
      groupPattern: pattern,
    };
    setConfig(updatedConfig);
    setDesks(generateDesksFromConfig(updatedConfig));
  };

  // Auto-align current desks nicely into group rows
  const handleAutoAlign = () => {
    setDesks(generateDesksFromConfig(config));
  };

  // Clear all desks
  const handleClearAllDesks = () => {
    if (window.confirm('모든 자리 박스를 삭제하시겠습니까?')) {
      setDesks([]);
    }
  };

  const isDeskShortage = studentCount > desks.length;

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6 max-w-6xl mx-auto">
      {/* Header & Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-800">2단계: 교실 자리 구조 및 배치 조정</h2>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                isDeskShortage
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              학생 {studentCount}명 / 자리 {desks.length}석
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            아래의 교실 영역에서 자리 박스를 마우스로 자유롭게 드래그하여 배치하세요.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleAddCustomDesk}
            className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-sm rounded-xl border border-indigo-200 transition"
          >
            <Plus className="w-4 h-4 text-indigo-600" />
            <span>+ 추가 자리 생성</span>
          </button>

          <button
            onClick={onProceedToAssignment}
            className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-semibold text-sm rounded-xl shadow-md transition transform hover:-translate-y-0.5"
          >
            <span>다음: 자리 배정 시작</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Warning banner if student count > desk count */}
      {isDeskShortage && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 text-xs sm:text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-bold">⚠️ 자리가 부족합니다!</span>
            <span>(학생 {studentCount}명 &gt; 자리 {desks.length}개) 상단 "+ 추가 자리 생성" 버튼을 눌러 부족한 자리를 추가하세요.</span>
          </div>
          <button
            onClick={handleAddCustomDesk}
            className="px-3 py-1 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 text-xs transition"
          >
            자리 즉시 추가
          </button>
        </div>
      )}

      {/* Controls Bar */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        {/* Preset Layout Types */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">분단 형태 (분단 간격 자동 조절)</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleGroupPatternChange('pairs')}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${
                config.groupPattern.join(',') === '2,2,2'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              2명씩 짝 (3분단)
            </button>

            <button
              onClick={() => handleGroupPatternChange('singles')}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${
                config.groupPattern.join(',') === '1,1,1,1,1,1'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              1명 독서실형
            </button>

            <button
              onClick={() => handleGroupPatternChange('triples')}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${
                config.groupPattern.join(',') === '3,3'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              3명 모둠형
            </button>
          </div>
        </div>

        {/* Rows and Columns Inputs */}
        <div className="flex items-center space-x-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-600 mb-1">행 수 (가로 줄)</label>
            <input
              type="number"
              min={1}
              max={10}
              value={config.rows}
              onChange={(e) => {
                const rows = parseInt(e.target.value) || 1;
                const newCfg = { ...config, rows };
                setConfig(newCfg);
                setDesks(generateDesksFromConfig(newCfg));
              }}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-center font-bold text-slate-800"
            />
          </div>

          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-600 mb-1">열 수 (세로 줄)</label>
            <input
              type="number"
              min={1}
              max={12}
              value={config.cols}
              onChange={(e) => {
                const cols = parseInt(e.target.value) || 1;
                // adjust group pattern if needed
                const newCfg = { ...config, cols };
                setConfig(newCfg);
                setDesks(generateDesksFromConfig(newCfg));
              }}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-center font-bold text-slate-800"
            />
          </div>
        </div>

        {/* Action Tools */}
        <div className="flex items-end space-x-2">
          <button
            onClick={handleAutoAlign}
            className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-medium text-xs transition"
          >
            <AlignCenter className="w-3.5 h-3.5 text-indigo-600" />
            <span>자동 격자 정렬</span>
          </button>

          <button
            onClick={handleClearAllDesks}
            className="px-3 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-slate-300 hover:border-rose-300 rounded-lg font-medium text-xs transition"
            title="모든 자리 삭제"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
