export interface Student {
  id: string;
  name: string;
  gender?: 'male' | 'female' | 'unspecified';
  fixedDeskId?: string | null; // ID of desk if fixed to specific location
  frontRowOnly?: boolean; // Must be placed in front row
  isAbsent?: boolean;
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
  groupPattern: number[]; // e.g. [2, 2, 2] means 2 seats per group (3 분단)
  rowGap: number;
  colGap: number;
  groupGap: number;
  boardPosition: 'top' | 'bottom';
  windowPosition: 'left' | 'right';
  hallwayPosition: 'right' | 'left';
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

export type ShuffleAnimationSpeed = 'instant' | 'fast' | 'dramatic' | 'sequential';
