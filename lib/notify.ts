import emailjs from "@emailjs/browser";
import { createClient } from "@/lib/supabase/client";

const SERVICE_ID = "service_31gows4";
const TEMPLATE_ID = "template_wq8k3ef";
const PUBLIC_KEY = "yMI6tCex_8jAN7IFu";

export async function sendNotification({
  senderId,
  receiverId,
  message,
  subject,
  html,
  link = "",
}: {
  senderId: string;
  receiverId: string;
  message: string;
  subject: string;
  html: string;
  link?: string;
}) {
  const supabase = createClient();

  await supabase.from("messages").insert({
    sender_id: senderId,
    receiver_id: receiverId,
    message,
  });

  try {
    await supabase.from("notifications").insert({
      user_id: receiverId,
      message,
      link,
    });
  } catch (err) {
    console.error("In-app notification insert error:", err);
  }

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
