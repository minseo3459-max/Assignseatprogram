import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

interface TicketingClaim {
  studentId: string;
  studentName: string;
  claimedAt: string;
}

interface TicketingState {
  isOpen: boolean;
  claims: Record<string, TicketingClaim>;
  lastUpdated: string;
}

interface ClassroomData {
  classId: string;
  students?: any[];
  desks?: any[];
  config?: any;
  ticketingState: TicketingState;
  lastUpdated: string;
}

const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = path.join(process.cwd(), 'classrooms_data.json');

// In-memory classroom database
const classrooms = new Map<string, ClassroomData>();

// Load initial data from disk if exists
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    Object.keys(parsed).forEach((key) => {
      classrooms.set(key, parsed[key]);
    });
    console.log(`[Server] Loaded ${classrooms.size} classroom(s) from disk.`);
  }
} catch (err) {
  console.error('[Server] Failed to load classrooms data file:', err);
}

// Helper to persist classrooms to disk
function saveToDisk() {
  try {
    const obj: Record<string, ClassroomData> = {};
    classrooms.forEach((val, key) => {
      obj[key] = val;
    });
    fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Server] Failed to save classrooms data file:', err);
  }
}

// Connected SSE clients for real-time streaming updates
const sseClients = new Map<string, Set<express.Response>>();

function broadcastToClass(classId: string, payload: any) {
  const clients = sseClients.get(classId);
  if (clients) {
    const dataStr = `data: ${JSON.stringify(payload)}\n\n`;
    clients.forEach((res) => {
      try {
        res.write(dataStr);
      } catch {
        // Client disconnected
      }
    });
  }
}

async function startServer() {
  const app = express();

  // Enable CORS for cross-origin requests (Vercel, Electron, local apps)
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  // 1. Get classroom state by classId
  app.get('/api/classrooms/:classId', (req, res) => {
    const { classId } = req.params;
    let existing = classrooms.get(classId);
    if (!existing) {
      existing = {
        classId,
        students: [],
        desks: [],
        config: null,
        ticketingState: { isOpen: true, claims: {}, lastUpdated: new Date().toISOString() },
        lastUpdated: new Date().toISOString(),
      };
      classrooms.set(classId, existing);
      saveToDisk();
    }
    return res.json(existing);
  });

  // 2. Save / Update full classroom state
  app.post('/api/classrooms/:classId', (req, res) => {
    const { classId } = req.params;
    const { students, desks, config, ticketingState } = req.body;

    const current = classrooms.get(classId) || {
      classId,
      ticketingState: { isOpen: true, claims: {}, lastUpdated: new Date().toISOString() },
      lastUpdated: new Date().toISOString(),
    };

    const updated: ClassroomData = {
      ...current,
      classId,
      students: students ?? current.students,
      desks: desks ?? current.desks,
      config: config ?? current.config,
      ticketingState: ticketingState ?? current.ticketingState,
      lastUpdated: new Date().toISOString(),
    };

    classrooms.set(classId, updated);
    saveToDisk();
    broadcastToClass(classId, updated);

    return res.json({ success: true, classroom: updated });
  });

  // 3. Atomic Seat Claim / Swap / Cancel API endpoint for students
  app.post('/api/classrooms/:classId/claim', (req, res) => {
    const { classId } = req.params;
    const { studentId, studentName, deskId, action, oldDeskId } = req.body;

    let classroom = classrooms.get(classId);
    if (!classroom) {
      classroom = {
        classId,
        students: [],
        desks: [],
        config: null,
        ticketingState: { isOpen: true, claims: {}, lastUpdated: new Date().toISOString() },
        lastUpdated: new Date().toISOString(),
      };
      classrooms.set(classId, classroom);
    }

    if (!classroom.ticketingState.isOpen) {
      return res.status(400).json({ success: false, error: '현재 티켓팅이 마감되어 있습니다.' });
    }

    const claims = { ...classroom.ticketingState.claims };

    if (action === 'claim' || action === 'swap') {
      // Check if target desk is already claimed by someone else
      const existingClaim = claims[deskId];
      if (existingClaim && existingClaim.studentId !== studentId) {
        return res.status(409).json({
          success: false,
          error: `⚠️ 방금 ${existingClaim.studentName} 학생이 이 자리를 선택했습니다! 다른 빈 자리를 선택해주세요.`,
          ticketingState: classroom.ticketingState,
        });
      }

      // Remove old desk claim if changing seats
      if (oldDeskId && claims[oldDeskId]) {
        delete claims[oldDeskId];
      }
      // Remove any previous claim for this student
      Object.keys(claims).forEach((dId) => {
        if (claims[dId].studentId === studentId) {
          delete claims[dId];
        }
      });

      const nowStr = new Date().toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      claims[deskId] = {
        studentId,
        studentName,
        claimedAt: nowStr,
      };
    } else if (action === 'cancel') {
      if (deskId && claims[deskId]) {
        delete claims[deskId];
      }
      // Remove any claim by this student
      Object.keys(claims).forEach((dId) => {
        if (claims[dId].studentId === studentId) {
          delete claims[dId];
        }
      });
    }

    // Sync desks assignedStudentId
    let updatedDesks = classroom.desks ? [...classroom.desks] : [];
    if (updatedDesks.length > 0) {
      updatedDesks = updatedDesks.map((d) => {
        const c = claims[d.id];
        return {
          ...d,
          assignedStudentId: c ? c.studentId : null,
        };
      });
    }

    const updatedState: TicketingState = {
      ...classroom.ticketingState,
      claims,
      lastUpdated: new Date().toISOString(),
    };

    const updatedClassroom: ClassroomData = {
      ...classroom,
      desks: updatedDesks,
      ticketingState: updatedState,
      lastUpdated: new Date().toISOString(),
    };

    classrooms.set(classId, updatedClassroom);
    saveToDisk();
    broadcastToClass(classId, updatedClassroom);

    return res.json({
      success: true,
      ticketingState: updatedState,
      desks: updatedDesks,
    });
  });

  // 4. Reset claims
  app.post('/api/classrooms/:classId/reset-claims', (req, res) => {
    const { classId } = req.params;
    const classroom = classrooms.get(classId);
    if (!classroom) {
      return res.status(404).json({ success: false, error: '학급을 찾을 수 없습니다.' });
    }

    const updatedState: TicketingState = {
      ...classroom.ticketingState,
      claims: {},
      lastUpdated: new Date().toISOString(),
    };

    let updatedDesks = classroom.desks ? [...classroom.desks] : [];
    updatedDesks = updatedDesks.map((d) => ({ ...d, assignedStudentId: null }));

    const updatedClassroom: ClassroomData = {
      ...classroom,
      desks: updatedDesks,
      ticketingState: updatedState,
      lastUpdated: new Date().toISOString(),
    };

    classrooms.set(classId, updatedClassroom);
    saveToDisk();
    broadcastToClass(classId, updatedClassroom);

    return res.json({ success: true, classroom: updatedClassroom });
  });

  // 5. SSE Real-time Streaming endpoint
  app.get('/api/classrooms/:classId/stream', (req, res) => {
    const { classId } = req.params;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    if (!sseClients.has(classId)) {
      sseClients.set(classId, new Set());
    }
    sseClients.get(classId)!.add(res);

    // Send initial snapshot
    let current = classrooms.get(classId);
    if (!current) {
      current = {
        classId,
        students: [],
        desks: [],
        config: null,
        ticketingState: { isOpen: true, claims: {}, lastUpdated: new Date().toISOString() },
        lastUpdated: new Date().toISOString(),
      };
      classrooms.set(classId, current);
      saveToDisk();
    }
    res.write(`data: ${JSON.stringify(current)}\n\n`);

    // Keep-alive ping every 15 seconds
    const pingInterval = setInterval(() => {
      try {
        res.write(': keep-alive\n\n');
      } catch {
        // Disconnected
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(pingInterval);
      const set = sseClients.get(classId);
      if (set) {
        set.delete(res);
        if (set.size === 0) {
          sseClients.delete(classId);
        }
      }
    });
  });

  // Serve Vite in dev mode or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
