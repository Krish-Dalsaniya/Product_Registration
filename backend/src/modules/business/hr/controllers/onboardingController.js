const db = require('../../../../config/db');
const AdmZip = require('adm-zip');
const { PDFParse } = require('pdf-parse');
const tesseract = require('tesseract.js');
const Groq = require('groq-sdk');
const groq = new Groq();

exports.getOnboardingRecords = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT o.*, 
                   COALESCE(e.emp_code, t.trainee_code) as emp_code, 
                   COALESCE(e.department_id, t.department_id) as department_id, 
                   e.designation_id,
                   COALESCE(u.full_name, t.first_name || ' ' || t.last_name) as full_name, 
                   COALESCE(u.email, t.email) as email, 
                   COALESCE(u.image_url, t.image_url) as image_url,
                   CASE WHEN o.employee_id IS NOT NULL THEN 'Employee' ELSE 'Trainee' END as type
            FROM hr_onboarding o
            LEFT JOIN hr_employees e ON o.employee_id = e.employee_id
            LEFT JOIN hr_trainees t ON o.trainee_id = t.trainee_id
            LEFT JOIN users u ON e.user_id = u.user_id OR t.user_id = u.user_id
            ORDER BY o.created_at DESC
        `);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching onboarding records:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch onboarding records' } });
    }
};

exports.updateOnboardingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const result = await db.query(
            'UPDATE hr_onboarding SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [status, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Onboarding record not found' } });
        }
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating onboarding status:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to update onboarding status' } });
    }
};

exports.updateChecklist = async (req, res) => {
    try {
        const { id } = req.params;
        const { document_checklist, asset_checklist, training_checklist } = req.body;
        
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (document_checklist !== undefined) {
            updates.push(`document_checklist = $${paramIndex++}`);
            values.push(JSON.stringify(document_checklist));
        }
        if (asset_checklist !== undefined) {
            updates.push(`asset_checklist = $${paramIndex++}`);
            values.push(JSON.stringify(asset_checklist));
        }
        if (training_checklist !== undefined) {
            updates.push(`training_checklist = $${paramIndex++}`);
            values.push(JSON.stringify(training_checklist));
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: { message: 'No checklists provided for update' } });
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const query = `UPDATE hr_onboarding SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Onboarding record not found' } });
        }
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating checklist:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to update checklist' } });
    }
};

exports.createOnboardingRecord = async (req, res) => {
    try {
        const { employee_id, trainee_id, offer_acceptance_date } = req.body;
        if (!employee_id && !trainee_id) {
            return res.status(400).json({ success: false, error: { message: 'Must provide either employee_id or trainee_id' } });
        }
        const result = await db.query(
            `INSERT INTO hr_onboarding (employee_id, trainee_id, offer_acceptance_date) VALUES ($1, $2, $3) RETURNING *`,
            [employee_id || null, trainee_id || null, offer_acceptance_date || null]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating onboarding record:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to create onboarding record' } });
    }
};

exports.extractOnboardingZip = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: { message: 'No file provided' } });
        }

        let combinedText = '';
        let extractedDocuments = {};
        const entries = [];
        const filename = req.file.originalname.toLowerCase();

        if (filename.endsWith('.rar')) {
            try {
                const unrar = require('node-unrar-js');
                const extractor = await unrar.createExtractorFromData({ data: req.file.buffer });
                const extracted = extractor.extract();
                const files = extracted.files;
                for (const file of files) {
                    if (file.fileHeader.flags.directory) continue;
                    entries.push({
                        name: file.fileHeader.name,
                        data: Buffer.from(file.extraction)
                    });
                }
            } catch (err) {
                return res.status(400).json({ success: false, error: { message: 'Invalid RAR archive.' } });
            }
        } else {
            try {
                const zip = new AdmZip(req.file.buffer);
                for (const entry of zip.getEntries()) {
                    if (entry.isDirectory) continue;
                    entries.push({
                        name: entry.entryName,
                        data: entry.getData()
                    });
                }
            } catch (zipError) {
                return res.status(400).json({ success: false, error: { message: 'Invalid ZIP archive.' } });
            }
        }

        for (const entry of entries) {
            // Ignore Mac resource fork files
            if (entry.name.includes('__MACOSX') || entry.name.split('/').pop().startsWith('._')) continue;
            
            const ext = entry.name.split('.').pop().toLowerCase();
            const data = entry.data;

            // Document matching logic
            const lowerName = entry.name.toLowerCase();
            let matchedKey = null;
            if (lowerName.includes('10th')) matchedKey = 'marksheet_10th';
            else if (lowerName.includes('12th')) matchedKey = 'marksheet_12th';
            else if (lowerName.includes('sem 1') || lowerName.includes('sem1')) matchedKey = 'sem_1';
            else if (lowerName.includes('sem 2') || lowerName.includes('sem2')) matchedKey = 'sem_2';
            else if (lowerName.includes('sem 3') || lowerName.includes('sem3')) matchedKey = 'sem_3';
            else if (lowerName.includes('sem 4') || lowerName.includes('sem4')) matchedKey = 'sem_4';
            else if (lowerName.includes('sem 5') || lowerName.includes('sem5')) matchedKey = 'sem_5';
            else if (lowerName.includes('sem 6') || lowerName.includes('sem6')) matchedKey = 'sem_6';
            else if (lowerName.includes('sem 7') || lowerName.includes('sem7')) matchedKey = 'sem_7';
            else if (lowerName.includes('sem 8') || lowerName.includes('sem8')) matchedKey = 'sem_8';

            if (matchedKey) {
                let mimeType = 'application/octet-stream';
                if (ext === 'pdf') mimeType = 'application/pdf';
                else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
                else if (ext === 'png') mimeType = 'image/png';
                extractedDocuments[matchedKey] = `data:${mimeType};base64,${data.toString('base64')}`;
            }

            try {
                if (ext === 'pdf') {
                    const parser = new PDFParse({ data: data });
                    const pdfData = await parser.getText();
                    combinedText += `\n--- Content from ${entry.name} ---\n${pdfData.text}\n`;
                } else if (ext === 'txt') {
                    combinedText += `\n--- Content from ${entry.name} ---\n${data.toString('utf8')}\n`;
                } else if (['jpg', 'jpeg', 'png'].includes(ext)) {
                    // Initialize Tesseract for images (Aadhar, PAN, etc.)
                    const worker = await tesseract.createWorker('eng');
                    const ret = await worker.recognize(data);
                    combinedText += `\n--- Content from ${entry.name} ---\n${ret.data.text}\n`;
                    await worker.terminate();
                } else {
                    console.log(`Skipping unsupported file type: ${entry.name}`);
                }
            } catch (err) {
                console.error(`Error parsing file ${entry.name}:`, err.message);
            }
        }

        if (!combinedText.trim()) {
            return res.status(400).json({ success: false, error: { message: 'Could not extract any text from the provided archive. Ensure it contains valid PDF, TXT, or Image files.' } });
        }

        const prompt = `
You are an HR assistant bot. Extract the following information from the provided documents and return ONLY a valid JSON object matching this exact schema. If a value is not found, leave it as an empty string.

Schema:
{
  "full_name": "string",
  "email": "string",
  "phone_number": "string",
  "dob": "YYYY-MM-DD",
  "gender": "Male|Female|Other",
  "fathers_name": "string",
  "marital_status": "Single|Married",
  "blood_group": "A+|A-|B+|B-|AB+|AB-|O+|O-",
  "spouse_name": "string",
  "marriage_date": "YYYY-MM-DD",
  "current_address": "string",
  "current_city": "string",
  "current_state": "string",
  "current_zip": "string",
  "pan_doc_no": "string",
  "pan_name": "string",
  "aadhaar_doc_no": "string",
  "aadhaar_name": "string",
  "bank_name": "string",
  "bank_account_no": "string",
  "ifsc_code": "string",
  "uan": "string",
  "pf_no": "string",
  "esi_number": "string"
}

Document Content:
${combinedText.substring(0, 20000)}
`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.1-8b-instant',
            temperature: 0.1,
            response_format: { type: 'json_object' }
        });

        let extractedData = {};
        try {
            extractedData = JSON.parse(chatCompletion.choices[0].message.content);
        } catch (e) {
            console.error('Failed to parse Groq response:', chatCompletion.choices[0].message.content);
            return res.status(500).json({ success: false, error: { message: 'AI returned invalid JSON format' } });
        }

        res.status(200).json({ success: true, data: extractedData, documents: extractedDocuments });
    } catch (error) {
        console.error('Error extracting archive:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to process archive file', details: error.message, stack: error.stack } });
    }
};
