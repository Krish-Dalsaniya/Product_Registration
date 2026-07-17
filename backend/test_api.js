const axios = require('axios');
(async () => {
  const r = await axios.get('http://localhost:3000/api/hr/public-forms/fcaa351e-c499-4cea-9701-0a329c9fbe79');
  const sections = r.data.data.form_schema;
  sections.forEach(s => {
    console.log('Section', s.id);
    s.questions.forEach(q => {
      console.log('  Q:', q.id, 'layout:', q.layout, 'config:', q.config);
    });
  });
})();
