import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Buffer } from "node:buffer";
import pdfParse from "npm:pdf-parse@1.1.1/lib/pdf-parse.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function extractWithVisionApi(pdfBytes: Uint8Array): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const base64Pdf = arrayBufferToBase64(pdfBytes.buffer);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Extract ALL text from this PDF document. Return only the raw extracted text, preserving the structure (headings, bullet points, sections). Do not add any commentary." },
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${base64Pdf}`,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Vision API error:", response.status, err);
    throw new Error(`Vision API failed: ${response.status}`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content || "";
}

async function extractPdfText(pdfBytes: Uint8Array): Promise<string> {
  // Try native extraction first
  try {
    const data = await pdfParse(Buffer.from(pdfBytes));
    const text = data.text || "";

    // Quality check: enough meaningful text?
    const hasGoodText =
      text.length > 200 &&
      (text.match(/[a-zA-Z]/g) || []).length > 100;

    if (hasGoodText) {
      console.log("Native PDF extraction successful, text length:", text.length);
      return text;
    }

    console.log("Native extraction poor quality, falling back to Vision API");
  } catch (error) {
    console.error("pdf-parse failed:", error);
  }

  // Fallback: Vision API for scanned documents
  return await extractWithVisionApi(pdfBytes);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fileName = file.name;
    const fileType = file.type;

    // Handle images: use Vision API to describe
    if (fileType.startsWith("image/")) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      const bytes = new Uint8Array(await file.arrayBuffer());
      const base64 = arrayBufferToBase64(bytes.buffer);

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Describe this image in detail. Include all text visible in the image, any diagrams, charts, or visual elements. Be thorough and specific." },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${fileType};base64,${base64}`,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Image analysis failed: ${err}`);
      }

      const result = await response.json();
      const description = result.choices?.[0]?.message?.content || "Could not analyze image.";

      return new Response(JSON.stringify({ text: description, fileName, type: "image" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle PDFs
    if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const text = await extractPdfText(bytes);

      return new Response(JSON.stringify({ text, fileName, type: "pdf" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unsupported file type" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-document error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
