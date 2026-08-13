export interface Student {
  id: string;
  name: string;
  gender?: 'male' | 'female' | 'unspecified';
  fixedDeskId?: string | null; // ID of desk if fixed to specific location
  frontRowOnly?: boolean; // Must be placed in front row
  backRowOnly?: boolean; // Must be placed in back row
  isAbsent?: boolean;
  pin?: string; // 4-digit PIN for anti-impersonation verification
}

export interface Position {
  x: number; // grid column or pixel X
  y: number; // grid row or pixel Y
}

export interface Desk {
  id: string;
  label: string; // e.g., "1", "A1"
  x: number; // pixel or grid coordinate X
  y: number; // pixel or grid coordinate Y
  width?: number;
  height?: number;
  assignedStudentId?: string | null;
  isLocked?: boolean; // locked from auto-assignment
  sectionId?: number; // 분단 번호 (1분단, 2분단 ...)
}

export interface ClassroomConfig {
  id: string;
  name: string;
  rows: number;
  cols: number;
  groupPattern: number[]; // e.g. [2, 2, 2] means 2 seats per group
  rowGap: number;
  colGap: number;
  groupGap: number;
  boardPosition: 'top' | 'bottom';
  windowPosition: 'left' | 'right';
  hallwayPosition: 'right' | 'left';
  layoutType?: 'pairs' | 'singles' | 'group' | 'free';
  groupSize?: number; // Default 4 for 모둠형 (group mode)
}

export interface ClassroomPreset {
  id: string;
  title: string;
  updatedAt: string;
  students: Student[];
  desks: Desk[];
  config: ClassroomConfig;
}

export type AssignmentMode = 'random' | 'gender_alternate' | 'front_preference';

export type SystemMode = 'random' | 'ticketing';

export type ShuffleAnimationSpeed = 'instant' | 'fast' | 'dramatic' | 'sequential';

export interface TicketingClaim {
  studentId: string;
  studentName: string;
  claimedAt: string;
}

export interface TicketingState {
  isOpen: boolean;
  claims: Record<string, TicketingClaim>; // key: deskId
  lastUpdated: string;
}
