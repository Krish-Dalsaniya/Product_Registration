const fs = require('fs');

const efPath = 'd:\\Product_Registration\\backend\\src\\modules\\business\\hr\\controllers\\enterpriseFormController.js';
let ef = fs.readFileSync(efPath, 'utf8');

// 1. Update SELECT query in getFormSchema
ef = ef.replace(
  's.id AS section_id, s.title AS section_title, s.description AS section_description, s.order_index AS section_order,',
  's.id AS section_id, s.title AS section_title, s.description AS section_description, s.order_index AS section_order, s.section_type, s.config AS section_config,'
);

// 2. Update sectionsMap.set in getFormSchema
ef = ef.replace(
  `sectionsMap.set(row.section_id, {
          id: row.section_id,
          title: row.section_title,
          description: row.section_description,
          questions: new Map()
        });`,
  `const secConfig = row.section_config || {};
        sectionsMap.set(row.section_id, {
          id: row.section_id,
          title: row.section_title,
          description: row.section_description,
          section_type: row.section_type || 'mixed',
          layout: secConfig.layout,
          questions: new Map()
        });`
);

// 3. Update section.questions.set in getFormSchema
ef = ef.replace(
  `section.questions.set(row.question_id, {
          id: row.question_id,
          type: row.type,
          label: row.label,
          required: row.is_required,
          placeholder: row.placeholder,
          help_text: row.help_text,
          config: row.config || {},
          options: [],
          rows: []
        });`,
  `const qConfig = row.config || {};
        const qLayout = qConfig.layout;
        delete qConfig.layout;
        section.questions.set(row.question_id, {
          id: row.question_id,
          type: row.type,
          label: row.label,
          required: row.is_required,
          placeholder: row.placeholder,
          help_text: row.help_text,
          config: qConfig,
          layout: qLayout,
          options: [],
          rows: []
        });`
);

// 4. Update saveDynamicForm form_sections
ef = ef.replace(
  `INSERT INTO form_sections (form_id, title, description, order_index, is_archived) VALUES ($1, $2, $3, $4, false) RETURNING id\`,
            [formId, section.title || 'Untitled Section', section.description || '', sIndex]`,
  `INSERT INTO form_sections (form_id, title, description, order_index, is_archived, section_type, config) VALUES ($1, $2, $3, $4, false, $5, $6) RETURNING id\`,
            [formId, section.title || 'Untitled Section', section.description || '', sIndex, section.section_type || 'mixed', section.layout ? { layout: section.layout } : {}]`
);

ef = ef.replace(
  `INSERT INTO form_sections (id, form_id, title, description, order_index, is_archived) 
             VALUES ($1, $2, $3, $4, $5, false) 
             ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, order_index = EXCLUDED.order_index, is_archived = false\`,
            [sectionId, formId, section.title || 'Untitled Section', section.description || '', sIndex]`,
  `INSERT INTO form_sections (id, form_id, title, description, order_index, is_archived, section_type, config) 
             VALUES ($1, $2, $3, $4, $5, false, $6, $7) 
             ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, order_index = EXCLUDED.order_index, section_type = EXCLUDED.section_type, config = EXCLUDED.config, is_archived = false\`,
            [sectionId, formId, section.title || 'Untitled Section', section.description || '', sIndex, section.section_type || 'mixed', section.layout ? { layout: section.layout } : {}]`
);

// 5. Update saveDynamicForm form_questions
ef = ef.replace(
  `const q = section.questions[qIndex];
            let questionId = q.id;

            if (isNewVersion || !questionId || questionId.startsWith('q_')) {`,
  `const q = section.questions[qIndex];
            let questionId = q.id;
            const qConfig = q.config || {};
            if (q.layout) qConfig.layout = q.layout;

            if (isNewVersion || !questionId || questionId.startsWith('q_')) {`
);

ef = ef.replace(
  `VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false) RETURNING id\`,
                [formId, sectionId, q.type, q.label, !!q.required, qIndex, q.placeholder || '', q.help_text || '', q.config || {}]`,
  `VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false) RETURNING id\`,
                [formId, sectionId, q.type, q.label, !!q.required, qIndex, q.placeholder || '', q.help_text || '', qConfig]`
);

ef = ef.replace(
  `ON CONFLICT (id) DO UPDATE SET type = EXCLUDED.type, label = EXCLUDED.label, is_required = EXCLUDED.is_required, order_index = EXCLUDED.order_index, help_text = EXCLUDED.help_text, config = EXCLUDED.config, is_archived = false\`,
                [questionId, formId, sectionId, q.type, q.label, !!q.required, qIndex, q.placeholder || '', q.help_text || '', q.config || {}]`,
  `ON CONFLICT (id) DO UPDATE SET type = EXCLUDED.type, label = EXCLUDED.label, is_required = EXCLUDED.is_required, order_index = EXCLUDED.order_index, help_text = EXCLUDED.help_text, config = EXCLUDED.config, is_archived = false\`,
                [questionId, formId, sectionId, q.type, q.label, !!q.required, qIndex, q.placeholder || '', q.help_text || '', qConfig]`
);

fs.writeFileSync(efPath, ef);
console.log('enterpriseFormController.js updated successfully!');


const pfPath = 'd:\\Product_Registration\\backend\\src\\modules\\business\\hr\\controllers\\publicFormController.js';
let pf = fs.readFileSync(pfPath, 'utf8');

// 1. Update SELECT query in getPublicForm
pf = pf.replace(
  's.id AS section_id, s.title AS section_title, s.description AS section_desc, s.order_index AS section_order,',
  's.id AS section_id, s.title AS section_title, s.description AS section_desc, s.order_index AS section_order, s.section_type, s.config AS section_config,'
);

// 2. Update sectionsMap.set in getPublicForm
pf = pf.replace(
  `sectionsMap.set(row.section_id, {
          id: row.section_id,
          title: row.section_title,
          description: row.section_description,
          questions: new Map()
        });`,
  `const secConfig = row.section_config || {};
        sectionsMap.set(row.section_id, {
          id: row.section_id,
          title: row.section_title,
          description: row.section_desc,
          section_type: row.section_type || 'mixed',
          layout: secConfig.layout,
          questions: new Map()
        });`
);

// 3. Update section.questions.set in getPublicForm
pf = pf.replace(
  `section.questions.set(row.question_id, {
          id: row.question_id,
          type: row.type,
          label: row.label,
          required: row.is_required,
          placeholder: row.placeholder,
          help_text: row.help_text,
          config: row.config || {},
          points: 0,
          options: [],
          rows: []
        });`,
  `const qConfig = row.config || {};
        const qLayout = qConfig.layout;
        delete qConfig.layout;
        section.questions.set(row.question_id, {
          id: row.question_id,
          type: row.type,
          label: row.label,
          required: row.is_required,
          placeholder: row.placeholder,
          help_text: row.help_text,
          config: qConfig,
          layout: qLayout,
          points: 0,
          options: [],
          rows: []
        });`
);

fs.writeFileSync(pfPath, pf);
console.log('publicFormController.js updated successfully!');
