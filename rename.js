const fs = require('fs');
const path = require('path');

const rootDir = 'c:\\dev\\Zentox';

const skipDirs = ['.git', 'node_modules', '.expo', 'build', '.idea', '.gradle', 'assets'];

function walkAndReplace(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (!skipDirs.includes(file)) {
                walkAndReplace(fullPath);
            }
        } else {
            if (/\.(kt|xml|gradle|json|ts|tsx|js|md|properties)$/.test(file)) {
                let content = fs.readFileSync(fullPath, 'utf8');
                let changed = false;

                if (content.includes('zentox') || content.includes('Zentox') || content.includes('Zentox')) {
                    content = content.replace(/zentox/g, 'zentox')
                        .replace(/Zentox/g, 'Zentox')
                        .replace(/Zentox/g, 'Zentox');
                    changed = true;
                }

                if (changed) {
                    fs.writeFileSync(fullPath, content, 'utf8');
                    console.log('Updated file:', fullPath);
                }
            }
        }
    }
}

walkAndReplace(rootDir);

// Rename directory com/zentox to com/zentox
const javaDir = path.join(rootDir, 'android/app/src/main/java/com/zentox');
const targetJavaDir = path.join(rootDir, 'android/app/src/main/java/com/zentox');
if (fs.existsSync(javaDir)) {
    fs.renameSync(javaDir, targetJavaDir);
    console.log('Renamed java directory to com/zentox');
} else {
    console.log('Java directory com/zentox not found.');
}
