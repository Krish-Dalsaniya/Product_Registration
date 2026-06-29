const fs = require('fs');
const AdmZip = require('adm-zip');
const pdfParse = require('pdf-parse');

(async () => {
    try {
        // Create a dummy PDF
        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument();
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', async () => {
            const pdfData = Buffer.concat(buffers);
            
            // Zip it
            const zip = new AdmZip();
            zip.addFile("test.pdf", pdfData);
            const zipBuffer = zip.toBuffer();
            
            // Read it back like the controller
            const readZip = new AdmZip(zipBuffer);
            const entries = readZip.getEntries();
            let combinedText = '';
            
            for (const entry of entries) {
                if (entry.isDirectory) continue;
                const ext = entry.entryName.split('.').pop().toLowerCase();
                const data = entry.getData();
                
                try {
                    if (ext === 'pdf') {
                        const parsed = await pdfParse(data);
                        combinedText += `\n--- Content from ${entry.entryName} ---\n${parsed.text}\n`;
                    }
                } catch (e) {
                    console.error("Caught error:", e);
                }
            }
            
            console.log("Combined Text:", combinedText.trim() === '' ? "EMPTY" : combinedText);
        });
        
        doc.text('Hello world');
        doc.end();
        
    } catch (e) {
        console.error("Error:", e);
    }
})();
