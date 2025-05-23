/**
 * This script analyzes the codebase to identify pages that aren't using the reusable UI components.
 * 
 * Usage:
 * node scripts/analyze-ui-components.js
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

// UI components to check for
const UI_COMPONENTS = [
  'Button',
  'Input',
  'Textarea',
  'SelectInput',
  'Checkbox',
  'Card',
  'Badge',
  'Alert',
  'Modal',
  'ConfirmationModal',
  'Spinner'
];

// Custom elements that could be replaced with UI components
const CUSTOM_ELEMENTS = {
  'button': 'Button',
  'input': 'Input',
  'textarea': 'Textarea',
  'select': 'SelectInput',
  '<span className="[^"]*rounded-(full|lg)[^"]*">': 'Badge',
  '<div className="[^"]*bg-(red|green|yellow|blue)-100[^"]*">': 'Alert',
  '<div className="[^"]*fixed inset-0[^"]*">': 'Modal'
};

// Directories to scan
const DIRECTORIES = [
  'src/app',
  'src/components'
];

// File extensions to check
const FILE_EXTENSIONS = ['.tsx', '.jsx'];

// Files to exclude
const EXCLUDE_FILES = [
  'src/components/ui',
  'node_modules',
  '.next'
];

// Results
const results = {
  usingUIComponents: [],
  notUsingUIComponents: [],
  partiallyUsingUIComponents: []
};

/**
 * Check if a file is using UI components
 * @param {string} filePath - Path to the file
 * @returns {Promise<{isUsing: boolean, customElements: string[], uiComponents: string[]}>}
 */
async function checkFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    
    // Check if the file imports from @/components/ui
    const hasUIImport = content.includes('from \'@/components/ui\'') || 
                        content.includes('from "@/components/ui"');
    
    // Check which UI components are used
    const uiComponents = [];
    UI_COMPONENTS.forEach(component => {
      const importRegex = new RegExp(`import [^}]*\\b${component}\\b[^}]*from ['"]@/components/ui['"]`, 'g');
      const destructuredImportRegex = new RegExp(`import [^{]*{[^}]*\\b${component}\\b[^}]*}[^']*from ['"]@/components/ui['"]`, 'g');
      
      if (importRegex.test(content) || destructuredImportRegex.test(content)) {
        uiComponents.push(component);
      }
    });
    
    // Check for custom elements that could be replaced
    const customElements = [];
    Object.keys(CUSTOM_ELEMENTS).forEach(element => {
      const regex = new RegExp(`<${element}[\\s>]`, 'g');
      if (regex.test(content)) {
        customElements.push(`${element} (could use ${CUSTOM_ELEMENTS[element]})`);
      }
    });
    
    return {
      isUsing: hasUIImport && uiComponents.length > 0,
      customElements,
      uiComponents
    };
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return { isUsing: false, customElements: [], uiComponents: [] };
  }
}

/**
 * Recursively scan directories for files
 * @param {string} dir - Directory to scan
 * @returns {Promise<string[]>} - List of file paths
 */
async function getFiles(dir) {
  const subdirs = await readdir(dir);
  const files = await Promise.all(subdirs.map(async (subdir) => {
    const res = path.resolve(dir, subdir);
    
    // Skip excluded directories
    if (EXCLUDE_FILES.some(exclude => res.includes(exclude))) {
      return [];
    }
    
    return (await stat(res)).isDirectory() ? getFiles(res) : res;
  }));
  
  return files.flat().filter(file => 
    FILE_EXTENSIONS.some(ext => file.endsWith(ext))
  );
}

/**
 * Main function
 */
async function main() {
  try {
    // Get all files to check
    let allFiles = [];
    for (const dir of DIRECTORIES) {
      const files = await getFiles(dir);
      allFiles = [...allFiles, ...files];
    }
    
    // Check each file
    for (const file of allFiles) {
      const { isUsing, customElements, uiComponents } = await checkFile(file);
      
      const result = {
        file,
        uiComponents,
        customElements
      };
      
      if (isUsing && customElements.length === 0) {
        results.usingUIComponents.push(result);
      } else if (isUsing && customElements.length > 0) {
        results.partiallyUsingUIComponents.push(result);
      } else if (customElements.length > 0) {
        results.notUsingUIComponents.push(result);
      }
    }
    
    // Print results
    console.log('\n=== UI Component Usage Analysis ===\n');
    
    console.log(`Total files checked: ${allFiles.length}`);
    console.log(`Files using UI components: ${results.usingUIComponents.length}`);
    console.log(`Files partially using UI components: ${results.partiallyUsingUIComponents.length}`);
    console.log(`Files not using UI components: ${results.notUsingUIComponents.length}\n`);
    
    console.log('=== Files that could be improved ===\n');
    
    results.partiallyUsingUIComponents.forEach(result => {
      console.log(`${result.file}:`);
      console.log(`  Using: ${result.uiComponents.join(', ')}`);
      console.log(`  Could replace: ${result.customElements.join(', ')}`);
      console.log('');
    });
    
    results.notUsingUIComponents.forEach(result => {
      console.log(`${result.file}:`);
      console.log(`  Could replace: ${result.customElements.join(', ')}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
