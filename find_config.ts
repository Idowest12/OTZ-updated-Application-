import { execSync } from 'child_process';
try {
  const result = execSync('git log -p --all | grep -i "firestoreDatabaseId" -A 5 -B 5', { encoding: 'utf-8' });
  console.log(result);
} catch (e) {
  console.error("No config found or error", e.message);
}
