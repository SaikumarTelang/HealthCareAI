const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory && !dirPath.includes('node_modules') && !dirPath.includes('dist')) {
      walkDir(dirPath, callback);
    } else if (!isDirectory) {
      callback(dirPath);
    }
  });
}

const frontendSrc = path.join(__dirname, '../frontend/src');
console.log('Scanning frontend src at:', frontendSrc);

const filesWithFirebase = [];

walkDir(frontendSrc, (filePath) => {
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('firebaseConfig') || content.includes('getFirestore') || content.includes('getAuth') || content.includes('firebase/')) {
      filesWithFirebase.push(filePath);
    }
  }
});

console.log('Files referencing Firebase in frontend src:');
filesWithFirebase.forEach(f => console.log(' -', f));
