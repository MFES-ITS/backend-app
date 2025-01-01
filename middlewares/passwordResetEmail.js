const nodemailer = require('nodemailer');
require('dotenv').config();

const sendEmail = async (to, code) => {
    const subject = 'MFES reset password';
    const text = `Here is your 6-digits reset password code ${code}.`
    try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Use a service like Gmail, Outlook, etc.
      auth: {
        user: process.env.APP_EMAIL, // Your email address
        pass: process.env.APP_PASSWORD, // Your email password or app-specific password
      },
    });

    // Email options
    const mailOptions = {
      from: process.env.APP_EMAIL, // Sender address
      to,                          // Receiver address
      subject,                     // Email subject
      text,                        // Plain text message
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    return info.response
  } catch (error) {
    return error(`Error sending email: ${error.message}`);
  }
};

// Example usage
//sendEmail('recipient@example.com', 'Password Reset', 'Your code is 123456.');

module.exports = sendEmail;