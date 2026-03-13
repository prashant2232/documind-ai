import ReactMarkdown from "react-markdown";
import { Bot, User, FileText } from "lucide-react";
import { ChatMessage } from "@/context/AppContext";
import { motion } from "framer-motion";

interface Props {
  message: ChatMessage;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 px-4 py-5 ${isUser ? "bg-chat-user" : "bg-chat-assistant"}`}
    >
      <div className={`flex-shrink-0 mt-0.5 flex items-center justify-center h-7 w-7 rounded-lg ${isUser ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent"}`}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0 space-y-3">
        <div className="prose prose-invert prose-sm max-w-none prose-p:text-foreground/85 prose-headings:text-foreground prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-strong:text-foreground">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>

        {message.sources && message.sources.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sources</p>
            {message.sources.map((source, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg bg-muted/50 border border-border/50 px-3 py-2">
                <FileText className="h-3.5 w-3.5 mt-0.5 text-primary/70 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground/80">{source.fileName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{source.excerpt}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
