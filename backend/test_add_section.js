const axios = require('axios');
(async () => {
  const formId = 'fcaa351e-c499-4cea-9701-0a329c9fbe79';
  
  // 1. Get current form to find its internal ID
  const getRes = await axios.get(`http://localhost:3000/api/hr/public-forms/${formId}`);
  const internalId = getRes.data.data.internal_id;
  const currentSchema = getRes.data.data.form_schema;
  
  console.log('Current schema sections:', currentSchema.length);
  
  // 2. Add a new section with a question
  const newSectionId = 'd80a1c97-6a45-423b-a912-32a514d3f23a';
  const newQuestionId = 'e91b2d08-7b56-534c-b023-43b625e4f34b';
  
  currentSchema.push({
    id: newSectionId,
    title: 'Test New Section',
    section_type: 'mixed',
    layout: { order: currentSchema.length, w: 2 },
    questions: [
      {
        id: newQuestionId,
        type: 'short_text',
        label: 'Test New Question',
        layout: { w: 1 }
      }
    ]
  });
  
  // 3. Save the form
  const putRes = await axios.put(`http://localhost:3000/api/hr/enterprise-forms/${internalId}`, {
    label: getRes.data.data.title,
    form_mode: getRes.data.data.form_mode,
    form_schema: currentSchema
  });
  console.log('Save result:', putRes.data.success);
  
  // 4. Fetch public form again to verify
  const getRes2 = await axios.get(`http://localhost:3000/api/hr/public-forms/${formId}?t=${Date.now()}`);
  const newSchema = getRes2.data.data.form_schema;
  console.log('New schema sections:', newSchema.length);
  const found = newSchema.find(s => s.id === newSectionId);
  console.log('Found new section?', !!found);
})();
