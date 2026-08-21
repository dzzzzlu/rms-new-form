import { createClient } from "@/lib/supabase/client";

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

  fetch("/api/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: receiverId, subject, html }),
  });
}
