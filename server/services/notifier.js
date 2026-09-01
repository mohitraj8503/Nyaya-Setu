const nodemailer = require("nodemailer");

const SIMULATION_MODE = true;

function sendStatusChangeEmail(toEmail, trackerItem, oldStatus, newStatus) {
  const email = String(toEmail || "").trim();
  const item = trackerItem || {};
  const title = item.title || "Tracker item";
  const safeOldStatus = String(oldStatus || "unknown").trim() || "unknown";
  const safeNewStatus = String(newStatus || "unknown").trim() || "unknown";

  if (!email) {
    console.log("[EMAIL SIMULATION] No email address provided for status change notification.");
    return { ok: true, simulated: true, reason: "no-email" };
  }

  if (SIMULATION_MODE) {
    console.log(
      `[EMAIL SIMULATION] Would send to ${email}: Your tracker item '${title}' status changed from ${safeOldStatus} to ${safeNewStatus}`
    );
    return { ok: true, simulated: true, email, oldStatus: safeOldStatus, newStatus: safeNewStatus };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || "noreply@nyayasetu.local",
    to: email,
    subject: `NyayaSetu tracker update: ${title}`,
    text: `Your tracker item '${title}' status changed from ${safeOldStatus} to ${safeNewStatus}.`,
  };

  return transporter
    .sendMail(mailOptions)
    .then((info) => ({ ok: true, simulated: false, info }))
    .catch((error) => {
      console.error("Email sending failed:", error);
      return { ok: false, simulated: false, error };
    });
}

module.exports = {
  sendStatusChangeEmail,
  SIMULATION_MODE,
};
