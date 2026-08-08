import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const dependencies = [
  { name: 'yt-dlp', command: 'yt-dlp --version' },
  { name: 'ffmpeg', command: 'ffmpeg -version' },
  { name: 'ffprobe', command: 'ffprobe -version' },
];

console.log('--- Checking Dependencies ---');

let allOk = true;

for (const dep of dependencies) {
  try {
    const output = execSync(dep.command, { stdio: 'pipe' }).toString().split('\n')[0];
    console.log(`✅ ${dep.name} found: ${output}`);
  } catch {
    console.error(`❌ ${dep.name} not found or error executing command.`);
    allOk = false;
  }
}

// Check temp directory
const tempDir = path.resolve(process.cwd(), '.tmp/media');
try {
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log(`✅ Created temp directory: ${tempDir}`);
  } else {
    console.log(`✅ Temp directory exists: ${tempDir}`);
  }
  fs.accessSync(tempDir, fs.constants.W_OK);
  console.log(`✅ Temp directory is writable`);
} catch (error) {
  console.error(`❌ Error with temp directory: ${error.message}`);
  allOk = false;
}

if (!allOk) {
  console.error('\n--- Dependencies check failed! ---');
  process.exit(1);
} else {
  console.log('\n--- All dependencies are OK! ---');
}
