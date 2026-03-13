import { useState, createContext, useContext, ReactNode, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface UploadedFile {
  id: string;
  name: string;
  type: "pdf" | "image";
  size: number;
  status: "processing" | "ready" | "error";
  uploadedAt: Date;
  preview?: string;
  extractedText?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { fileName: string; excerpt: string }[];
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AppState {
  files: UploadedFile[];
  messages: ChatMessage[];
  activeView: "chat" | "dashboard";
  sidebarOpen: boolean;
  sessions: ChatSession[];
  activeSessionId: string | null;
  addFile: (file: UploadedFile) => void;
  removeFile: (id: string) => void;
  updateFile: (id: string, updates: Partial<UploadedFile>) => void;
  addMessage: (msg: ChatMessage) => void;
  setActiveView: (view: "chat" | "dashboard") => void;
  setSidebarOpen: (open: boolean) => void;
  clearMessages: () => void;
  createSession: () => Promise<string>;
  switchSession: (id: string) => void;
  deleteSession: (id: string) => void;
}

const AppContext = createContext<AppState | null>(null);

export const useAppState = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState must be used within AppProvider");
  return ctx;
};

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeView, setActiveView] = useState<"chat" | "dashboard">("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Load sessions on mount / user change
  useEffect(() => {
    if (!user) {
      setSessions([]);
      setMessages([]);
      setActiveSessionId(null);
      return;
    }
    const loadSessions = async () => {
      const { data } = await supabase
        .from("chat_sessions")
        .select("*")
        .order("updated_at", { ascending: false });
      if (data) {
        setSessions(data.map((s: any) => ({
          id: s.id,
          title: s.title,
          createdAt: new Date(s.created_at),
          updatedAt: new Date(s.updated_at),
        })));
        if (data.length > 0) {
          setActiveSessionId(data[0].id);
        }
      }
    };
    loadSessions();
  }, [user]);

  // Load messages when active session changes
  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }
    const loadMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", activeSessionId)
        .order("created_at", { ascending: true });
      if (data) {
        setMessages(data.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.created_at),
        })));
      }
    };
    loadMessages();
  }, [activeSessionId]);

  const createSession = useCallback(async () => {
    if (!user) throw new Error("Not authenticated");
    const { data } = await supabase
      .from("chat_sessions")
      .insert({ title: "New Chat", user_id: user.id })
      .select()
      .single();
    if (data) {
      const session: ChatSession = {
        id: data.id,
        title: data.title,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(data.id);
      setMessages([]);
      return data.id;
    }
    throw new Error("Failed to create session");
  }, [user]);

  const switchSession = useCallback((id: string) => {
    setActiveSessionId(id);
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    await supabase.from("chat_sessions").delete().eq("id", id);
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (activeSessionId === id) {
        setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
      }
      return remaining;
    });
  }, [activeSessionId]);

  const addFile = (file: UploadedFile) => setFiles((prev) => [file, ...prev]);
  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));
  const updateFile = (id: string, updates: Partial<UploadedFile>) =>
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));

  const addMessage = useCallback(async (msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);

    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = await createSession();
    }

    await supabase.from("chat_messages").insert({
      id: msg.id,
      session_id: sessionId,
      role: msg.role,
      content: msg.content,
    });

    if (msg.role === "user") {
      const currentMessages = messages;
      const hasUserMsg = currentMessages.some((m) => m.role === "user");
      if (!hasUserMsg) {
        const title = msg.content.slice(0, 60) + (msg.content.length > 60 ? "..." : "");
        await supabase.from("chat_sessions").update({ title, updated_at: new Date().toISOString() }).eq("id", sessionId);
        setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, title } : s));
      } else {
        await supabase.from("chat_sessions").update({ updated_at: new Date().toISOString() }).eq("id", sessionId);
      }
    }
  }, [activeSessionId, createSession, messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setActiveSessionId(null);
  }, []);

  return (
    <AppContext.Provider
      value={{
        files, messages, activeView, sidebarOpen, sessions, activeSessionId,
        addFile, removeFile, updateFile, addMessage,
        setActiveView, setSidebarOpen, clearMessages,
        createSession, switchSession, deleteSession,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
