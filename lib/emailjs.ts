const EMAILJS_API = "https://api.emailjs.com/api/v1.0/email/send";

const SERVICE_ID = "service_nhk5a1v";
const TEMPLATE_ID = "template_sbsok4n";
const PUBLIC_KEY = "UYVOvfUlIE-yUdJR1";

export async function sendEmailJS({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const res = await fetch(EMAILJS_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: SERVICE_ID,
      template_id: TEMPLATE_ID,
      user_id: PUBLIC_KEY,
      template_params: {
        to_email: to,
        subject,
        html_content: html,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("EmailJS error:", res.status, text);
    throw new Error(`EmailJS failed: ${res.status}`);
  }

  return res.text();
}
