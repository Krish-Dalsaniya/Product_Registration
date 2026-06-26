const fs = require('fs');
const path = require('path');

// Calculate 30 days ago
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const cutoffDate = Date.now() - THIRTY_DAYS_MS;

const walk = (dir) => {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(walk(fullPath));
      } else {
        results.push(fullPath);
      }
    });
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`Error reading ${dir}:`, err);
    }
  }
  return results;
};

const cleanupAttendanceImages = () => {
  const attendanceDir = path.join(process.cwd(), 'uploads', 'attendance');
  console.log(`Starting cleanup in ${attendanceDir} for files older than 30 days.`);

  const files = walk(attendanceDir);
  let deletedCount = 0;

  files.forEach(file => {
    try {
      const stat = fs.statSync(file);
      if (stat.mtimeMs < cutoffDate) {
        fs.unlinkSync(file);
        deletedCount++;
        console.log(`Deleted: ${file}`);
      }
    } catch (err) {
      console.error(`Error checking/deleting file ${file}:`, err);
    }
  });

  console.log(`Cleanup complete. Deleted ${deletedCount} files.`);
};

// If run directly
if (require.main === module) {
  cleanupAttendanceImages();
}

module.exports = cleanupAttendanceImages;
