const fs = require('fs');
const { PDFParse } = require('pdf-parse');
const Groq = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

(async () => {
    try {
        const buffer = fs.readFileSync('uploads/candidates/1783055338166-Arjun_Resume.pdf');
        const p = new PDFParse({ data: buffer });
        const t = await p.getText();
        await p.destroy();
        
        console.log("Extracted text length:", t.text.length);

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
                        "birth_year": "string or number",
                        "tenth_percentage": "string or number",
                        "twelfth_percentage": "string or number",
                        "college_cgpa": "string or number"
                    }`
                },
                {
                    role: 'user',
                    content: `Here is the candidate document text:\n\n${t.text.substring(0, 20000)}`
                }
            ],
            model: 'llama-3.1-8b-instant',
            temperature: 0.1,
            response_format: { type: 'json_object' }
        });
        
        console.log("JSON Result:", completion.choices[0]?.message?.content);
    } catch (e) {
        console.error("Error:", e.message);
    }
})();
