import React from 'react';
import { ClassroomConfig, Desk } from '../types';
import { generateDesksFromConfig, buildGroupPatternForCols, DESK_WIDTH, DESK_HEIGHT } from '../utils/classroom';
import { Plus, Grid, RefreshCw, Layers, ArrowRight, Sliders, Trash2, AlignCenter, Users, Move } from 'lucide-react';

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
  const currentLayoutType = config.layoutType || 'pairs';
  const currentGroupSize = config.groupSize || 4;

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

  // Switch layout mode (pairs, singles, group, free)
  const handleLayoutTypeChange = (layoutType: 'pairs' | 'singles' | 'group' | 'free') => {
    const groupPattern = buildGroupPatternForCols(config.cols, layoutType);
    const updatedConfig: ClassroomConfig = {
      ...config,
      layoutType,
      groupPattern,
      groupSize: layoutType === 'group' ? (config.groupSize || 4) : config.groupSize,
    };
    setConfig(updatedConfig);
    setDesks(generateDesksFromConfig(updatedConfig));
  };

  // Change Group Size for 모둠형 (e.g. 4, 5, 6, 8)
  const handleGroupSizeChange = (groupSize: number) => {
    const updatedConfig: ClassroomConfig = {
      ...config,
      layoutType: 'group',
      groupSize,
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
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">분단 형태 (분단 간격 및 모둠 자동 조절)</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => handleLayoutTypeChange('pairs')}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
                currentLayoutType === 'pairs'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              2명씩 짝
            </button>

            <button
              onClick={() => handleLayoutTypeChange('singles')}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
                currentLayoutType === 'singles'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              1명 독서실형
            </button>

            <button
              onClick={() => handleLayoutTypeChange('group')}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
                currentLayoutType === 'group'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              모둠형
            </button>

            <button
              onClick={() => handleLayoutTypeChange('free')}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
                currentLayoutType === 'free'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              자유 배정
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
              max={12}
              value={config.rows}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val >= 1) {
                  const rows = Math.min(12, val);
                  const newCfg = { ...config, rows };
                  setConfig(newCfg);
                  setDesks(generateDesksFromConfig(newCfg));
                }
              }}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-center font-bold text-slate-800"
            />
          </div>

          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-600 mb-1">열 수 (세로 줄)</label>
            <input
              type="number"
              min={1}
              max={16}
              value={config.cols}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val >= 1) {
                  const cols = Math.min(16, val);
                  const newPattern = buildGroupPatternForCols(cols, currentLayoutType);
                  const newCfg = { ...config, cols, groupPattern: newPattern };
                  setConfig(newCfg);
                  setDesks(generateDesksFromConfig(newCfg));
                }
              }}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-center font-bold text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Extra sub-controls for 모둠형 (Group Mode) */}
      {currentLayoutType === 'group' && (
        <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-indigo-700" />
            <span className="font-bold text-indigo-900">모둠별 인원수 설정:</span>
            <span className="text-indigo-700">모둠 인원수에 맞춰 자리가 정사각형/직사각형으로 모여 배치됩니다.</span>
          </div>

          <div className="flex items-center space-x-1.5">
            {[4, 5, 6, 8].map((size) => (
              <button
                key={size}
                onClick={() => handleGroupSizeChange(size)}
                className={`px-3 py-1 rounded-lg border font-bold text-xs transition ${
                  currentGroupSize === size
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-indigo-900 border-indigo-200 hover:bg-indigo-100'
                }`}
              >
                {size}명 모둠 {size === 4 ? '(기본 2x2)' : ''}
              </button>
            ))}

            <div className="flex items-center space-x-1 ml-2">
              <span className="text-slate-600 font-medium">직접 입력:</span>
              <input
                type="number"
                min={2}
                max={12}
                value={currentGroupSize}
                onChange={(e) => {
                  const size = parseInt(e.target.value) || 4;
                  handleGroupSizeChange(size);
                }}
                className="w-14 px-2 py-1 bg-white border border-indigo-300 rounded-md font-bold text-center text-indigo-950 focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-slate-600">명</span>
            </div>
          </div>
        </div>
      )}

      {currentLayoutType === 'free' && (
        <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Move className="w-4 h-4 text-amber-700" />
            <span>
              <strong>자유 배정 모드:</strong> 상단 <strong>"+ 추가 자리 생성"</strong> 버튼으로 생성한 자리를 교실 내 원하는 위치로 자유롭게 드래그하여 배치하세요.
            </span>
          </div>
          <button
            onClick={handleClearAllDesks}
            className="px-3 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold rounded-lg border border-amber-300 transition"
          >
            자리 전체 비우기
          </button>
        </div>
      )}

      {/* Action Tools */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
        <span>* 각 자리 박스는 칠판, 창문, 복도 위치에 맞춰 자유롭게 마우스로 이동할 수 있습니다.</span>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleAutoAlign}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-medium transition"
          >
            <AlignCenter className="w-3.5 h-3.5 text-indigo-600" />
            <span>자동 격자 정렬</span>
          </button>

          <button
            onClick={handleClearAllDesks}
            className="flex items-center space-x-1 px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-300 hover:border-rose-300 rounded-lg font-medium transition"
            title="모든 자리 삭제"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>전체 삭제</span>
          </button>
        </div>
      </div>
    </div>
  );
};
