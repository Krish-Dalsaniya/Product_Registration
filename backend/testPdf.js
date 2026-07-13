const puppeteer = require('puppeteer');
const fs = require('fs');

async function run() {
    try {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
        });
        const page = await browser.newPage();
        await page.setContent("<h1>Test</h1>", { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', landscape: true, printBackground: true });
        await browser.close();
        
        console.log("Success, buffer size:", pdfBuffer.length);
        process.exit(0);
    } catch(err) {
        console.error("Error:", err);
        process.exit(1);
    }
}
run();
