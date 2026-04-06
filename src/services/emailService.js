const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

exports.verifyEmailConnection = async () => {
  return transporter.verify();
};

exports.sendResetPasswordOtpEmail = async ({ to, otpCode }) => {
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: "SKINNER Password Reset Code",
    html: `
      <h2>Password Reset Code</h2>
      <p>Your SKINNER password reset code is:</p>
      <h1 style="letter-spacing: 4px;">${otpCode}</h1>
      <p>This code expires in 15 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    `
  });

  return info;
};