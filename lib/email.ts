import nodemailer from "nodemailer";

const gmailUser = process.env.GMAIL_USER?.trim();
const gmailPass = process.env.GMAIL_APP_PASSWORD?.trim();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: gmailUser,
    pass: gmailPass,
  },
});

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  console.log("GMAIL_USER:", JSON.stringify(gmailUser));
  console.log("GMAIL_PASS_length:", gmailPass?.length);
  const info = await transporter.sendMail({
    from: `"Regis Marie College" <${gmailUser}>`,
    to,
    subject,
    html,
  });
  return info;
}
