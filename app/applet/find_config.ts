import { execSync } from 'child_process';
try {
  const log = execSync('git log -p --all', { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 50 });
  const lines = log.split('\n');
  let found = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('firebaseConfig') || lines[i].includes('apiKey')) {
      console.log(lines.slice(Math.max(0, i-5), i+15).join('\n'));
      found = true;
    }
  }
  if (!found) console.log("Not found inside git logs");
} catch (e) {
  console.log("Error", e.message);
}
