"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send, MessageSquare } from "lucide-react";

type Profile = { id: string; full_name: string; role: string };
type Message = {
  id: number;
  sender_id: string;
  receiver_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
  sender?: { full_name: string } | null;
  receiver?: { full_name: string } | null;
};

type Conversation = {
  partnerId: string;
  partnerName: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
};

export default function ChatPage({ userId, role }: { userId: string; role: string }) {
  const supabase = createClient();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activePartner, setActivePartner] = useState<string | null>(null);
  const [activePartnerName, setActivePartnerName] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
    loadProfiles();
  }, []);

  useEffect(() => {
    if (activePartner) loadMessages(activePartner);
  }, [activePartner]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadProfiles() {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .neq("id", userId);
    setAllProfiles((data as Profile[]) ?? []);
  }

  async function loadConversations() {
    const { data: sent } = await supabase
      .from("messages")
      .select("id, sender_id, receiver_id, message, created_at, is_read")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (!sent) return;

    const convMap = new Map<string, Conversation>();
    for (const msg of sent as Message[]) {
      const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      if (!partnerId || partnerId === userId) continue;
      if (!convMap.has(partnerId)) {
        const unread = msg.sender_id !== userId && !msg.is_read ? 1 : 0;
        convMap.set(partnerId, {
          partnerId,
          partnerName: "",
          lastMessage: msg.message,
          lastTime: msg.created_at,
          unread,
        });
      } else if (msg.sender_id !== userId && !msg.is_read) {
        convMap.get(partnerId)!.unread++;
      }
    }

    const partnerIds = [...convMap.keys()];
    if (partnerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", partnerIds);
      for (const p of (profiles ?? []) as { id: string; full_name: string }[]) {
        if (convMap.has(p.id)) convMap.get(p.id)!.partnerName = p.full_name;
      }
    }

    setConversations([...convMap.values()].sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime()));
  }

  async function loadMessages(partnerId: string) {
    setActivePartner(partnerId);
    const partner = allProfiles.find((p) => p.id === partnerId);
    setActivePartnerName(partner?.full_name ?? "User");

    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, receiver_id, message, is_read, created_at, sender:profiles!sender_id(full_name), receiver:profiles!receiver_id(full_name)")
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`)
      .order("created_at", { ascending: true });

    setMessages((data as unknown as Message[]) ?? []);

    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("sender_id", partnerId)
      .eq("receiver_id", userId)
      .eq("is_read", false);

    loadConversations();
  }

  async function sendMessage() {
    if (!newMessage.trim() || !activePartner) return;
    const text = newMessage.trim();
    setNewMessage("");

    const { error } = await supabase.from("messages").insert({
      sender_id: userId,
      receiver_id: activePartner,
      message: text,
    });

    if (!error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender_id: userId,
          receiver_id: activePartner,
          message: text,
          is_read: false,
          created_at: new Date().toISOString(),
          sender: { full_name: "You" },
        },
      ]);
      loadConversations();
    }
  }

  const filteredProfiles = allProfiles.filter((p) => {
    if (role === "student") {
      return ["registrar", "admin", "guidance"].includes(p.role);
    }
    return true;
  }).filter((p) => p.full_name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="card flex h-[calc(100vh-10rem)] overflow-hidden p-0">
      {/* Sidebar — conversations */}
      <div className="flex w-72 flex-col border-r border-slate-200">
        <div className="border-b border-slate-200 p-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-brand-900">Messages</h2>
          </div>
          <button
            onClick={() => setShowNewChat(!showNewChat)}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <MessageSquare className="h-4 w-4" />
            {showNewChat ? "Cancel" : "New Chat"}
          </button>
        </div>

        {showNewChat && (
          <div className="border-b border-slate-200 p-3">
            <input
              className="input text-sm"
              placeholder="Search people…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
              {filteredProfiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setActivePartner(p.id);
                    setActivePartnerName(p.full_name);
                    setShowNewChat(false);
                    setSearchQuery("");
                    loadMessages(p.id);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-brand-50"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                    {p.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{p.full_name}</p>
                    <p className="text-xs text-slate-400 capitalize">{p.role}</p>
                  </div>
                </button>
              ))}
              {filteredProfiles.length === 0 && (
                <p className="py-2 text-center text-xs text-slate-400">No users found.</p>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <MessageSquare className="mb-2 h-8 w-8 text-slate-300" />
              <p className="text-xs text-slate-400">No conversations yet.</p>
              <p className="text-xs text-slate-400">Click the button above to start one.</p>
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.partnerId}
                onClick={() => loadMessages(c.partnerId)}
                className={`flex w-full items-center gap-3 border-b border-slate-100 px-3 py-3 text-left transition-colors hover:bg-slate-50 ${
                  activePartner === c.partnerId ? "bg-brand-50" : ""
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {c.partnerName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium text-slate-800">{c.partnerName || "Unknown"}</p>
                    <span className="ml-2 shrink-0 text-[10px] text-slate-400">
                      {new Date(c.lastTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="truncate text-xs text-slate-500">{c.lastMessage}</p>
                    {c.unread > 0 && (
                      <span className="ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main — messages */}
      {activePartner ? (
        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
              {activePartnerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{activePartnerName}</p>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m) => {
              const isMine = m.sender_id === userId;
              return (
                <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                      isMine
                        ? "rounded-br-md bg-brand-600 text-white"
                        : "rounded-bl-md bg-slate-100 text-slate-800"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{m.message}</p>
                    <p className={`mt-1 text-[10px] ${isMine ? "text-brand-200" : "text-slate-400"}`}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-200 px-4 py-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                className="input flex-1"
                placeholder="Type a message…"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="rounded-xl bg-brand-600 p-2.5 text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <MessageSquare className="mb-3 h-12 w-12 text-slate-200" />
          <p className="text-sm font-medium text-slate-500">Select a conversation</p>
          <p className="text-xs text-slate-400">or start a new one from the sidebar</p>
        </div>
      )}
    </div>
  );
}
