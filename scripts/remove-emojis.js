const fs = require('fs');
const path = require('path');

// Lista de emojis comuns usados no projeto
const emojiPatterns = [
  /[📋🏢🔍✅❌⚠️🔄🆕🌐📊🤖💡🎯🚀📱🔓🔢👥💰📈🎉⏳🟡🟢🔴]/gu,
];

function removeEmojisFromFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    emojiPatterns.forEach(pattern => {
      const newContent = content.replace(pattern, '');
      if (newContent !== content) {
        modified = true;
        content = newContent;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Cleaned:', filePath);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error processing', filePath, err.message);
    return false;
  }
}

function processDirectory(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  let count = 0;
  
  function walk(directory) {
    const files = fs.readdirSync(directory);
    
    files.forEach(file => {
      const filePath = path.join(directory, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        if (!file.startsWith('.') && file !== 'node_modules') {
          walk(filePath);
        }
      } else if (extensions.some(ext => file.endsWith(ext))) {
        if (removeEmojisFromFile(filePath)) {
          count++;
        }
      }
    });
  }
  
  walk(dir);
  return count;
}

// Process lib, components, app directories
const dirs = ['lib', 'components', 'app'];
let totalCleaned = 0;

dirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`\nProcessing ${dir}/...`);
    const cleaned = processDirectory(dir);
    totalCleaned += cleaned;
    console.log(`${cleaned} files cleaned in ${dir}/`);
  }
});

console.log(`\nTotal: ${totalCleaned} files cleaned`);
