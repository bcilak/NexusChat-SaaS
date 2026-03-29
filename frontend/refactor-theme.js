const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src', 'app');

const replacements = {
  // Global Structural Colors
  'text-white': 'text-gray-900 dark:text-white',
  'bg-white/5': 'bg-gray-100 dark:bg-white/5',
  'bg-white/10': 'bg-gray-200 dark:bg-white/10',
  'bg-black/20': 'bg-white dark:bg-black/20',
  'bg-black/30': 'bg-gray-50 dark:bg-black/30',
  'bg-black/40': 'bg-white/80 dark:bg-black/40',
  'bg-black/50': 'bg-white dark:bg-black/50',
  
  // Borders
  'border-white/5': 'border-gray-200 dark:border-white/5',
  'border-white/10': 'border-gray-200 dark:border-white/10',
  'border-white/20': 'border-gray-300 dark:border-white/20',
  
  // Text Colors
  'text-gray-300': 'text-gray-700 dark:text-gray-300',
  'text-gray-400': 'text-gray-600 dark:text-gray-400',
  // text-gray-500 is ok in both modes
  'text-indigo-200': 'text-indigo-800 dark:text-indigo-200',
  'text-indigo-300': 'text-indigo-700 dark:text-indigo-300',
  
  // Specific Backgrounds
  'bg-[#0a0a1a]': 'bg-gray-50 dark:bg-[#0a0a1a]',
  'bg-[#111128]': 'bg-white dark:bg-[#111128]',
  'bg-[#0a0a0f]': 'bg-gray-100 dark:bg-[#0a0a0f]',
  'bg-[#0d0d14]': 'bg-gray-100 dark:bg-[#0d0d14]'
};

function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;

      // Extract all className="..." blocks
      const classRegex = /className=["']([^"']+)["']/g;
      
      content = content.replace(classRegex, (match, classNames) => {
        const classArray = classNames.split(/\s+/);
        const newArray = classArray.map(c => {
            if (replacements[c]) {
                return replacements[c];
            }
            return c;
        });
        
        // Remove duplicates just in case "text-gray-900 dark:text-white text-gray-900" 
        // string splits caused it (which won't happen here since replacements map single strictly)
        return `className="${newArray.join(' ')}"`;
      });

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

console.log('Running theme refactoring script...');
processDirectory(directoryPath);
console.log('Script completed successfully.');
