import { Desk, Student, ClassroomConfig, AssignmentMode } from '../types';
import { toPng } from 'html-to-image';

export const DEFAULT_STUDENTS: Student[] = [
  { id: 's1', name: '강민준', gender: 'male' },
  { id: 's2', name: '김서연', gender: 'female' },
  { id: 's3', name: '박도윤', gender: 'male' },
  { id: 's4', name: '이하은', gender: 'female' },
  { id: 's5', name: '정시우', gender: 'male' },
  { id: 's6', name: '최지우', gender: 'female' },
  { id: 's7', name: '윤하준', gender: 'male' },
  { id: 's8', name: '장수아', gender: 'female' },
  { id: 's9', name: '임건우', gender: 'male' },
  { id: 's10', name: '한지민', gender: 'female' },
  { id: 's11', name: '오현우', gender: 'male' },
  { id: 's12', name: '서아린', gender: 'female' },
  { id: 's13', name: '신우진', gender: 'male' },
  { id: 's14', name: '권예은', gender: 'female' },
  { id: 's15', name: '황지호', gender: 'male' },
  { id: 's16', name: '송유나', gender: 'female' },
  { id: 's17', name: '안민재', gender: 'male' },
  { id: 's18', name: '류하윤', gender: 'female' },
  { id: 's19', name: '전준서', gender: 'male' },
  { id: 's20', name: '홍채원', gender: 'female' },
  { id: 's21', name: '고태양', gender: 'male' },
  { id: 's22', name: '문다은', gender: 'female' },
  { id: 's23', name: '양주원', gender: 'male' },
  { id: 's24', name: '백나은', gender: 'female' },
];

export const DEFAULT_CONFIG: ClassroomConfig = {
  id: 'cfg_default',
  name: '기본 24명 배치 (3분단 2열)',
  rows: 4,
  cols: 6,
  groupPattern: [2, 2, 2], // 3 groups of 2 desks
  rowGap: 80,
  colGap: 8, // tight gap within same group
  groupGap: 38, // wider gap between groups (aisles)
  boardPosition: 'top',
  windowPosition: 'left',
  hallwayPosition: 'right',
};

export const DESK_WIDTH = 110;
export const DESK_HEIGHT = 68;

/**
 * Generate desks based on configuration grid logic
 */
export function generateDesksFromConfig(config: ClassroomConfig): Desk[] {
  const { rows, cols, groupPattern, rowGap, colGap, groupGap } = config;
  const desks: Desk[] = [];

  const startX = 40;
  const startY = 40;

  let deskCounter = 1;

  for (let r = 0; r < rows; r++) {
    let currentX = startX;

    let colIndex = 0;
    groupPattern.forEach((groupSize, groupIdx) => {
      for (let c = 0; c < groupSize; c++) {
        if (colIndex >= cols) break;

        const deskX = currentX;
        const deskY = startY + r * (DESK_HEIGHT + rowGap);

        desks.push({
          id: `desk_${r}_${colIndex}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          label: `${deskCounter}번`,
          x: deskX,
          y: deskY,
          width: DESK_WIDTH,
          height: DESK_HEIGHT,
          assignedStudentId: null,
          sectionId: groupIdx + 1,
        });

        deskCounter++;
        colIndex++;

        // Add tight gap between seats in the same group
        if (c < groupSize - 1) {
          currentX += DESK_WIDTH + colGap;
        } else {
          // Add group aisle gap after group completes
          currentX += DESK_WIDTH + groupGap;
        }
      }
    });
  }

  return desks;
}

/**
 * Fisher-Yates shuffle array helper
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Perform intelligent random assignment respecting locks and preferences
 */
export function assignSeatsRandomly(
  students: Student[],
  desks: Desk[],
  mode: AssignmentMode = 'random'
): Map<string, string | null> {
  // Result map: deskId -> studentId (or null)
  const assignmentMap = new Map<string, string | null>();

  // Filter out absent students
  const activeStudents = students.filter((s) => !s.isAbsent);

  // Initialize all desks as unassigned or keep locked assignments
  const availableDesks: Desk[] = [];
  const assignedStudentIds = new Set<string>();

  desks.forEach((desk) => {
    if (desk.isLocked && desk.assignedStudentId) {
      assignmentMap.set(desk.id, desk.assignedStudentId);
      assignedStudentIds.add(desk.assignedStudentId);
    } else {
      assignmentMap.set(desk.id, null);
      availableDesks.push(desk);
    }
  });

  // Students needing placement
  let unassignedStudents = activeStudents.filter((s) => !assignedStudentIds.has(s.id));

  // 1. Handle Fixed Desk requests for students (Admin Pre-assigned seats)
  unassignedStudents.forEach((student) => {
    if (student.fixedDeskId) {
      // Find desk matching fixedDeskId by id or label
      const targetDesk = availableDesks.find(
        (d) => (d.id === student.fixedDeskId || d.label === student.fixedDeskId) && assignmentMap.get(d.id) === null
      );

      if (targetDesk) {
        assignmentMap.set(targetDesk.id, student.id);
        assignedStudentIds.add(student.id);
        // Remove this desk from available
        const idx = availableDesks.findIndex((d) => d.id === targetDesk.id);
        if (idx !== -1) availableDesks.splice(idx, 1);
      }
    }
  });

  unassignedStudents = activeStudents.filter((s) => !assignedStudentIds.has(s.id));

  // 2. Handle Front Row preference if requested
  const frontRowStudents = unassignedStudents.filter((s) => s.frontRowOnly);
  if (frontRowStudents.length > 0) {
    // Sort available desks by Y coordinate ascending (top-most are front row)
    availableDesks.sort((a, b) => a.y - b.y);

    const shuffledFrontStudents = shuffleArray(frontRowStudents);

    shuffledFrontStudents.forEach((student) => {
      if (availableDesks.length > 0) {
        const desk = availableDesks.shift()!;
        assignmentMap.set(desk.id, student.id);
        assignedStudentIds.add(student.id);
      }
    });

    unassignedStudents = activeStudents.filter((s) => !assignedStudentIds.has(s.id));
  }

  // 3. Gender Alternate Mode vs Random Mode
  if (mode === 'gender_alternate') {
    const males = shuffleArray(unassignedStudents.filter((s) => s.gender === 'male'));
    const females = shuffleArray(unassignedStudents.filter((s) => s.gender === 'female'));
    const unspecified = shuffleArray(unassignedStudents.filter((s) => !s.gender || s.gender === 'unspecified'));

    // Sort available desks left-to-right, top-to-bottom
    availableDesks.sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));

    let maleIdx = 0;
    let femaleIdx = 0;
    let unspecIdx = 0;

    availableDesks.forEach((desk, index) => {
      let selectedStudent: Student | null = null;

      // Alternating index pattern
      const preferMale = index % 2 === 0;

      if (preferMale && maleIdx < males.length) {
        selectedStudent = males[maleIdx++];
      } else if (!preferMale && femaleIdx < females.length) {
        selectedStudent = females[femaleIdx++];
      } else if (maleIdx < males.length) {
        selectedStudent = males[maleIdx++];
      } else if (femaleIdx < females.length) {
        selectedStudent = females[femaleIdx++];
      } else if (unspecIdx < unspecified.length) {
        selectedStudent = unspecified[unspecIdx++];
      }

      if (selectedStudent) {
        assignmentMap.set(desk.id, selectedStudent.id);
        assignedStudentIds.add(selectedStudent.id);
      }
    });
  } else {
    // Pure Random Assignment
    const shuffledStudents = shuffleArray(unassignedStudents);
    const shuffledDesks = shuffleArray(availableDesks);

    shuffledDesks.forEach((desk, idx) => {
      if (idx < shuffledStudents.length) {
        const student = shuffledStudents[idx];
        assignmentMap.set(desk.id, student.id);
      }
    });
  }

  return assignmentMap;
}

/**
 * Perform a temporary, unconstrained random assignment for shuffle preview ticks during animation.
 * Ignores fixedDeskId and isLocked constraints so all desks cycle through random names during the shuffle animation.
 */
export function generateShuffleTickAssignment(
  students: Student[],
  desks: Desk[]
): Map<string, string | null> {
  const assignmentMap = new Map<string, string | null>();
  const activeStudents = students.filter((s) => !s.isAbsent);

  const shuffledStudents = shuffleArray(activeStudents);
  const shuffledDesks = shuffleArray(desks);

  shuffledDesks.forEach((desk, idx) => {
    if (idx < shuffledStudents.length) {
      assignmentMap.set(desk.id, shuffledStudents[idx].id);
    } else {
      assignmentMap.set(desk.id, null);
    }
  });

  return assignmentMap;
}

/**
 * Parse bulk text input into Student list
 */
export function parseStudentsFromText(text: string): Student[] {
  const lines = text
    .split(/[\n,;\t]+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines.map((name, idx) => {
    let gender: 'male' | 'female' | 'unspecified' = 'unspecified';
    let cleanName = name;

    // Optional tags in text like "김철수(남)" or "이영희[여]"
    if (/(남|m|male)/i.test(name)) {
      gender = 'male';
      cleanName = name.replace(/[\(\[\{]?(남|m|male)[\)\]\}]?/gi, '').trim();
    } else if (/(여|f|female)/i.test(name)) {
      gender = 'female';
      cleanName = name.replace(/[\(\[\{]?(여|f|female)[\)\]\}]?/gi, '').trim();
    }

    return {
      id: `std_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      name: cleanName || name,
      gender,
    };
  });
}

/**
 * Export element to Image PNG and trigger download
 */
export async function downloadElementAsImage(
  element: HTMLElement,
  filename: string = '교실_자리_배정표.png'
): Promise<void> {
  try {
    const dataUrl = await toPng(element, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: '#f8fafc',
      cacheBust: true,
      style: {
        borderRadius: '0px',
      },
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.error('Failed to export image:', err);
    throw err;
  }
}
