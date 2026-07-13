const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const Tesseract = require('tesseract.js');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Extracts text from a file (PDF or Image)
 * @param {string} filePath - Absolute path to the file
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromFile(filePath) {
    try {
        const ext = path.extname(filePath).toLowerCase();

        if (ext === '.pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const parser = new PDFParse({ data: dataBuffer });
            const data = await parser.getText();
            await parser.destroy();
            return data.text;
        } else if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
            // Use Tesseract for images
            const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
            return text;
        } else {
            console.warn(`Unsupported file type for extraction: ${ext}`);
            return '';
        }
    } catch (error) {
        console.error(`Error extracting text from ${filePath}:`, error.message);
        return '';
    }
}

function getSchemaForDocType(key) {
    if (key === 'marksheet_10th') {
        return `{
            "tenth_percentage": "string or number (Find the overall percentage or calculate it if only total marks are given)",
            "tenth_subjects": [{"subject": "string", "marks": "string or number (CRITICAL: Extract the FINAL/TOTAL marks out of 100. Ignore internal/external marks which are usually smaller numbers like 46, 48, etc.)"}]
        }`;
    }
    if (key === 'marksheet_12th') {
        return `{
            "twelfth_percentage": "string or number (Find the overall percentage or calculate it)",
            "twelfth_subjects": [{"subject": "string", "marks": "string or number (CRITICAL: Extract the FINAL/TOTAL marks out of 100. Ignore internal/external marks.)"}]
        }`;
    }
    if (key.startsWith('deg_sem_')) {
        const sem = key.replace('deg_sem_', '');
        return `{
            "college_sgpa": "string or number (Find the SGPA or CGPA on the document)",
            "semester_details": {
                "${sem}": {
                    "sgpa": "number (Find the SGPA for this specific semester)",
                    "passing_date": "YYYY-MM",
                    "subjects": [{"subject": "string (Full subject name)", "marks": "string or number (CRITICAL: Extract the TOTAL marks or final grade, not internal marks)"}]
                }
            }
        }`;
    }
    if (key.startsWith('dip_sem_')) {
        const sem = key.replace('dip_sem_', '');
        return `{
            "college_sgpa": "string or number (Find the SGPA or CGPA on the document)",
            "semester_details": {
                "${sem}": {
                    "sgpa": "number (Find the SGPA for this specific semester)",
                    "passing_date": "YYYY-MM",
                    "subjects": [{"subject": "string (Full subject name)", "marks": "string or number (CRITICAL: Extract the TOTAL marks or final grade, not internal marks)"}]
                }
            }
        }`;
    }
    if (key === 'degreeCertificate') {
        return `{
            "college_cgpa": "string or number",
            "degree_subjects": [{"subject": "string", "marks": "string or number"}]
        }`;
    }
    if (key === 'marksheet_diploma' || key === 'diplomaCertificate') {
        return `{
            "college_cgpa": "string or number",
            "diploma_subjects": [{"subject": "string", "marks": "string or number"}]
        }`;
    }
    
    // Default schema for resume, application form, ID cards, etc.
    return `{
        "name": "string",
        "email": "string",
        "mobile": "string",
        "current_location": "string",
        "total_years_experience": "string or number",
        "current_company": "string",
        "designation": "string",
        "birth_date": "string (e.g. DD/MM/YYYY or YYYY-MM-DD)",
        "birth_year": "string or number"
    }`;
}

function deepMerge(target, source) {
    if (typeof source !== 'object' || source === null) return;
    for (const key of Object.keys(source)) {
        if (source[key] === null) continue; // Skip nulls
        
        if (Array.isArray(source[key])) {
            target[key] = source[key];
        } else if (typeof source[key] === 'object') {
            if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
                target[key] = {};
            }
            deepMerge(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
}

/**
 * Processes a candidate's uploaded documents and extracts AI structured info
 * @param {Object} documents - Object mapping fieldname to relative file paths
 * @param {string} rootDir - The root directory of the backend to resolve absolute paths
 * @returns {Promise<Object>} - The extracted JSON data
 */
async function extractCandidateInfo(documents, rootDir) {
    if (!documents || Object.keys(documents).length === 0) {
        return {};
    }

    const finalResult = {};
    const MAX_LENGTH = 15000;

    for (const [key, relativePath] of Object.entries(documents)) {
        const absolutePath = path.join(rootDir, relativePath);
        if (fs.existsSync(absolutePath)) {
            const ext = path.extname(absolutePath).toLowerCase();
            const schema = getSchemaForDocType(key);

            const systemPrompt = `You are an HR assistant extracting structured data from a candidate's document.
Document type: ${key}.

CRITICAL INSTRUCTIONS:
- Read the ENTIRE subject-wise marks/grades table if present in the document, not just a summary line.
- Extract EVERY row of the table as a separate entry in the appropriate subjects array.
- Use the exact subject name and mark/grade as printed in the document.
- If a percentage or SGPA/CGPA is explicitly mentioned, extract it. If it is NOT explicitly mentioned, you MUST calculate it mathematically from the marks you extracted (Sum of obtained marks / Sum of max marks * 100) and output the calculated value. Do NOT omit it if you can calculate it.
- Return ONLY a valid JSON object matching the exact schema provided below.
- Do NOT include markdown formatting (like \`\`\`json) or any extra conversational text.
- If a value is not found and cannot be calculated, use null or omit it.

SCHEMA:
${schema}`;

            try {
                if (ext === '.pdf') {
                    // PDF Branch: Extract text first, then use text-based LLM
                    let text = await extractTextFromFile(absolutePath);
                    if (!text || !text.trim()) continue;

                    if (text.length > MAX_LENGTH) {
                        text = text.substring(0, MAX_LENGTH);
                    }

                    const completion = await groq.chat.completions.create({
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: `Here is the candidate document text:\n\n${text}` }
                        ],
                        model: 'llama-3.3-70b-versatile',
                        temperature: 0.1,
                        response_format: { type: 'json_object' }
                    });

                    const jsonString = completion.choices[0]?.message?.content;
                    if (jsonString) {
                        const parsed = JSON.parse(jsonString);
                        deepMerge(finalResult, parsed);
                    }
                } else if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
                    // Image Branch: Send directly to Vision Model
                    const imageBuffer = fs.readFileSync(absolutePath);
                    const base64Image = imageBuffer.toString('base64');
                    const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
                    const imageUrl = `data:${mimeType};base64,${base64Image}`;

                    const completion = await groq.chat.completions.create({
                        messages: [
                            { role: 'system', content: systemPrompt },
                            {
                                role: 'user',
                                content: [
                                    { type: "text", text: "Here is the candidate document image. Extract the data according to the schema." },
                                    { type: "image_url", image_url: { url: imageUrl } }
                                ]
                            }
                        ],
                        model: 'meta-llama/llama-4-scout-17b-16e-instruct', // Vision model
                        temperature: 0.1,
                        response_format: { type: 'json_object' }
                    });

                    const jsonString = completion.choices[0]?.message?.content;
                    if (jsonString) {
                        const parsed = JSON.parse(jsonString);
                        deepMerge(finalResult, parsed);
                    }
                } else {
                    console.warn(`Unsupported file type for AI extraction: ${ext}`);
                }
            } catch (error) {
                console.error(`AI Extraction failed for document ${key}:`, error.message);
                require('fs').writeFileSync('extraction_error.log', error.message + '\n' + (error.stack || ''));
                // Continue processing other documents instead of failing the whole batch
            }
        }
    }

    return finalResult;
}

module.exports = {
    extractCandidateInfo
};
