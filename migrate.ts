// Firebase Migration Script
// This script connects to your LIVE Firebase database, reads all records,
// and saves them directly into your new OFFLINE SQLite database.

import Database from 'better-sqlite3';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
// IMPORTANT: Please PASTE your Firebase configuration object here
// You can copy this from your original firebase-applet-config.json or firebase.ts file
const firebaseConfig = {
  apiKey: "AIzaSyBRbymmmusPZPXgFvsMU0FAI3vLsTeSQ4w",
  authDomain: "otz-dummy-system.firebaseapp.com",
  projectId: "otz-dummy-system",
  storageBucket: "otz-dummy-system.firebasestorage.app",
  messagingSenderId: "968979776916",
  appId: "1:968979776916:web:cd7a569ef66f726dbd7b81"
};

// --- DO NOT EDIT BELOW THIS LINE ---

async function migrateData() {
  console.log("Starting Data Migration...");

  // 1. Connect to SQLite
  const dbPath = path.resolve('./database.sqlite');
  console.log(`Connecting to local database at: ${dbPath}`);
  const db = new Database(dbPath);

  // 2. Connect to Firebase
  console.log("Connecting to Firebase...");
  const app = initializeApp(firebaseConfig);
  const firestore = getFirestore(app, "ai-studio-281f10b3-4390-447c-abb6-0c7eac385ddd");

  const collections = ['patients', 'visits', 'appointments', 'counseling_tracks', 'activity_logs'];

  for (const collName of collections) {
    console.log(`\nFetching ${collName} from Firebase...`);
    try {
      const querySnapshot = await getDocs(collection(firestore, collName));
      const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`Found ${records.length} records in ${collName}.`);

      if (records.length > 0) {
        let inserted = 0;
        
        for (const record of records) {
            const { id, ...data } = record;
            const dataStr = JSON.stringify(data);
            const now = new Date().toISOString();
            
            try {
                // Check if exists
                const exists = db.prepare(`SELECT id FROM ${collName} WHERE id = ?`).get(id);
                if (!exists) {
                    if (collName === 'patients') {
                        db.prepare('INSERT INTO patients (id, data, createdAt, updatedAt) VALUES (?, ?, ?, ?)').run(id, dataStr, record.createdAt || now, record.updatedAt || now);
                    } else if (collName === 'visits') {
                        db.prepare('INSERT INTO visits (id, patientId, data, date, createdAt) VALUES (?, ?, ?, ?, ?)').run(id, record.patientId || null, dataStr, record.date || now, record.createdAt || now);
                    } else if (collName === 'appointments') {
                        db.prepare('INSERT INTO appointments (id, patientId, data, date, createdAt) VALUES (?, ?, ?, ?, ?)').run(id, record.patientId || null, dataStr, record.date || now, record.createdAt || now);
                    } else if (collName === 'counseling_tracks') {
                        db.prepare('INSERT INTO counseling_tracks (id, patientId, data, completed, createdAt) VALUES (?, ?, ?, ?, ?)').run(id, record.patientId || null, dataStr, record.completed ? 1 : 0, record.createdAt || now);
                    } else if (collName === 'activity_logs') {
                        db.prepare('INSERT INTO activity_logs (id, data, timestamp) VALUES (?, ?, ?)').run(id, dataStr, record.timestamp || now);
                    }
                    inserted++;
                }
            } catch (err) {
                 console.error(`Error inserting record ${id} into ${collName}:`, err);
            }
        }
        console.log(`✅ Successfully imported ${inserted} new records into local ${collName} table.`);
      }
    } catch (error) {
      console.error(`❌ Error migrating collection ${collName}:`, error);
    }
  }

  console.log("\n🎉 Migration Complete! All available data has been ported.");
  console.log("You can now safely restart your local offline server (npm run dev).");
  process.exit(0);
}

// Make sure users add their config
if (!firebaseConfig.apiKey) {
    console.error("\n❌ ERROR: You must paste your Firebase configuration into migrate.js before running it!");
    process.exit(1);
}

migrateData().catch(console.error);
