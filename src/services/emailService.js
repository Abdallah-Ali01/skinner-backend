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

exports.sendDoctorApprovalEmail = async ({ to, name, notes }) => {
  const notesHtml = notes && notes.trim()
    ? `<div style="margin-top: 15px; padding: 12px; background-color: #f3f4f6; border-left: 4px solid #10b981; border-radius: 4px;">
        <strong>Administrator Notes:</strong>
        <p style="margin: 5px 0 0 0; color: #4b5563;">${notes.replace(/\n/g, '<br>')}</p>
       </div>`
    : "";

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: "SKINNER - Doctor Registration Approved 🎉",
    html: `
      <h2>Hello Dr. ${name},</h2>
      <p>We are pleased to inform you that your registration application for the SKINNER Patient Portal has been reviewed and **approved**.</p>
      <p>You can now log in to your dashboard to manage your availability, view patient cases, and submit diagnosis reports.</p>
      ${notesHtml}
      <br>
      <p>Thank you for joining our network of healthcare professionals!</p>
      <p>Best regards,<br>The SKINNER Team</p>
    `
  });

  return info;
};

exports.sendDoctorRejectionEmail = async ({ to, name, notes }) => {
  const notesHtml = notes && notes.trim()
    ? `<div style="margin-top: 15px; padding: 12px; background-color: #f3f4f6; border-left: 4px solid #ef4444; border-radius: 4px;">
        <strong>Administrator Notes/Reason:</strong>
        <p style="margin: 5px 0 0 0; color: #4b5563;">${notes.replace(/\n/g, '<br>')}</p>
       </div>`
    : "";

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: "SKINNER - Doctor Registration Application Update",
    html: `
      <h2>Hello Dr. ${name},</h2>
      <p>Thank you for your interest in joining the SKINNER Patient Portal. We have reviewed your registration application.</p>
      <p>Unfortunately, your application has been **rejected** at this time and has been removed from our database. You are welcome to re-register with valid credentials.</p>
      ${notesHtml}
      <br>
      <p>Best regards,<br>The SKINNER Team</p>
    `
  });

  return info;
};