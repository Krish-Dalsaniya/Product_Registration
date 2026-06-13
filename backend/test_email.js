require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('Testing SMTP with:', process.env.SMTP_HOST, process.env.SMTP_PORT, process.env.SMTP_USER);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_PORT == 465, // true for 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  debug: true,
  logger: true
});

async function run() {
  try {
    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: 'roman@example.com', // random test email
      subject: 'Test Email',
      text: 'This is a test email'
    });
    console.log('Success:', info.messageId);
  } catch (e) {
    console.error('Failed:', e);
  }
}

run();
