import React, { useState, useEffect, useRef } from 'react';
import { Student, Desk, ClassroomConfig, ClassroomPreset } from './types';
import {
  DEFAULT_STUDENTS,
  DEFAULT_CONFIG,
  generateDesksFromConfig,
} from './utils/classroom';
import { soundManager } from './utils/sound';

import { Header } from './components/Header';
import { StudentManager } from './components/StudentManager';
import { LayoutEditor } from './components/LayoutEditor';
import { ClassroomCanvas } from './components/ClassroomCanvas';
import { AssignmentControl } from './components/AssignmentControl';
import { ExportModal } from './components/ExportModal';
import { PresetModal } from './components/PresetModal';
import { AdminPasswordModal } from './components/AdminPasswordModal';
import { AdminPanel } from './components/AdminPanel';
import { KeyRound, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'students' | 'layout' | 'assignment'>('students');

  // Load initial data from localStorage if present
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem('classroom_students_v2');
      return saved ? JSON.parse(saved) : DEFAULT_STUDENTS;
    } catch {
      return DEFAULT_STUDENTS;
    }
  });

  const [config, setConfig] = useState<ClassroomConfig>(DEFAULT_CONFIG);

  const [desks, setDesks] = useState<Desk[]>(() => {
    try {
      const saved = localStorage.getItem('classroom_desks_v2');
      return saved ? JSON.parse(saved) : generateDesksFromConfig(DEFAULT_CONFIG);
    } catch {
      return generateDesksFromConfig(DEFAULT_CONFIG);
    }
  });

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);

  // Admin Mode States
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isAdminPasswordModalOpen, setIsAdminPasswordModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  const fixedCount = students.filter((s) => s.fixedDeskId).length;

  const [presets, setPresets] = useState<ClassroomPreset[]>(() => {
    try {
      const saved = localStorage.getItem('classroom_presets_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const canvasRef = useRef<HTMLDivElement>(null);

  // Sync state to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('classroom_students_v2', JSON.stringify(students));
    } catch {
      // Ignore storage errors
    }
  }, [students]);

  useEffect(() => {
    try {
      localStorage.setItem('classroom_desks_v2', JSON.stringify(desks));
    } catch {
      // Ignore
    }
  }, [desks]);

  useEffect(() => {
    try {
      localStorage.setItem('classroom_presets_v2', JSON.stringify(presets));
    } catch {
      // Ignore
    }
  }, [presets]);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundManager.setEnabled(next);
  };

  // Swap students between two desks
  const handleSwapDesks = (deskId1: string, deskId2: string) => {
    setDesks((prevDesks) => {
      const desk1 = prevDesks.find((d) => d.id === deskId1);
      const desk2 = prevDesks.find((d) => d.id === deskId2);

      if (!desk1 || !desk2) return prevDesks;

      const student1 = desk1.assignedStudentId;
      const student2 = desk2.assignedStudentId;

      soundManager.playPop();

      return prevDesks.map((d) => {
        if (d.id === deskId1) return { ...d, assignedStudentId: student2 };
        if (d.id === deskId2) return { ...d, assignedStudentId: student1 };
        return d;
      });
    });
  };

  // Reset layout to defaults
  const handleResetLayout = () => {
    if (window.confirm('자리 배치 및 배정 내역을 초기화하시겠습니까?')) {
      const newDesks = generateDesksFromConfig(config);
      setDesks(newDesks);
    }
  };

  // Save current roster and desks as preset
  const handleSaveCurrentAsPreset = (title: string) => {
    const newPreset: ClassroomPreset = {
      id: `preset_${Date.now()}`,
      title,
      updatedAt: new Date().toLocaleDateString('ko-KR'),
      students,
      desks,
      config,
    };
    setPresets((prev) => [newPreset, ...prev]);
  };

  // Load selected preset
  const handleLoadPreset = (preset: ClassroomPreset) => {
    setStudents(preset.students);
    setDesks(preset.desks);
    if (preset.config) setConfig(preset.config);
  };

  // Delete preset
  const handleDeletePreset = (id: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col">
      {/* Top Header Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        studentCount={students.length}
        deskCount={desks.length}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onResetLayout={handleResetLayout}
        onSavePreset={() => setIsPresetModalOpen(true)}
        onLoadPresetClick={() => setIsPresetModalOpen(true)}
        isAdminMode={isAdminMode}
        fixedCount={fixedCount}
        onOpenAdminModal={() => {
          if (isAdminMode) {
            setIsAdminPanelOpen(true);
          } else {
            setIsAdminPasswordModalOpen(true);
          }
        }}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Step 1: Student List Management */}
        {activeTab === 'students' && (
          <StudentManager
            students={students}
            setStudents={setStudents}
            desks={desks}
            onProceedToLayout={() => setActiveTab('layout')}
            isAdminMode={isAdminMode}
            onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
          />
        )}

        {/* Step 2: Classroom Layout Editor */}
        {activeTab === 'layout' && (
          <div className="space-y-6">
            <LayoutEditor
              config={config}
              setConfig={setConfig}
              desks={desks}
              setDesks={setDesks}
              studentCount={students.length}
              onProceedToAssignment={() => setActiveTab('assignment')}
            />

            {/* Interactive Classroom Canvas in Layout Mode */}
            <ClassroomCanvas
              desks={desks}
              setDesks={setDesks}
              students={students}
              config={config}
              mode="layout"
              canvasRef={canvasRef}
              isAdminMode={isAdminMode}
              onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
            />
          </div>
        )}

        {/* Step 3: Random Assignment & Canvas Viewer */}
        {activeTab === 'assignment' && (
          <div className="space-y-6">
            <AssignmentControl
              students={students}
              desks={desks}
              setDesks={setDesks}
              onGoToLayout={() => setActiveTab('layout')}
            />

            {/* Interactive Classroom Canvas in Assignment Mode */}
            <ClassroomCanvas
              desks={desks}
              setDesks={setDesks}
              students={students}
              config={config}
              mode="assignment"
              onSwapDesks={handleSwapDesks}
              canvasRef={canvasRef}
              isAdminMode={isAdminMode}
              onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        canvasRef={canvasRef}
      />

      <PresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        presets={presets}
        onLoadPreset={handleLoadPreset}
        onDeletePreset={handleDeletePreset}
        onSaveCurrentAsPreset={handleSaveCurrentAsPreset}
      />

      {/* Admin Mode Modals */}
      <AdminPasswordModal
        isOpen={isAdminPasswordModalOpen}
        onClose={() => setIsAdminPasswordModalOpen(false)}
        onSuccess={() => {
          setIsAdminMode(true);
          setIsAdminPanelOpen(true);
        }}
      />

      <AdminPanel
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        students={students}
        setStudents={setStudents}
        desks={desks}
        onExitAdminMode={() => {
          setIsAdminMode(false);
          setIsAdminPanelOpen(false);
        }}
      />

      {/* Footer with Secret Trigger Icon */}
      <footer className="py-4 px-4 text-center text-xs text-slate-500 border-t border-slate-200 bg-white flex items-center justify-center space-x-2">
        <span>교실 자리 배정 시스템 · 칠판(앞) / 창문(좌) / 복도(우) 교실 환경 지원</span>
        <button
          onClick={() => {
            if (isAdminMode) {
              setIsAdminPanelOpen(true);
            } else {
              setIsAdminPasswordModalOpen(true);
            }
          }}
          className="text-slate-300 hover:text-slate-500 transition p-1 rounded"
          title="관리자 설정"
        >
          <KeyRound className="w-3.5 h-3.5" />
        </button>
      </footer>
    </div>
  );
}
