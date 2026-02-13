const fs = require('fs');
const path = require('path');

// 复制public目录到dist目录
const srcDir = path.join(__dirname, '../app/renderer/public');
const destDir = path.join(__dirname, '../app/renderer/dist');

// 确保目标目录存在
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// 复制public目录
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('复制public目录...');
copyDir(srcDir, destDir);
console.log('复制完成！');