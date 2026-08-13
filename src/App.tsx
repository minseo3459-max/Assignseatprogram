import React, { useState, useEffect, useRef } from 'react';
import { Student, Desk, ClassroomConfig, ClassroomPreset, SystemMode, TicketingState } from './types';
import {
  DEFAULT_STUDENTS,
  DEFAULT_CONFIG,
  generateDesksFromConfig,
} from './utils/classroom';
import { soundManager } from './utils/sound';
import { getApiUrl } from './utils/apiConfig';

import { Header } from './components/Header';
import { StudentManager } from './components/StudentManager';
import { LayoutEditor } from './components/LayoutEditor';
import { ClassroomCanvas } from './components/ClassroomCanvas';
import { AssignmentControl } from './components/AssignmentControl';
import { StudentTicketingView } from './components/StudentTicketingView';
import { ExportModal } from './components/ExportModal';
import { PresetModal } from './components/PresetModal';
import { AdminPasswordModal } from './components/AdminPasswordModal';
import { AdminPanel } from './components/AdminPanel';
import { AdminPasswordChangeModal } from './components/AdminPasswordChangeModal';
import { KeyRound, ShieldCheck } from 'lucide-react';

export default function App() {
  // Check URL parameter for dedicated student ticketing link
  const [isStudentLinkAccess] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const modeParam = params.get('mode') || params.get('tab') || params.get('ticketing');
      const hasClassId = Boolean(params.get('classId') || params.get('cid') || params.get('room'));
      const isTeacherParam = params.get('teacher') === 'true';

      if (isTeacherParam) return false;
      if (modeParam === 'student_ticketing' || modeParam === 'ticketing' || modeParam === 'true' || window.location.hash === '#student_ticketing') {
        return true;
      }
      return hasClassId;
    } catch {
      return false;
    }
  });

  const [isTeacherUnlocked, setIsTeacherUnlocked] = useState<boolean>(() => !isStudentLinkAccess);
  const isStudentOnlyMode = isStudentLinkAccess && !isTeacherUnlocked;

  const [activeTab, setActiveTab] = useState<'students' | 'layout' | 'assignment' | 'student_ticketing'>(() => {
    if (isStudentLinkAccess) return 'student_ticketing';
    return 'students';
  });

  const [systemMode, setSystemMode] = useState<SystemMode>(() => {
    if (isStudentLinkAccess) return 'ticketing';
    return 'random';
  });

  // Class ID state for unique student ticketing links
  const [classId, setClassId] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const paramId = params.get('classId') || params.get('cid') || params.get('room');
      if (paramId) return paramId;
      const saved = localStorage.getItem('classroom_class_id');
      if (saved) return saved;
    } catch {
      // Ignore
    }
    const generated = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      localStorage.setItem('classroom_class_id', generated);
    } catch {
      // Ignore
    }
    return generated;
  });

  // Ticketing State per classId
  const [ticketingState, setTicketingState] = useState<TicketingState>(() => {
    try {
      const storageKey = `classroom_ticketing_v1_${classId}`;
      const saved = localStorage.getItem(storageKey) || localStorage.getItem('classroom_ticketing_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    return {
      isOpen: true,
      claims: {},
      lastUpdated: new Date().toISOString(),
    };
  });

  // Generate new random class link ID
  const handleGenerateRandomClassId = () => {
    const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setClassId(newId);
    try {
      localStorage.setItem('classroom_class_id', newId);
    } catch {
      // Ignore
    }
    const newTicketingState: TicketingState = {
      isOpen: true,
      claims: {},
      lastUpdated: new Date().toISOString(),
    };
    setTicketingState(newTicketingState);
    try {
      localStorage.setItem(`classroom_ticketing_v1_${newId}`, JSON.stringify(newTicketingState));
    } catch {
      // Ignore
    }
    return newId;
  };

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

  // Admin Password & Admin Mode States
  const [adminPassword, setAdminPassword] = useState<string>(() => {
    try {
      return localStorage.getItem('classroom_admin_password') || '2580';
    } catch {
      return '2580';
    }
  });

  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isAdminPasswordModalOpen, setIsAdminPasswordModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);

  const handleChangeAdminPassword = (newPassword: string) => {
    setAdminPassword(newPassword);
    try {
      localStorage.setItem('classroom_admin_password', newPassword);
    } catch {
      // Ignore
    }
  };

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

  useEffect(() => {
    document.title = '자리 배정 및 실시간 티켓팅 시스템';
  }, []);

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

  // Ref tracking last broadcasted ticketing state to avoid self-referential loops
  const lastBroadcastStrRef = useRef<string>('');

  // Sync ticketing state to LocalStorage and BroadcastChannel per classId
  useEffect(() => {
    const stateStr = JSON.stringify(ticketingState);
    if (stateStr === lastBroadcastStrRef.current) {
      return;
    }
    lastBroadcastStrRef.current = stateStr;

    const storageKey = `classroom_ticketing_v1_${classId}`;
    try {
      localStorage.setItem(storageKey, stateStr);
      localStorage.setItem('classroom_ticketing_v1', stateStr);
    } catch {
      // Ignore
    }

    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel(`classroom_ticketing_channel_${classId}`);
        channel.postMessage({ type: 'TICKETING_UPDATE', payload: ticketingState });
        channel.close();
      }
    } catch {
      // Ignore
    }
  }, [ticketingState, classId]);

  // Ref tracking last received/saved data payload string and flag for server updates
  const lastKnownDataRef = useRef<string>('');
  const isIncomingServerUpdateRef = useRef<boolean>(false);
  const lastLocalMutationTimeRef = useRef<number>(0);

  // Global activity listener to update lastLocalMutationTimeRef when user is typing
  useEffect(() => {
    const handleTypingActivity = () => {
      lastLocalMutationTimeRef.current = Date.now();
    };
    window.addEventListener('input', handleTypingActivity, true);
    window.addEventListener('keydown', handleTypingActivity, true);
    return () => {
      window.removeEventListener('input', handleTypingActivity, true);
      window.removeEventListener('keydown', handleTypingActivity, true);
    };
  }, []);

  // Check if an input or textarea element is currently focused
  const isUserTyping = (): boolean => {
    if (typeof document === 'undefined') return false;
    const active = document.activeElement;
    if (!active) return false;
    const tagName = active.tagName.toUpperCase();
    return (
      tagName === 'INPUT' ||
      tagName === 'TEXTAREA' ||
      (active as HTMLElement).isContentEditable
    );
  };

  // Helper to safely apply server data snapshot
  const applyServerData = (data: any) => {
    if (!data) return;

    // Do NOT overwrite local edits/state if user is actively typing or a mutation occurred within 5000ms
    if (isUserTyping() || Date.now() - lastLocalMutationTimeRef.current < 5000) {
      return;
    }

    isIncomingServerUpdateRef.current = true;

    if (Array.isArray(data.students)) {
      setStudents(data.students);
    }
    if (Array.isArray(data.desks)) {
      setDesks(data.desks);
    }
    if (data.config) {
      setConfig(data.config);
    }
    if (data.ticketingState) {
      setTicketingState((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(data.ticketingState)) {
          return prev;
        }
        return data.ticketingState;
      });
    }

    const payloadToCompare = {
      students: data.students ?? [],
      desks: data.desks ?? [],
      config: data.config ?? null,
      ticketingState: data.ticketingState ?? { isOpen: true, claims: {} },
    };
    lastKnownDataRef.current = JSON.stringify(payloadToCompare);
  };

  // Keep URL query parameter synced with classId
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('classId') !== classId) {
        url.searchParams.set('classId', classId);
        window.history.replaceState({}, '', url.toString());
      }
    } catch {
      // Ignore
    }
  }, [classId]);

  // Clean up desk assignments when a student is deleted
  useEffect(() => {
    const studentIds = new Set(students.map((s) => s.id));
    setDesks((prevDesks) => {
      let changed = false;
      const cleaned = prevDesks.map((d) => {
        if (d.assignedStudentId && !studentIds.has(d.assignedStudentId)) {
          changed = true;
          return { ...d, assignedStudentId: null };
        }
        return d;
      });
      return changed ? cleaned : prevDesks;
    });
  }, [students]);

  // Auto-sync desks assignedStudentId with ticketing claims
  useEffect(() => {
    if (ticketingState?.claims) {
      setDesks((prevDesks) => {
        let changed = false;
        const newDesks = prevDesks.map((desk) => {
          const claim = ticketingState.claims[desk.id];
          if (claim && desk.assignedStudentId !== claim.studentId) {
            changed = true;
            return { ...desk, assignedStudentId: claim.studentId };
          }
          return desk;
        });
        return changed ? newDesks : prevDesks;
      });
    }
  }, [ticketingState.claims]);

  // Server API Synchronization
  const fetchClassroomData = async () => {
    try {
      const res = await fetch(getApiUrl(`/api/classrooms/${classId}`));
      if (res.ok) {
        const data = await res.json();
        applyServerData(data);
      }
    } catch {
      // API call error fallback
    }
  };

  const saveClassroomDataToServer = async (overrideState?: any) => {
    try {
      const payload = {
        students,
        desks,
        config,
        ticketingState: overrideState || ticketingState,
      };
      const dataStr = JSON.stringify(payload);
      if (dataStr === lastKnownDataRef.current) {
        return; // Data has not changed, suppress redundant save
      }
      lastKnownDataRef.current = dataStr;

      await fetch(getApiUrl(`/api/classrooms/${classId}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: dataStr,
      });
    } catch {
      // Ignore
    }
  };

  // Sync with API Server & connect SSE for real-time live updates
  useEffect(() => {
    fetchClassroomData();

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(getApiUrl(`/api/classrooms/${classId}/stream`));
      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          applyServerData(data);
        } catch {
          // Ignore
        }
      };
    } catch {
      // Ignore
    }

    // Backup polling every 3 seconds
    const interval = setInterval(() => {
      fetchClassroomData();
    }, 3000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, [classId]);

  // Debounced auto-save teacher changes to server (guarded against incoming updates)
  useEffect(() => {
    if (isIncomingServerUpdateRef.current) {
      // State change originated from server broadcast - skip auto-save to break feedback loop
      isIncomingServerUpdateRef.current = false;
      return;
    }

    lastLocalMutationTimeRef.current = Date.now();

    if (!isStudentOnlyMode) {
      const timer = setTimeout(() => {
        saveClassroomDataToServer();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [students, desks, config, ticketingState, classId, isStudentOnlyMode]);

  // Listen for BroadcastChannel & storage events for local tab sync
  useEffect(() => {
    let broadcastChannel: BroadcastChannel | null = null;
    const storageKey = `classroom_ticketing_v1_${classId}`;
    const channelName = `classroom_ticketing_channel_${classId}`;

    try {
      if (typeof BroadcastChannel !== 'undefined') {
        broadcastChannel = new BroadcastChannel(channelName);
        broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'TICKETING_UPDATE' && event.data.payload) {
            setTicketingState((prev) => {
              if (JSON.stringify(prev) === JSON.stringify(event.data.payload)) {
                return prev;
              }
              return event.data.payload;
            });
          }
        };
      }
    } catch {
      // Ignore
    }

    const handleStorageChange = (e: StorageEvent) => {
      if ((e.key === storageKey || e.key === 'classroom_ticketing_v1') && e.newValue) {
        try {
          const newState: TicketingState = JSON.parse(e.newValue);
          setTicketingState((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(newState)) {
              return prev;
            }
            return newState;
          });
        } catch {
          // Ignore
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (broadcastChannel) {
        broadcastChannel.close();
      }
    };
  }, [classId]);

  const handleTabChange = (tab: 'students' | 'layout' | 'assignment' | 'student_ticketing') => {
    if (isStudentOnlyMode && tab !== 'student_ticketing') {
      setIsAdminPasswordModalOpen(true);
      return;
    }
    setActiveTab(tab);
    if (tab === 'student_ticketing') {
      setSystemMode('ticketing');
    }
    try {
      const url = new URL(window.location.href);
      if (tab === 'student_ticketing') {
        url.searchParams.set('mode', 'student_ticketing');
      } else {
        url.searchParams.delete('mode');
        url.searchParams.delete('tab');
        url.searchParams.delete('ticketing');
      }
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Ignore
    }
  };

  const handleRefreshTicketing = async () => {
    try {
      const res = await fetch(getApiUrl(`/api/classrooms/${classId}`));
      if (res.ok) {
        const data = await res.json();
        applyServerData(data);
      }
    } catch {
      try {
        const storageKey = `classroom_ticketing_v1_${classId}`;
        const saved = localStorage.getItem(storageKey) || localStorage.getItem('classroom_ticketing_v1');
        if (saved) {
          const parsed = JSON.parse(saved);
          setTicketingState((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(parsed)) return prev;
            return parsed;
          });
        }
      } catch {
        // Ignore
      }
    }
  };

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
      setTicketingState((prev) => ({
        ...prev,
        claims: {},
        lastUpdated: new Date().toISOString(),
      }));
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

  const handleOpenAdmin = () => {
    if (isAdminMode) {
      setIsAdminPanelOpen(true);
    } else {
      setIsAdminPasswordModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col">
      {/* Top Header Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabChange}
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
        onOpenAdminModal={handleOpenAdmin}
        onOpenAdminPanel={handleOpenAdmin}
        isTicketingOpen={ticketingState.isOpen}
        isStudentOnlyMode={isStudentOnlyMode}
        onTeacherUnlockRequest={() => setIsAdminPasswordModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Step 1: Student List Management */}
        {activeTab === 'students' && (
          <StudentManager
            students={students}
            setStudents={setStudents}
            desks={desks}
            onProceedToLayout={() => handleTabChange('layout')}
            isAdminMode={isAdminMode}
            adminPassword={adminPassword}
            onOpenAdminPanel={handleOpenAdmin}
            onOpenAdminPasswordModal={() => setIsAdminPasswordModalOpen(true)}
            onOpenChangePasswordModal={() => setIsChangePasswordModalOpen(true)}
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
              onProceedToAssignment={() => handleTabChange('assignment')}
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
              onOpenAdminPanel={handleOpenAdmin}
            />
          </div>
        )}

        {/* Step 3: Assignment & Ticketing Mode */}
        {activeTab === 'assignment' && (
          <div className="space-y-6">
            <AssignmentControl
              students={students}
              desks={desks}
              setDesks={setDesks}
              onGoToLayout={() => handleTabChange('layout')}
              systemMode={systemMode}
              setSystemMode={setSystemMode}
              ticketingState={ticketingState}
              setTicketingState={setTicketingState}
              onRefreshTicketing={handleRefreshTicketing}
              onOpenStudentView={() => handleTabChange('student_ticketing')}
              classId={classId}
              onGenerateRandomLink={handleGenerateRandomClassId}
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
              onOpenAdminPanel={handleOpenAdmin}
              ticketingState={ticketingState}
            />
          </div>
        )}

        {/* Step 4: Dedicated Student Ticketing View */}
        {activeTab === 'student_ticketing' && (
          <StudentTicketingView
            students={students}
            desks={desks}
            setDesks={setDesks}
            config={config}
            ticketingState={ticketingState}
            onUpdateTicketingState={setTicketingState}
            onRefreshData={handleRefreshTicketing}
            isStudentOnlyMode={isStudentOnlyMode}
            classId={classId}
            onSwitchToTeacherView={() => {
              if (isStudentOnlyMode) {
                setIsAdminPasswordModalOpen(true);
              } else {
                handleTabChange('assignment');
              }
            }}
          />
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
        adminPassword={adminPassword}
        onResetAdminPassword={() => handleChangeAdminPassword('2580')}
        onSuccess={() => {
          setIsAdminMode(true);
          setIsTeacherUnlocked(true);
          setIsAdminPanelOpen(true);
          soundManager.playFanfare();
        }}
      />

      <AdminPanel
        isOpen={isAdminPanelOpen}
        onClose={() => {
          setIsAdminPanelOpen(false);
          setIsAdminMode(false);
        }}
        students={students}
        setStudents={setStudents}
        desks={desks}
        onExitAdminMode={() => {
          setIsAdminMode(false);
          setIsAdminPanelOpen(false);
        }}
        onOpenChangePasswordModal={() => setIsChangePasswordModalOpen(true)}
      />

      <AdminPasswordChangeModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        adminPassword={adminPassword}
        onChangePassword={handleChangeAdminPassword}
      />

      {/* Footer with Secret Trigger Icon */}
      <footer className="py-4 px-4 text-center text-xs text-slate-500 border-t border-slate-200 bg-white flex items-center justify-center space-x-2">
        <span>교실 자리 배정 및 실시간 티켓팅 시스템 · 칠판(앞) / 창문(좌) / 복도(우) 교실 환경 지원</span>
        <button
          onClick={handleOpenAdmin}
          className="text-slate-300 hover:text-slate-500 transition p-1 rounded"
          title="관리자 설정"
        >
          <KeyRound className="w-3.5 h-3.5" />
        </button>
      </footer>
    </div>
  );
}
