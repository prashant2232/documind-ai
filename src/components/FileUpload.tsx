import { useCallback, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { useAppState, UploadedFile } from "@/context/AppContext";
import { toast } from "@/hooks/use-toast";

const PROCESS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-document`;

export function FileUpload() {
  const { addFile, updateFile } = useAppState();
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    const isPDF = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");
    if (!isPDF && !isImage) return;

    const fileId = crypto.randomUUID();
    const uploaded: UploadedFile = {
      id: fileId,
      name: file.name,
      type: isPDF ? "pdf" : "image",
      size: file.size,
      status: "processing",
      uploadedAt: new Date(),
    };

    // Set preview for images
    if (isImage) {
      const reader = new FileReader();
      reader.onload = () => {
        uploaded.preview = reader.result as string;
        addFile(uploaded);
      };
      reader.readAsDataURL(file);
    } else {
      addFile(uploaded);
    }

    // Extract text via edge function
    try {
      const formData = new FormData();
      formData.append("file", file);

      const resp = await fetch(PROCESS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: formData,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Processing failed" }));
        throw new Error(err.error || "Processing failed");
      }

      const result = await resp.json();
      updateFile(fileId, {
        status: "ready",
        extractedText: result.text,
      });

      toast({
        title: "File processed",
        description: `${file.name} has been analyzed and is ready for questions.`,
      });
    } catch (error) {
      console.error("File processing error:", error);
      updateFile(fileId, { status: "error" });
      toast({
        title: "Processing failed",
        description: `Failed to process ${file.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  }, [addFile, updateFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    Array.from(e.dataTransfer.files).forEach(processFile);
  }, [processFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(processFile);
    }
    e.target.value = "";
  };

  return (
    <div className="px-3 pb-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 cursor-pointer transition-all
          ${dragOver
            ? "border-primary bg-primary/5 glow-primary"
            : "border-border/50 hover:border-primary/40 hover:bg-secondary/30"
          }
        `}
      >
        <Upload className={`h-5 w-5 transition-colors ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
        <div className="text-center">
          <p className="text-xs font-medium text-foreground/80">Drop files here</p>
          <p className="text-xs text-muted-foreground mt-0.5">PDF, PNG, JPG</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          multiple
          onChange={handleChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
