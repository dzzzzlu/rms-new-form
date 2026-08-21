import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import ChatPage from "@/components/ChatPage";

export default async function RegistrarMessagesPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return <ChatPage userId={profile.id} role={profile.role} />;
}
