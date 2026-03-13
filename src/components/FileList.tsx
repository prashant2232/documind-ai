import { FileText, Image, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useAppState, UploadedFile } from "@/context/AppContext";
import { motion, AnimatePresence } from "framer-motion";

function FileStatusIcon({ status }: { status: UploadedFile["status"] }) {
  if (status === "processing") return <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />;
  if (status === "ready") return <CheckCircle2 className="h-3.5 w-3.5 text-primary" />;
  return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileList() {
  const { files, removeFile } = useAppState();

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <div className="rounded-xl bg-muted/50 p-4 mb-3">
          <FileText className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No files uploaded yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Upload PDFs or images to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 px-2">
      <AnimatePresence>
        {files.map((file) => (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="group flex items-center gap-2.5 rounded-lg px-3 py-2.5 hover:bg-secondary/60 transition-colors cursor-default"
          >
            <div className="flex-shrink-0">
              {file.type === "pdf" ? (
                <FileText className="h-4 w-4 text-primary/80" />
              ) : (
                <Image className="h-4 w-4 text-accent/80" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate text-foreground/90">{file.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">{formatSize(file.size)}</span>
                <FileStatusIcon status={file.status} />
              </div>
            </div>
            <button
              onClick={() => removeFile(file.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/20"
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive/70" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
