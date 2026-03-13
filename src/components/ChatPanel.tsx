import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { useAppState, ChatMessage } from "@/context/AppContext";
import { MessageBubble } from "./MessageBubble";
import { motion } from "framer-motion";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

type Msg = { role: "user" | "assistant"; content: string };

async function streamChat({
  messages,
  fileContents,
  onDelta,
  onDone,
}: {
  messages: Msg[];
  fileContents: { name: string; content: string }[];
  onDelta: (deltaText: string) => void;
  onDone: () => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, fileContents }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Request failed (${resp.status})`);
  }

  if (!resp.body) throw new Error("No response body");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") { streamDone = true; break; }
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  // Final flush
  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (raw.startsWith(":") || raw.trim() === "") continue;
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }

  onDone();
}

export function ChatPanel() {
  const { messages, addMessage, files } = useAppState();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Store file text contents for context
  const fileContentsRef = useRef<{ name: string; content: string }[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Build file contents from extracted text
  useEffect(() => {
    const contents: { name: string; content: string }[] = [];
    for (const file of files) {
      if (file.status === "ready" && file.extractedText) {
        contents.push({
          name: file.name,
          content: file.extractedText,
        });
      } else if (file.status === "processing") {
        contents.push({
          name: file.name,
          content: `[File ${file.name} is still being processed...]`,
        });
      }
    }
    fileContentsRef.current = contents;
  }, [files]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };
    addMessage(userMsg);
    setInput("");
    setIsLoading(true);
    setStreamingContent("");

    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const historyMsgs: Msg[] = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: trimmed },
    ];

    let fullContent = "";

    try {
      await streamChat({
        messages: historyMsgs,
        fileContents: fileContentsRef.current,
        onDelta: (chunk) => {
          fullContent += chunk;
          setStreamingContent(fullContent);
        },
        onDone: () => {
          addMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            content: fullContent,
            timestamp: new Date(),
          });
          setStreamingContent("");
          setIsLoading(false);
        },
      });
    } catch (e) {
      console.error("Chat error:", e);
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Sorry, I encountered an error: ${e instanceof Error ? e.message : "Unknown error"}. Please try again.`,
        timestamp: new Date(),
      });
      setStreamingContent("");
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {messages.length === 0 && !streamingContent ? (
          <div className="flex flex-col items-center justify-center h-full px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center max-w-md"
            >
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-6">
                <Sparkles className="h-8 w-8 text-primary animate-pulse-glow" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">InsightAI</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Upload PDFs and images, then ask questions about their content. 
                I'll use AI to find answers from your documents.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-6">
                {["What does this document say about...?", "Summarize the key points", "Explain the diagram in...", "Compare findings across files"].map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="text-xs text-left px-3 py-2.5 rounded-lg bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors border border-border/40"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        ) : (
          <div>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {streamingContent && (
              <MessageBubble
                message={{
                  id: "streaming",
                  role: "assistant",
                  content: streamingContent,
                  timestamp: new Date(),
                }}
              />
            )}
            {isLoading && !streamingContent && (
              <div className="flex gap-3 px-4 py-5 bg-chat-assistant">
                <div className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-lg bg-accent/15 text-accent">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse" style={{ animationDelay: "0ms" }} />
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse" style={{ animationDelay: "150ms" }} />
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border/50 p-4">
        <div className="relative max-w-3xl mx-auto">
          <div className="flex items-end gap-2 rounded-xl bg-secondary/60 border border-border/60 focus-within:border-primary/40 focus-within:glow-primary transition-all px-4 py-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onInput={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your documents..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none max-h-40"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground/50 text-center mt-2">
            {files.length} file{files.length !== 1 ? "s" : ""} in knowledge base • Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
