const pool = require('../../../config/db');
const Groq = require('groq-sdk');
const groq = new Groq();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');



// --- Training Modules ---
const createModule = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { 
            title, description, category, department_id, training_type, 
            difficulty_level, duration_hours, training_url, attachment_url, status 
        } = req.body;

        const parsedDuration = duration_hours ? Math.round(parseFloat(duration_hours)) : null;
        const parsedDepartment = (department_id && department_id.trim() !== '') ? department_id : null;

        const insertQuery = `
            INSERT INTO hr_lms_modules 
            (title, description, category, department_id, training_type, difficulty_level, duration_hours, training_url, attachment_url, status, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;
        
        const values = [
            title, description || null, category || null, parsedDepartment, 
            training_type || null, difficulty_level || null, parsedDuration, 
            training_url || null, attachment_url || null, status || 'Active', userId
        ];

        const result = await pool.query(insertQuery, values);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating LMS module:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to create module' } });
    }
};

const getAllModules = async (req, res) => {
    try {
        const query = `
            SELECT m.*, d.name as department_name, u.full_name as created_by_name
            FROM hr_lms_modules m
            LEFT JOIN hr_departments d ON m.department_id = d.department_id
            LEFT JOIN users u ON m.created_by = u.user_id
            ORDER BY m.created_at DESC
        `;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching modules:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch modules' } });
    }
};

const updateModule = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            title, description, category, department_id, training_type, 
            difficulty_level, duration_hours, training_url, attachment_url, status 
        } = req.body;

        const parsedDuration = duration_hours ? Math.round(parseFloat(duration_hours)) : null;
        const parsedDepartment = (department_id && department_id.trim() !== '') ? department_id : null;

        const updateQuery = `
            UPDATE hr_lms_modules 
            SET title = $1, description = $2, category = $3, department_id = $4, training_type = $5, 
                difficulty_level = $6, duration_hours = $7, training_url = $8, attachment_url = $9, status = $10, updated_at = CURRENT_TIMESTAMP
            WHERE module_id = $11
            RETURNING *
        `;
        
        const values = [
            title, description || null, category || null, parsedDepartment, 
            training_type || null, difficulty_level || null, parsedDuration, 
            training_url || null, attachment_url || null, status || 'Active', id
        ];

        const result = await pool.query(updateQuery, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Module not found' } });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating LMS module:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to update module' } });
    }
};

const deleteModule = async (req, res) => {
    try {
        const { id } = req.params;
        const deleteQuery = `DELETE FROM hr_lms_modules WHERE module_id = $1 RETURNING *`;
        const result = await pool.query(deleteQuery, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Module not found' } });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error deleting LMS module:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to delete module' } });
    }
};

// --- Employee Training Assignments ---
const assignTraining = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { employee_id, module_id, due_date } = req.body;

        const insertQuery = `
            INSERT INTO hr_lms_assignments 
            (employee_id, module_id, assigned_date, due_date, status, assigned_by)
            VALUES ($1, $2, CURRENT_DATE, $3, 'Assigned', $4)
            RETURNING *
        `;
        
        const values = [employee_id, module_id, due_date || null, userId];
        const result = await pool.query(insertQuery, values);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error assigning training:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to assign training' } });
    }
};

const getAllAssignments = async (req, res) => {
    try {
        const query = `
            SELECT a.*, 
                   m.title as module_title, m.training_type, m.training_url, m.attachment_url, m.duration_hours,
                   COALESCE(e.emp_code, tr.trainee_code, int.intern_code) as emp_code, 
                   COALESCE(u.full_name, tr.first_name || ' ' || tr.last_name, int.first_name || ' ' || int.last_name) as employee_name,
                   (SELECT MAX(score) FROM hr_lms_assessments WHERE assignment_id = a.assignment_id) as highest_score
            FROM hr_lms_assignments a
            JOIN hr_lms_modules m ON a.module_id = m.module_id
            LEFT JOIN hr_employees e ON a.employee_id = e.employee_id
            LEFT JOIN users u ON e.user_id = u.user_id
            LEFT JOIN hr_trainees tr ON a.trainee_id = tr.trainee_id
            LEFT JOIN hr_interns int ON a.intern_id = int.intern_id
            ORDER BY a.created_at DESC
        `;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching employee trainings:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch assignments' } });
    }
};

const updateAssignmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        let updateQuery = `
            UPDATE hr_lms_assignments 
            SET status = $1, updated_at = CURRENT_TIMESTAMP
        `;
        let values = [status];

        if (status === 'Completed') {
            updateQuery += `, completed_at = CURRENT_TIMESTAMP`;
        }

        updateQuery += ` WHERE assignment_id = $2 RETURNING *`;
        values.push(id);

        const result = await pool.query(updateQuery, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Assignment not found' } });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating assignment status:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to update assignment' } });
    }
};

const updateAssignmentProgress = async (req, res) => {
    try {
        const { id } = req.params;
        const { progress_percentage } = req.body;
        
        let status = 'Assigned';
        if (progress_percentage > 0 && progress_percentage < 100) {
            status = 'In Progress';
        } else if (progress_percentage >= 100) {
            status = 'Completed';
        }

        let updateQuery = `
            UPDATE hr_lms_assignments 
            SET progress_percentage = $1, status = $2, updated_at = CURRENT_TIMESTAMP
        `;
        
        if (status === 'Completed') {
            updateQuery += `, completed_at = CURRENT_TIMESTAMP`;
        } else {
            updateQuery += `, completed_at = NULL`;
        }

        updateQuery += ` WHERE assignment_id = $3 RETURNING *`;
        
        const result = await pool.query(updateQuery, [progress_percentage, status, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Assignment not found' } });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating progress:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to update progress' } });
    }
};

const getDashboardStats = async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM hr_lms_modules) as total_modules,
                (SELECT COUNT(DISTINCT employee_id) FROM hr_lms_assignments WHERE status != 'Completed') as active_trainees,
                (SELECT COUNT(*) FROM hr_lms_assignments WHERE status = 'Completed') as completed_courses
        `;
        const result = await pool.query(statsQuery);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching LMS stats:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch LMS stats' } });
    }
};

const deleteAssignment = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM hr_lms_assignments WHERE assignment_id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Assignment not found' } });
        }
        res.json({ success: true, message: 'Assignment deleted successfully' });
    } catch (error) {
        console.error('Error deleting assignment:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to delete assignment' } });
    }
};

const logAssessment = async (req, res) => {
    try {
        const { assignment_id, score, remarks } = req.body;
        const assessed_by = req.user.user_id;
        
        // Auto pass/fail based on 75% threshold
        const status = score >= 75 ? 'Passed' : 'Failed';
        
        const query = `
            INSERT INTO hr_lms_assessments (assignment_id, score, status, remarks, assessed_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const result = await pool.query(query, [assignment_id, score, status, remarks, assessed_by]);
        
        res.status(201).json({ success: true, data: result.rows[0], message: 'Assessment logged successfully' });
    } catch (error) {
        console.error('Error logging assessment:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to log assessment' } });
    }
};

const getAllAssessments = async (req, res) => {
    try {
        const query = `
            SELECT a.*, 
                   assign.assigned_date, assign.completed_at,
                   m.title as module_title, m.training_type, m.difficulty_level,
                   COALESCE(e.emp_code, tr.trainee_code, int.intern_code) as emp_code, 
                   COALESCE(u.full_name, tr.first_name || ' ' || tr.last_name, int.first_name || ' ' || int.last_name) as employee_name,
                   assessor.full_name as assessor_name
            FROM hr_lms_assessments a
            JOIN hr_lms_assignments assign ON a.assignment_id = assign.assignment_id
            JOIN hr_lms_modules m ON assign.module_id = m.module_id
            LEFT JOIN hr_employees e ON assign.employee_id = e.employee_id
            LEFT JOIN users u ON e.user_id = u.user_id
            LEFT JOIN hr_trainees tr ON assign.trainee_id = tr.trainee_id
            LEFT JOIN hr_interns int ON assign.intern_id = int.intern_id
            LEFT JOIN users assessor ON a.assessed_by = assessor.user_id
            ORDER BY a.created_at DESC
        `;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching assessments:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch assessments' } });
    }
};

const addQuizQuestion = async (req, res) => {
    try {
        const { id } = req.params; // module_id
        const { question_text, options, correct_answer } = req.body;
        
        const query = `
            INSERT INTO hr_lms_questions (module_id, question_text, options, correct_answer)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const result = await pool.query(query, [id, question_text, JSON.stringify(options), correct_answer]);
        
        res.status(201).json({ success: true, data: result.rows[0], message: 'Question added successfully' });
    } catch (error) {
        console.error('Error adding question:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to add question' } });
    }
};

const getQuizQuestions = async (req, res) => {
    try {
        const { id } = req.params; // module_id
        
        const query = `
            SELECT * FROM hr_lms_questions
            WHERE module_id = $1
            ORDER BY created_at ASC
        `;
        const result = await pool.query(query, [id]);
        
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch questions' } });
    }
};

const submitQuiz = async (req, res) => {
    try {
        const { assignment_id, answers } = req.body;
        const assessed_by = req.user.user_id;
        
        // Fetch assignment to check retest status and get module_id
        const assignmentRes = await pool.query('SELECT module_id, retest_approved FROM hr_lms_assignments WHERE assignment_id = $1', [assignment_id]);
        if (assignmentRes.rows.length === 0) return res.status(404).json({ success: false, error: { message: 'Assignment not found' } });
        
        // Check if assessment already exists and retest is not approved
        const existingAssessment = await pool.query('SELECT * FROM hr_lms_assessments WHERE assignment_id = $1', [assignment_id]);
        if (existingAssessment.rows.length > 0 && !assignmentRes.rows[0].retest_approved) {
            return res.status(400).json({ success: false, error: { message: 'An assessment has already been submitted for this assignment and no retest is approved.' } });
        }
        
        const module_id = assignmentRes.rows[0].module_id;
        
        // Fetch all questions for this module
        const questionsRes = await pool.query('SELECT * FROM hr_lms_questions WHERE module_id = $1', [module_id]);
        const questions = questionsRes.rows;
        
        if (questions.length === 0) {
            return res.status(400).json({ success: false, error: { message: 'No questions found for this module' } });
        }
        
        // Calculate score
        let correctCount = 0;
        questions.forEach(q => {
            if (answers[q.question_id] === q.correct_answer) {
                correctCount++;
            }
        });
        
        const score = Math.round((correctCount / questions.length) * 100);
        // Auto pass/fail based on 75% threshold (as requested by user)
        const status = score >= 75 ? 'Passed' : 'Failed';
        const remarks = `Automated Quiz Score: ${correctCount}/${questions.length} correct.`;
        
        const query = `
            INSERT INTO hr_lms_assessments (assignment_id, score, status, remarks, assessed_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const result = await pool.query(query, [assignment_id, score, status, remarks, assessed_by]);
        
        // Reset retest_approved once quiz is taken
        await pool.query('UPDATE hr_lms_assignments SET retest_approved = FALSE WHERE assignment_id = $1', [assignment_id]);
        
        res.status(201).json({ success: true, data: result.rows[0], message: 'Quiz submitted successfully' });
    } catch (error) {
        console.error('Error submitting quiz:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to submit quiz' } });
    }
};

const deleteQuizQuestion = async (req, res) => {
    try {
        const { id } = req.params; // question_id
        
        const result = await pool.query('DELETE FROM hr_lms_questions WHERE question_id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Question not found' } });
        }
        
        res.json({ success: true, message: 'Question deleted successfully' });
    } catch (error) {
        console.error('Error deleting question:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to delete question' } });
    }
};

// --- YouTube Proxy ---
const getYoutubeTitle = async (req, res) => {
    try {
        const { videoId } = req.params;
        
        // Fetch oEmbed for the title (lightweight and reliable)
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const oembedResponse = await fetch(oembedUrl);
        let title = `Part`;
        if (oembedResponse.ok) {
            const data = await oembedResponse.json();
            title = data.title;
        }

        // Fetch HTML to scrape duration (Fallback pattern)
        let duration = '';
        try {
            const htmlResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
            const html = await htmlResponse.text();
            
            // Extract itemprop="duration" content="PT3M34S"
            const durationMatch = html.match(/itemprop="duration"\s+content="([^"]+)"/);
            if (durationMatch && durationMatch[1]) {
                const pt = durationMatch[1];
                const match = pt.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                if (match) {
                    const hours = match[1] ? parseInt(match[1]) : 0;
                    const minutes = match[2] ? parseInt(match[2]) : 0;
                    const seconds = match[3] ? parseInt(match[3]) : 0;
                    if (hours > 0) {
                        duration = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                    } else {
                        duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                    }
                }
            }
        } catch (scrapeErr) {
            console.error("Failed to scrape duration:", scrapeErr);
        }
        
        res.json({ success: true, title, duration });
    } catch (error) {
        console.error('Error fetching YouTube title:', error);
        res.status(500).json({ success: false, title: `Part`, duration: '' });
    }
};

const generateQuestionsFromTranscript = async (req, res) => {
    try {
        const { transcript, count = 5 } = req.body;
        
        if (!transcript || transcript.trim() === '') {
            return res.status(400).json({ success: false, error: { message: 'Transcript is required' } });
        }

        const systemPrompt = `You are a professional educational assessment designer.
Your task is to generate exactly ${count} multiple-choice questions (MCQs) based ONLY on the provided training video transcript.

Each question MUST satisfy these requirements:
1. Be directly answerable from the transcript.
2. Have exactly 4 options.
3. Have one clear, correct answer that is exactly identical to one of the 4 options.
4. Be written in clear, professional English.

You MUST format the output as a valid JSON object containing a "questions" array. Do NOT include markdown backticks like \`\`\`json, do NOT include explanations, do NOT include any introductory or concluding text.

Example format:
{
  "questions": [
    {
      "question_text": "What is the primary function of a water sensor?",
      "options": ["To measure humidity", "To detect water presence", "To filter water", "To heat water"],
      "correct_answer": "To detect water presence"
    }
  ]
}`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Here is the transcript:\n\n${transcript}` }
            ],
            model: 'llama-3.1-8b-instant',
            temperature: 0.5,
            max_tokens: 2000,
            response_format: { type: "json_object" }
        });

        const rawText = chatCompletion.choices[0]?.message?.content || '';
        
        let cleanText = rawText.trim();
        if (cleanText.startsWith('```')) {
            cleanText = cleanText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
        }

        let parsedOutput;
        try {
            parsedOutput = JSON.parse(cleanText);
        } catch (parseError) {
            console.error('Failed to parse AI output:', rawText);
            return res.status(500).json({ 
                success: false, 
                error: { message: 'Failed to parse AI generated questions. Please try again.' },
                rawText 
            });
        }

        let questions = [];
        if (Array.isArray(parsedOutput)) {
            questions = parsedOutput;
        } else if (parsedOutput && Array.isArray(parsedOutput.questions)) {
            questions = parsedOutput.questions;
        } else {
            return res.status(500).json({ success: false, error: { message: 'AI generated invalid data structure' } });
        }

        res.json({ success: true, data: questions });
    } catch (error) {
        console.error('Error generating questions:', error);
        res.status(500).json({ 
            success: false, 
            error: { 
                message: 'Failed to generate questions',
                details: error.message,
                stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
            } 
        });
    }
};

const addQuizQuestionsBulk = async (req, res) => {
    try {
        const { id } = req.params; // module_id
        const { questions } = req.body; // array of { question_text, options, correct_answer }
        
        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ success: false, error: { message: 'Questions array is required' } });
        }

        // Generate placeholders and values for parameterized query
        let queryText = 'INSERT INTO hr_lms_questions (module_id, question_text, options, correct_answer) VALUES ';
        const values = [];
        const placeholders = [];
        
        questions.forEach((q, idx) => {
            const base = idx * 3;
            placeholders.push(`($1, $${base + 2}, $${base + 3}, $${base + 4})`);
            values.push(q.question_text, JSON.stringify(q.options), q.correct_answer);
        });
        
        queryText += placeholders.join(', ') + ' RETURNING *';
        const result = await pool.query(queryText, [id, ...values]);
        
        res.status(201).json({ success: true, data: result.rows, message: `${result.rows.length} questions added successfully` });
    } catch (error) {
        console.error('Error adding questions bulk:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to add questions' } });
    }
};

const requestRetest = async (req, res) => {
    try {
        const { assignment_id } = req.params;
        await pool.query('UPDATE hr_lms_assignments SET retest_requested = TRUE WHERE assignment_id = $1', [assignment_id]);
        res.json({ success: true, message: 'Retest requested successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: 'Failed to request retest' } });
    }
};

const approveRetest = async (req, res) => {
    try {
        const { assignment_id } = req.params;
        await pool.query('UPDATE hr_lms_assignments SET retest_approved = TRUE, retest_requested = FALSE WHERE assignment_id = $1', [assignment_id]);
        res.json({ success: true, message: 'Retest approved' });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: 'Failed to approve retest' } });
    }
};

const extendAssignmentDueDate = async (req, res) => {
    try {
        const { id } = req.params;
        const { due_date, extension_reason } = req.body;
        
        if (!due_date || !extension_reason) {
            return res.status(400).json({ success: false, error: { message: 'Due date and reason are required' } });
        }

        const updateQuery = `
            UPDATE hr_lms_assignments 
            SET due_date = $1, extension_reason = $2, updated_at = CURRENT_TIMESTAMP
            WHERE assignment_id = $3
            RETURNING *
        `;
        
        const result = await pool.query(updateQuery, [due_date, extension_reason, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Assignment not found' } });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error extending assignment due date:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to extend due date' } });
    }
};

module.exports = {
    createModule,
    getAllModules,
    updateModule,
    deleteModule,
    assignTraining,
    getAllAssignments,
    updateAssignmentStatus,
    updateAssignmentProgress,
    deleteAssignment,
    getDashboardStats,
    logAssessment,
    getAllAssessments,
    addQuizQuestion,
    getQuizQuestions,
    submitQuiz,
    deleteQuizQuestion,
    getYoutubeTitle,
    generateQuestionsFromTranscript,
    addQuizQuestionsBulk,
    transcribeAudio,
    requestRetest,
    approveRetest,
    extendAssignmentDueDate
};

async function transcribeAudio(req, res) {
    let tempFiles = [];
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: { message: 'No audio or video file uploaded' } });
        }

        const uploadedPath = req.file.path;
        tempFiles.push(uploadedPath);

        const uploadDir = path.dirname(uploadedPath);
        
        // Output optimized mp3 file path
        const compressedAudioPath = path.join(uploadDir, `transcribe_opt_${Date.now()}.mp3`);
        
        // 1. Extract audio & compress to optimized mono 16kHz 64kbps MP3
        console.log(`[Transcribe] Extracting & compressing audio track for ${req.file.originalname}...`);
        try {
            execSync(`"${ffmpeg}" -y -i "${uploadedPath}" -vn -acodec libmp3lame -ar 16000 -ac 1 -ab 64k "${compressedAudioPath}"`);
            tempFiles.push(compressedAudioPath);
        } catch (ffmpegErr) {
            console.error('[Transcribe] FFmpeg extraction failed:', ffmpegErr);
            return res.status(500).json({ success: false, error: { message: 'Failed to process audio/video track.' } });
        }

        // Get file size of compressed audio
        const stats = fs.statSync(compressedAudioPath);
        const fileSizeInMb = stats.size / (1024 * 1024);
        console.log(`[Transcribe] Compressed file size: ${fileSizeInMb.toFixed(2)} MB`);

        let transcriptionText = '';

        if (fileSizeInMb > 24.0) {
            // 2. Chunking/segmentation is required
            console.log('[Transcribe] File size exceeds 24MB. Segmenting audio...');
            const segmentPattern = path.join(uploadDir, `chunk_${Date.now()}_%03d.mp3`);
            
            try {
                // Split into 15 minute (900 seconds) segments
                execSync(`"${ffmpeg}" -y -i "${compressedAudioPath}" -f segment -segment_time 900 -c copy "${segmentPattern}"`);
            } catch (segmentErr) {
                console.error('[Transcribe] Audio segmenting failed:', segmentErr);
                return res.status(500).json({ success: false, error: { message: 'Failed to slice large audio track.' } });
            }

            // Find all matching chunks
            const files = fs.readdirSync(uploadDir);
            const chunks = files
                .filter(file => file.startsWith('chunk_') && file.endsWith('.mp3'))
                .map(file => path.join(uploadDir, file))
                .sort(); // sort alphabetically to process in chronological order
            
            tempFiles.push(...chunks);
            console.log(`[Transcribe] Processing ${chunks.length} chunks...`);

            for (const chunkPath of chunks) {
                const transcription = await groq.audio.transcriptions.create({
                    file: fs.createReadStream(chunkPath),
                    model: 'whisper-large-v3'
                });
                transcriptionText += (transcriptionText ? ' ' : '') + transcription.text;
            }
        } else {
            // 3. Directly transcribe single compressed file
            console.log('[Transcribe] Transcribing single compressed track...');
            const transcription = await groq.audio.transcriptions.create({
                file: fs.createReadStream(compressedAudioPath),
                model: 'whisper-large-v3'
            });
            transcriptionText = transcription.text;
        }

        // Clean up all temporary files
        cleanTempFiles(tempFiles);

        res.json({ success: true, text: transcriptionText });
    } catch (error) {
        console.error('[Transcribe] General error during transcription:', error);
        cleanTempFiles(tempFiles);
        res.status(500).json({ success: false, error: { message: 'Failed to transcribe audio' } });
    }
}

function cleanTempFiles(files) {
    files.forEach(filePath => {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`[Transcribe] Deleted temp file: ${path.basename(filePath)}`);
            }
        } catch (err) {
            console.error(`[Transcribe] Failed to delete temp file: ${filePath}`, err);
        }
    });
}


