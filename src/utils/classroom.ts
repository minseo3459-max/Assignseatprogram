import { Desk, Student, ClassroomConfig, AssignmentMode } from '../types';
import { toPng } from 'html-to-image';

export const DEFAULT_STUDENTS: Student[] = [
  { id: 's1', name: '강민준', gender: 'male', pin: '1234' },
  { id: 's2', name: '김서연', gender: 'female', pin: '1234' },
  { id: 's3', name: '박도윤', gender: 'male', pin: '1234' },
  { id: 's4', name: '이하은', gender: 'female', pin: '1234' },
  { id: 's5', name: '정시우', gender: 'male', pin: '1234' },
  { id: 's6', name: '최지우', gender: 'female', pin: '1234' },
  { id: 's7', name: '윤하준', gender: 'male', pin: '1234' },
  { id: 's8', name: '장수아', gender: 'female', pin: '1234' },
  { id: 's9', name: '임건우', gender: 'male', pin: '1234' },
  { id: 's10', name: '한지민', gender: 'female', pin: '1234' },
  { id: 's11', name: '오현우', gender: 'male', pin: '1234' },
  { id: 's12', name: '서아린', gender: 'female', pin: '1234' },
  { id: 's13', name: '신우진', gender: 'male', pin: '1234' },
  { id: 's14', name: '권예은', gender: 'female', pin: '1234' },
  { id: 's15', name: '황지호', gender: 'male', pin: '1234' },
  { id: 's16', name: '송유나', gender: 'female', pin: '1234' },
  { id: 's17', name: '안민재', gender: 'male', pin: '1234' },
  { id: 's18', name: '류하윤', gender: 'female', pin: '1234' },
  { id: 's19', name: '전준서', gender: 'male', pin: '1234' },
  { id: 's20', name: '홍채원', gender: 'female', pin: '1234' },
  { id: 's21', name: '고태양', gender: 'male', pin: '1234' },
  { id: 's22', name: '문다은', gender: 'female', pin: '1234' },
  { id: 's23', name: '양주원', gender: 'male', pin: '1234' },
  { id: 's24', name: '백나은', gender: 'female', pin: '1234' },
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

  // 3. Handle Back Row preference if requested
  const backRowStudents = unassignedStudents.filter((s) => s.backRowOnly);
  if (backRowStudents.length > 0) {
    // Sort available desks by Y coordinate descending (bottom-most/largest Y are back row)
    availableDesks.sort((a, b) => b.y - a.y);

    const shuffledBackStudents = shuffleArray(backRowStudents);

    shuffledBackStudents.forEach((student) => {
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
 * Helper to clean leading row numbers or bullets from name
 */
function cleanStudentName(name: string): string {
  let cleaned = name.trim();
  // Remove leading row number formats: "1.", "01.", "1)", "(1)", "[1]", "1번", "1 -", "1_"
  cleaned = cleaned.replace(/^[\(\[\{]?\d+[\)\]\}]?[\.\_\-\s]*|^\d+번\s*/, '').trim();
  // Remove gender suffixes in parentheses/brackets e.g. "(남)", "[여]"
  cleaned = cleaned.replace(/[\(\[\{\<]?(남|여|남학생|여학생|male|female|m|f)[\)\]\}\>]?/gi, '').trim();
  return cleaned;
}

/**
 * Helper to parse a single token like "1. 김철수(남)" or "이영희"
 */
function parseSingleStudentToken(token: string, idxSeed: number): Student | null {
  if (!token || !token.trim()) return null;

  let gender: 'male' | 'female' | 'unspecified' = 'unspecified';
  if (/(남|남학생|m|male)/i.test(token)) {
    gender = 'male';
  } else if (/(여|여학생|f|female)/i.test(token)) {
    gender = 'female';
  }

  const cleanName = cleanStudentName(token);
  if (!cleanName || /^\d+$/.test(cleanName)) return null; // ignore pure numbers or empty

  return {
    id: `std_${Date.now()}_${idxSeed}_${Math.random().toString(36).substring(2, 6)}`,
    name: cleanName,
    gender,
    pin: '1234',
  };
}

/**
 * Parse bulk text input into Student list (Excel paste, text list, CSV, etc.)
 */
export function parseStudentsFromText(text: string): Student[] {
  if (!text || !text.trim()) return [];

  const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const parsedStudents: Student[] = [];

  let seed = 0;
  for (const line of rawLines) {
    seed++;
    // Skip common header lines if present
    if (/^(번호|이름|성별|성명|no|name|gender|pin|비밀번호)/i.test(line) && (line.includes('\t') || line.includes(',') || line.includes(' '))) {
      const lower = line.toLowerCase();
      if (lower.includes('이름') || lower.includes('name') || lower.includes('성명')) {
        continue;
      }
    }

    // Case 1: Tab-separated (Excel / Google Sheets paste)
    if (line.includes('\t')) {
      const parts = line.split('\t').map((p) => p.trim()).filter((p) => p.length > 0);

      let name = '';
      let gender: 'male' | 'female' | 'unspecified' = 'unspecified';
      let pin = '1234';

      for (const part of parts) {
        if (/^(남|남학생|m|male)$/i.test(part)) {
          gender = 'male';
        } else if (/^(여|여학생|f|female)$/i.test(part)) {
          gender = 'female';
        } else if (/^\d{4,6}$/.test(part) && name.length > 0) {
          pin = part;
        } else if (!/^\d+$/.test(part) && !name) {
          name = part;
        }
      }

      if (!name) {
        const potentialName = parts.find((p) => !/^\d+$/.test(p) && !/^(남|여|m|f|male|female)$/i.test(p));
        if (potentialName) name = potentialName;
      }

      if (name) {
        const cleanName = cleanStudentName(name);
        if (cleanName && !/^\d+$/.test(cleanName)) {
          parsedStudents.push({
            id: `std_${Date.now()}_${seed}_${Math.random().toString(36).substring(2, 6)}`,
            name: cleanName,
            gender,
            pin,
          });
          continue;
        }
      }
    }

    // Case 2: Line contains comma or semicolon separated names
    const delimiterSplit = line.split(/[,;]+/).map((item) => item.trim()).filter((item) => item.length > 0);
    if (delimiterSplit.length > 1) {
      for (const item of delimiterSplit) {
        seed++;
        const student = parseSingleStudentToken(item, seed);
        if (student) parsedStudents.push(student);
      }
      continue;
    }

    // Case 3: Single line name or space-separated names
    const singleStudent = parseSingleStudentToken(line, seed);
    if (singleStudent) {
      parsedStudents.push(singleStudent);
    } else {
      const spaceParts = line.split(/\s+/).map((p) => p.trim()).filter((p) => p.length > 0);
      for (const part of spaceParts) {
        seed++;
        const s = parseSingleStudentToken(part, seed);
        if (s) parsedStudents.push(s);
      }
    }
  }

  return parsedStudents;
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
