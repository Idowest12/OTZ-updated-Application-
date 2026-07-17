import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Database from 'better-sqlite3';
import cors from 'cors';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = 'local-offline-secret-key-change-me';

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // Initialize SQLite
  const db = new Database('./database.sqlite');

  // Create Tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password TEXT,
      displayName TEXT,
      role TEXT,
      createdAt TEXT,
      lastLogin TEXT
    );
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      data TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );
    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY,
      patientId TEXT,
      data TEXT,
      date TEXT,
      createdAt TEXT
    );
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      patientId TEXT,
      data TEXT,
      date TEXT,
      createdAt TEXT
    );
    CREATE TABLE IF NOT EXISTS counseling_tracks (
      id TEXT PRIMARY KEY,
      patientId TEXT,
      data TEXT,
      completed INTEGER,
      createdAt TEXT
    );
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      data TEXT,
      timestamp TEXT
    );
  `);

  // Create default admin if not exists
  const adminExists = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@otzclinic.com');
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123456', 10);
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO users (id, email, password, displayName, role, createdAt, lastLogin) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(uuidv4(), 'admin@otzclinic.com', hashedPassword, 'Local Admin', 'admin', now, now);
  }

  // Auth Routes
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
    
    const now = new Date().toISOString();
    db.prepare('UPDATE users SET lastLogin = ? WHERE id = ?').run(now, user.id);

    res.json({ token, user: { uid: user.id, email: user.email, displayName: user.displayName, role: user.role } });
  });

  app.get('/api/auth/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const user = db.prepare('SELECT id as uid, email, displayName, role FROM users WHERE id = ?').get(decoded.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user });
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  // Export Data Endpoint
  app.get('/api/export', async (req, res) => {
    try {
      const data = {
        patients: db.prepare('SELECT * FROM patients').all(),
        visits: db.prepare('SELECT * FROM visits').all(),
        appointments: db.prepare('SELECT * FROM appointments').all(),
        counseling_tracks: db.prepare('SELECT * FROM counseling_tracks').all(),
        activity_logs: db.prepare('SELECT * FROM activity_logs').all()
      };
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: 'Export failed: ' + err.message });
    }
  });

  // Import Data Endpoint
  app.post('/api/import', async (req, res) => {
    try {
      const { patients, visits, appointments, counseling_tracks, activity_logs } = req.body;
      
      const insertData = (collectionName: string, items: any[], insertQuery: string) => {
        if (!items || !items.length) return;
        const stmt = db.prepare(insertQuery);
        const insertMany = db.transaction((rows) => {
          for (const row of rows) {
            try {
              if (collectionName === 'patients') {
                stmt.run(row.id, row.data, row.createdAt, row.updatedAt);
              } else if (collectionName === 'visits' || collectionName === 'appointments') {
                stmt.run(row.id, row.patientId, row.data, row.date, row.createdAt);
              } else if (collectionName === 'counseling_tracks') {
                stmt.run(row.id, row.patientId, row.data, row.completed || 0, row.createdAt);
              } else if (collectionName === 'activity_logs') {
                stmt.run(row.id, row.data, row.timestamp);
              }
            } catch (e: any) {
              if (e.message.includes('UNIQUE constraint failed')) {
                // Skip existing logic handled mostly by IGNORE if supported or we can just ignore
                console.log(`Duplicate found for ${row.id} in ${collectionName}`);
              } else {
                throw e;
              }
            }
          }
        });
        insertMany(items);
      };

      if (patients) insertData('patients', patients, 'INSERT OR REPLACE INTO patients (id, data, createdAt, updatedAt) VALUES (?, ?, ?, ?)');
      if (visits) insertData('visits', visits, 'INSERT OR REPLACE INTO visits (id, patientId, data, date, createdAt) VALUES (?, ?, ?, ?, ?)');
      if (appointments) insertData('appointments', appointments, 'INSERT OR REPLACE INTO appointments (id, patientId, data, date, createdAt) VALUES (?, ?, ?, ?, ?)');
      if (counseling_tracks) insertData('counseling_tracks', counseling_tracks, 'INSERT OR REPLACE INTO counseling_tracks (id, patientId, data, completed, createdAt) VALUES (?, ?, ?, ?, ?)');
      if (activity_logs) insertData('activity_logs', activity_logs, 'INSERT OR REPLACE INTO activity_logs (id, data, timestamp) VALUES (?, ?, ?)');

      res.json({ message: 'Import successful' });
      
      // Notify clients
      io.emit('patients_update', []); // Client re-fetches upon this usually, or we can broadcast real updates
      // The local socket logic sends the full array on next subscribe. We can trigger a quick reload signal
      io.emit('data_imported');

    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Import failed: ' + err.message });
    }
  });

  // Socket.io for Real-time data
  io.on('connection', (socket) => {
    console.log('Client connected');

    const broadcastUpdate = (collection: string) => {
      let rows: any[] = [];
      if (collection === 'patients') {
        rows = db.prepare('SELECT * FROM patients ORDER BY createdAt DESC').all();
      } else if (collection === 'visits') {
        rows = db.prepare('SELECT * FROM visits ORDER BY date DESC').all();
      } else if (collection === 'appointments') {
        rows = db.prepare('SELECT * FROM appointments ORDER BY date ASC').all();
      } else if (collection === 'counseling_tracks') {
        rows = db.prepare('SELECT * FROM counseling_tracks ORDER BY createdAt DESC').all();
      } else if (collection === 'activity_logs') {
        rows = db.prepare('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 100').all();
      } else if (collection === 'users') {
        rows = db.prepare('SELECT id as uid, email, displayName, role, createdAt, lastLogin FROM users ORDER BY createdAt DESC').all();
      }
      
      const parsedData = rows.map(r => ({
        id: r.id || r.uid,
        ...JSON.parse(r.data || '{}'),
        ...(r.uid ? { uid: r.uid, email: r.email, displayName: r.displayName, role: r.role } : {})
      }));
      
      io.emit(`${collection}_update`, parsedData);
    };

    // Initial data load
    socket.on('subscribe', (collection) => {
      broadcastUpdate(collection);
    });

    // Handle CRUD operations
    socket.on('add_document', ({ collection, data }) => {
      const id = uuidv4();
      const now = new Date().toISOString();
      const dataStr = JSON.stringify(data);
      
      if (collection === 'patients') {
        db.prepare('INSERT INTO patients (id, data, createdAt, updatedAt) VALUES (?, ?, ?, ?)').run(id, dataStr, now, now);
      } else if (collection === 'visits') {
        db.prepare('INSERT INTO visits (id, patientId, data, date, createdAt) VALUES (?, ?, ?, ?, ?)').run(id, data.patientId, dataStr, data.date, now);
      } else if (collection === 'appointments') {
        db.prepare('INSERT INTO appointments (id, patientId, data, date, createdAt) VALUES (?, ?, ?, ?, ?)').run(id, data.patientId, dataStr, data.date, now);
      } else if (collection === 'counseling_tracks') {
        db.prepare('INSERT INTO counseling_tracks (id, patientId, data, completed, createdAt) VALUES (?, ?, ?, ?, ?)').run(id, data.patientId, dataStr, data.completed ? 1 : 0, now);
      } else if (collection === 'activity_logs') {
        db.prepare('INSERT INTO activity_logs (id, data, timestamp) VALUES (?, ?, ?)').run(id, dataStr, data.timestamp || now);
      }
      
      broadcastUpdate(collection);
      socket.emit('operation_success', { id });
    });

    socket.on('update_document', ({ collection, id, data }) => {
      const now = new Date().toISOString();
      
      // Fetch existing
      const existing: any = db.prepare(`SELECT data FROM ${collection} WHERE id = ?`).get(id);
      if (!existing) return;
      
      const mergedData = { ...JSON.parse(existing.data), ...data };
      const dataStr = JSON.stringify(mergedData);

      if (collection === 'patients') {
        db.prepare('UPDATE patients SET data = ?, updatedAt = ? WHERE id = ?').run(dataStr, now, id);
      } else if (collection === 'visits') {
        db.prepare('UPDATE visits SET data = ?, date = ? WHERE id = ?').run(dataStr, mergedData.date, id);
      } else if (collection === 'appointments') {
        db.prepare('UPDATE appointments SET data = ?, date = ? WHERE id = ?').run(dataStr, mergedData.date, id);
      } else if (collection === 'counseling_tracks') {
        db.prepare('UPDATE counseling_tracks SET data = ?, completed = ? WHERE id = ?').run(dataStr, mergedData.completed ? 1 : 0, id);
      }
      
      broadcastUpdate(collection);
    });

    socket.on('delete_document', ({ collection, id }) => {
      db.prepare(`DELETE FROM ${collection} WHERE id = ?`).run(id);
      broadcastUpdate(collection);
    });

    socket.on('clear_collection', ({ collection }) => {
      db.prepare(`DELETE FROM ${collection}`).run();
      broadcastUpdate(collection);
    });

    socket.on('graduate_patients', () => {
      const now = new Date().toISOString();
      const patients: any[] = db.prepare('SELECT * FROM patients').all();
      for (const p of patients) {
        const data = JSON.parse(p.data);
        if (data.age >= 25 && data.ltfuStatus === 'Active') {
          data.ltfuStatus = 'Graduating';
          db.prepare('UPDATE patients SET data = ?, updatedAt = ? WHERE id = ?').run(JSON.stringify(data), now, p.id);
        }
      }
      broadcastUpdate('patients');
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
