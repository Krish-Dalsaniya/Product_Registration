const nodemailer = require('nodemailer');
const env = require('../config/env');

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST || 'smtp.mailtrap.io',
  port: env.SMTP_PORT || 2525,
  secure: env.SMTP_PORT === 465 || env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS
  }
});

const sendEmail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: env.FROM_EMAIL || 'noreply@leons-group.com',
    to,
    subject,
    html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    // In testing environments without valid SMTP, we might just log it and not crash.
    if (env.NODE_ENV !== 'production') {
      console.log('--- Mock Email Content ---');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('Content:', html);
      console.log('--------------------------');
    } else {
      throw error;
    }
  }
};

module.exports = { sendEmail };
