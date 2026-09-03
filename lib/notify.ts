import emailjs from "@emailjs/browser";
import { createClient } from "@/lib/supabase/client";

const SERVICE_ID = "service_nhk5a1v";
const TEMPLATE_ID = "template_sbsok4n";
const PUBLIC_KEY = "UYVOvfUlIE-yUdJR1";

export async function sendNotification({
  senderId,
  receiverId,
  message,
  subject,
  html,
}: {
  senderId: string;
  receiverId: string;
  message: string;
  subject: string;
  html: string;
}) {
  const supabase = createClient();

  await supabase.from("messages").insert({
    sender_id: senderId,
    receiver_id: receiverId,
    message,
  });

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", receiverId)
    .single();

  if (profile?.email) {
    try {
      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          to_email: profile.email,
          subject,
          html_content: html,
        },
        { publicKey: PUBLIC_KEY }
      );
    } catch (err) {
      console.error("EmailJS notification error:", err);
    }
  }
}
