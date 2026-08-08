import fs from 'fs';
import path from 'path';

const MEDIA_TEMP_DIR = path.resolve(process.cwd(), '.tmp/media');
const JOB_TTL_MINUTES = 60; // Default to 60 if env not loaded

console.log('--- Cleaning Up Temp Files ---');

if (!fs.existsSync(MEDIA_TEMP_DIR)) {
  console.log('Media temp directory does not exist. Skipping.');
  process.exit(0);
}

const now = Date.now();
const ttlMs = JOB_TTL_MINUTES * 60 * 1000;

try {
  const items = fs.readdirSync(MEDIA_TEMP_DIR);
  let deletedCount = 0;

  for (const item of items) {
    const itemPath = path.join(MEDIA_TEMP_DIR, item);
    const stats = fs.statSync(itemPath);

    if (now - stats.mtimeMs > ttlMs) {
      if (stats.isDirectory()) {
        fs.rmSync(itemPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(itemPath);
      }
      deletedCount++;
      console.log(`🗑️ Deleted: ${item}`);
    }
  }

  console.log(`\n--- Cleanup finished. Deleted ${deletedCount} items. ---`);
} catch (error) {
  console.error(`❌ Error during cleanup: ${error.message}`);
  process.exit(1);
}
