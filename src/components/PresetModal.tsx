import React, { useState } from 'react';
import { ClassroomPreset } from '../types';
import { FolderOpen, Save, Trash2, X, Plus, Check } from 'lucide-react';

interface PresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: ClassroomPreset[];
  onLoadPreset: (preset: ClassroomPreset) => void;
  onDeletePreset: (id: string) => void;
  onSaveCurrentAsPreset: (title: string) => void;
}

export const PresetModal: React.FC<PresetModalProps> = ({
  isOpen,
  onClose,
  presets,
  onLoadPreset,
  onDeletePreset,
  onSaveCurrentAsPreset,
}) => {
  const [newPresetTitle, setNewPresetTitle] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetTitle.trim()) return;
    onSaveCurrentAsPreset(newPresetTitle.trim());
    setNewPresetTitle('');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">학급 및 자리 배치 보관함</h3>
              <p className="text-xs text-slate-500">자주 쓰는 학생 명단과 자리 배치를 저장 및 불러오기 합니다.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Save Current State Form */}
        <form onSubmit={handleSave} className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 space-y-2">
          <label className="block text-xs font-bold text-indigo-900">
            현재 학생 명단 & 자리 배치 저장하기
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newPresetTitle}
              onChange={(e) => setNewPresetTitle(e.target.value)}
              placeholder="예: 3학년 2반 기본 배치"
              className="flex-1 px-3.5 py-2 bg-white border border-indigo-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="flex items-center space-x-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition shadow-xs whitespace-nowrap"
            >
              {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{saveSuccess ? '저장됨' : '저장'}</span>
            </button>
          </div>
        </form>

        {/* Saved Presets List */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 mb-2">저장된 보관함 목록 ({presets.length}개)</h4>
          {presets.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              저장된 학급 배치가 없습니다.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 bg-white hover:bg-slate-50 transition"
                >
                  <div>
                    <div className="font-bold text-slate-800 text-sm">{preset.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      학생 {preset.students.length}명 · 자리 {preset.desks.length}석 · {preset.updatedAt}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        onLoadPreset(preset);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-lg transition"
                    >
                      불러오기
                    </button>

                    <button
                      onClick={() => onDeletePreset(preset.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
