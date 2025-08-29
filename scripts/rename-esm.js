/**
 * Script to rename .js files to .mjs for ESM build
 * This is needed for dual package support (CommonJS + ESM)
 */

const fs = require('fs');
const path = require('path');

function renameJsToMjs(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      renameJsToMjs(filePath);
    } else if (file.endsWith('.js')) {
      const newPath = path.join(dir, file.replace('.js', '.mjs'));
      fs.renameSync(filePath, newPath);
      console.log(`Renamed ${filePath} to ${newPath}`);
    }
  }
}

// Rename files in dist-esm directory
const distEsmDir = path.join(__dirname, '..', 'dist-esm');
if (fs.existsSync(distEsmDir)) {
  renameJsToMjs(distEsmDir);
  
  // Move renamed files to dist directory
  const distDir = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  // Copy .mjs files to dist directory
  function copyMjsFiles(srcDir, destDir) {
    const files = fs.readdirSync(srcDir);
    
    for (const file of files) {
      const srcPath = path.join(srcDir, file);
      const destPath = path.join(destDir, file);
      const stat = fs.statSync(srcPath);
      
      if (stat.isDirectory()) {
        if (!fs.existsSync(destPath)) {
          fs.mkdirSync(destPath, { recursive: true });
        }
        copyMjsFiles(srcPath, destPath);
      } else if (file.endsWith('.mjs')) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied ${srcPath} to ${destPath}`);
      }
    }
  }
  
  copyMjsFiles(distEsmDir, distDir);
  
  // Clean up dist-esm directory
  fs.rmSync(distEsmDir, { recursive: true, force: true });
  console.log('Cleaned up dist-esm directory');
} else {
  console.log('dist-esm directory not found');
}
