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

    let combinedText = '';

    for (const [key, relativePath] of Object.entries(documents)) {
        const absolutePath = path.join(rootDir, relativePath);
        if (fs.existsSync(absolutePath)) {
            const text = await extractTextFromFile(absolutePath);
            if (text) {
                combinedText += `--- Document: ${key} ---\n${text}\n\n`;
            }
        }
    }

    if (!combinedText.trim()) {
        return {};
    }

    // Truncate to avoid exceeding context window (e.g., 20,000 chars roughly)
    const MAX_LENGTH = 20000;
    if (combinedText.length > MAX_LENGTH) {
        combinedText = combinedText.substring(0, MAX_LENGTH);
    }

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: `You are an HR assistant. Extract the following information from the provided candidate documents text. Return ONLY a valid JSON object matching this schema. If a value is not found, use null. Do not include markdown formatting or extra text.
                    {
                        "name": "string",
                        "email": "string",
                        "mobile": "string",
                        "current_location": "string",
                        "total_years_experience": "string or number",
                        "current_company": "string",
                        "designation": "string",
                        "birth_date": "string (e.g. DD/MM/YYYY or YYYY-MM-DD)",
                        "birth_year": "string or number",
                        "tenth_percentage": "string or number (e.g. 85.5 or '85.5%')",
                        "twelfth_percentage": "string or number",
                        "college_cgpa": "string or number",
                        "college_sgpa": "string or number (Semester Grade Point Average, also known as SGPA, SPI, etc.)"
                    }`
                },
                {
                    role: 'user',
                    content: `Here is the candidate document text:\n\n${combinedText}`
                }
            ],
            model: 'llama-3.1-8b-instant', // Updated as llama3-8b-8192 is decommissioned
            temperature: 0.1,
            response_format: { type: 'json_object' }
        });

        const jsonString = completion.choices[0]?.message?.content;
        if (jsonString) {
            return JSON.parse(jsonString);
        }
    } catch (error) {
        console.error("AI Extraction failed:", error.message);
    }

    return {};
}

module.exports = {
    extractCandidateInfo
};
