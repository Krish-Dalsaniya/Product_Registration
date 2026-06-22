const fs = require('fs');

let content = fs.readFileSync('src/modules/hr/pages/AddEmployeeWizard.jsx', 'utf8');

// 1. Replace defaultValue with value
content = content.replace(/defaultValue=\{/g, 'value={');

// 2. Replace simple fields
content = content.replace(/onBlur=\{e => setFormData\(\{\.\.\.formData, ([a-zA-Z0-9_]+): e\.target\.value\}\)\}/g, 
  "onChange={e => setFormData(prev => ({...prev, $1: e.target.value}))}");

// 3. Replace nested fields (like personal_info, address_info, pay_info, statutory_info)
content = content.replace(/onBlur=\{e => setFormData\(\{\.\.\.formData, ([a-zA-Z0-9_]+): \{\.\.\.formData\.[a-zA-Z0-9_]+, ([a-zA-Z0-9_]+): e\.target\.value\}\}\)\}/g, 
  "onChange={e => setFormData(prev => ({...prev, $1: {...prev.$1, $2: e.target.value}}))}");

// 4. Special cases: designation_name
content = content.replace(/onBlur=\{e => setFormData\(\{\.\.\.formData, designation_name: e\.target\.value, designation_id: null\}\)\}/g, 
  "onChange={e => setFormData(prev => ({...prev, designation_name: e.target.value, designation_id: null}))}");

// 5. Custom handlers
content = content.replace(/onBlur=\{handlePANChange\}/g, "onChange={handlePANChange}");
content = content.replace(/onBlur=\{handleAadhaarChange\}/g, "onChange={handleAadhaarChange}");

// Update custom handler implementations
content = content.replace(/setFormData\(\{\.\.\.formData, identities_info: \{\.\.\.formData\.identities_info, pan_doc_no: val\}\}\);/g, 
  "setFormData(prev => ({...prev, identities_info: {...prev.identities_info, pan_doc_no: val}}));");

content = content.replace(/setFormData\(\{\.\.\.formData, identities_info: \{\.\.\.formData\.identities_info, aadhaar_doc_no: formatted\}\}\);/g, 
  "setFormData(prev => ({...prev, identities_info: {...prev.identities_info, aadhaar_doc_no: formatted}}));");

// 6. Emergency contacts (which are multi-line)
content = content.replace(/onBlur=\{e => \{/g, "onChange={e => {");
content = content.replace(/setFormData\(\{\.\.\.formData, emergency_contacts: newContacts\}\)/g, 
  "setFormData(prev => ({...prev, emergency_contacts: newContacts}))");

fs.writeFileSync('src/modules/hr/pages/AddEmployeeWizard.jsx', content);
console.log('Refactored back to controlled inputs with functional updaters!');
