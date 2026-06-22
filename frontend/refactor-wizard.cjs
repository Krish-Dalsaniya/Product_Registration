const fs = require('fs');

let content = fs.readFileSync('src/modules/hr/pages/AddEmployeeWizard.jsx', 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    // Target inputs that are text, email, number, or have no type specified, but skip checkboxes, radios, files, dates
    if (line.includes('<input ') && !line.includes('type="checkbox"') && !line.includes('type="radio"') && !line.includes('type="file"') && !line.includes('type="date"')) {
        if (line.includes('value={') && line.includes('onChange={')) {
            lines[i] = line.replace('value={', 'defaultValue={').replace('onChange={', 'onBlur={');
        }
    }
}

fs.writeFileSync('src/modules/hr/pages/AddEmployeeWizard.jsx', lines.join('\n'));
console.log('Refactored AddEmployeeWizard.jsx');
