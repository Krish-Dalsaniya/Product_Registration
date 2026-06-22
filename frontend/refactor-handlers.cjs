const fs = require('fs');

let content = fs.readFileSync('src/modules/hr/pages/AddEmployeeWizard.jsx', 'utf8');

// Replace simple spread updates: setFormData({...formData, field: value})
content = content.replace(/setFormData\(\{\.\.\.formData,\s*([^:]+):\s*([^,]+)\}\)/g, 
  "setFormData(prev => ({...prev, $1: $2}))");

// Replace multi-field spread updates (e.g. user_id, full_name, email or department_id, designation_id, etc.)
content = content.replace(/setFormData\(\{\.\.\.formData,\s*([^\}]+)\}\)/g, (match, fields) => {
    // If the fields contain {...formData.something}, we'll handle it in the next step
    if (fields.includes('...formData.')) {
        return match;
    }
    return `setFormData(prev => ({...prev, ${fields}}))`;
});

// Replace nested fields: setFormData({...formData, obj: {...formData.obj, field: value}})
content = content.replace(/setFormData\(\{\.\.\.formData,\s*([a-zA-Z0-9_]+):\s*\{\.\.\.formData\.[a-zA-Z0-9_]+,\s*([^}]+)\}\}\)/g, 
  "setFormData(prev => ({...prev, $1: {...prev.$1, $2}}))");

// And for the multi-line checkbox in address_info:
// setFormData({...formData, address_info: {...formData.address_info, same_as_current: isChecked, 
//                               permanent_address: isChecked ? formData.address_info.current_address : formData.address_info.permanent_address,
//                               permanent_city: isChecked ? formData.address_info.current_city : formData.address_info.permanent_city,
//                               permanent_state: isChecked ? formData.address_info.current_state : formData.address_info.permanent_state,
//                               permanent_zip: isChecked ? formData.address_info.current_zip : formData.address_info.permanent_zip,
//                               permanent_country: isChecked ? formData.address_info.current_country : formData.address_info.permanent_country,
//                             }});
// We just need to replace {...formData, address_info: {...formData.address_info, with prev => ({...prev, address_info: {...prev.address_info,
// and change all formData.address_info to prev.address_info in the rest of the object.
// Wait, for this specific one, it's easier to just do a direct string replace for the whole block.
content = content.replace(
`                            setFormData({...formData, address_info: {...formData.address_info, same_as_current: isChecked, 
                              permanent_address: isChecked ? formData.address_info.current_address : formData.address_info.permanent_address,
                              permanent_city: isChecked ? formData.address_info.current_city : formData.address_info.permanent_city,
                              permanent_state: isChecked ? formData.address_info.current_state : formData.address_info.permanent_state,
                              permanent_zip: isChecked ? formData.address_info.current_zip : formData.address_info.permanent_zip,
                              permanent_country: isChecked ? formData.address_info.current_country : formData.address_info.permanent_country,
                            }});`,
`                            setFormData(prev => ({...prev, address_info: {...prev.address_info, same_as_current: isChecked, 
                              permanent_address: isChecked ? prev.address_info.current_address : prev.address_info.permanent_address,
                              permanent_city: isChecked ? prev.address_info.current_city : prev.address_info.permanent_city,
                              permanent_state: isChecked ? prev.address_info.current_state : prev.address_info.permanent_state,
                              permanent_zip: isChecked ? prev.address_info.current_zip : prev.address_info.permanent_zip,
                              permanent_country: isChecked ? prev.address_info.current_country : prev.address_info.permanent_country,
                            }}));`
);

fs.writeFileSync('src/modules/hr/pages/AddEmployeeWizard.jsx', content);
console.log('Refactored all remaining setFormData calls to functional updaters.');
