const fs = require('fs');
const tesseract = require('tesseract.js');
const pdf = require('pdf-parse');

(async () => {
    try {
        // Test PDF
        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument();
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', async () => {
            const pdfData = Buffer.concat(buffers);
            try {
                let parsedText = '';
                const { PDFParse } = require('pdf-parse');
                const parser = new PDFParse({ data: pdfData });
                const parsed = await parser.getText();
                parsedText = parsed.text;
                console.log("PDF parsed successfully, text length:", parsedText.length);
            } catch (e) {
                console.error("PDF parsing error:", e);
            }
        });
        doc.text('Hello world PDF');
        doc.end();

    } catch (e) {
        console.error("General error:", e);
    }
})();
