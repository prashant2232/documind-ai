import { FileText, Image, Trash2, Loader2, CheckCircle2, AlertCircle, Search } from "lucide-react";
import { useAppState } from "@/context/AppContext";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Dashboard() {
  const { files, removeFile } = useAppState();
  const [search, setSearch] = useState("");

  const filtered = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const statusLabel = (s: string) => {
    if (s === "processing") return { text: "Processing", color: "text-primary bg-primary/10" };
    if (s === "ready") return { text: "Ready", color: "text-primary bg-primary/10" };
    return { text: "Error", color: "text-destructive bg-destructive/10" };
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border/50 px-6 py-4">
        <h1 className="text-lg font-semibold text-foreground">Document Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your uploaded knowledge base</p>
      </div>

      <div className="px-6 py-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-secondary/60 border border-border/60 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {files.length === 0 ? "No files uploaded yet" : "No files match your search"}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {filtered.map((file) => {
                const status = statusLabel(file.status);
                return (
                  <motion.div
                    key={file.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group rounded-xl bg-card border border-border/50 p-4 hover:border-primary/30 transition-all"
                  >
                    {file.type === "image" && file.preview ? (
                      <div className="rounded-lg overflow-hidden bg-muted mb-3 aspect-video">
                        <img src={file.preview} alt={file.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center rounded-lg bg-muted/50 mb-3 aspect-video">
                        <FileText className="h-10 w-10 text-primary/30" />
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate text-foreground/90">{file.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(0)} KB
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${status.color}`}>
                            {status.text}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(file.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-destructive/20"
                      >
                        <Trash2 className="h-4 w-4 text-destructive/70" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
