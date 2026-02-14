import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { scanId } = await req.json();
    if (!scanId) throw new Error("scanId is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(supabaseUrl, serviceKey);

    // Get scan
    const { data: scan, error: scanErr } = await supabase
      .from("scans")
      .select("*")
      .eq("id", scanId)
      .single();
    if (scanErr || !scan) throw new Error("Scan not found");

    // Get signed URL for the image
    const { data: signedData } = await supabase.storage
      .from("uploads")
      .createSignedUrl(scan.image_path, 600);
    if (!signedData?.signedUrl) throw new Error("Could not create signed URL");

    // Update status to PROCESSING
    await supabase.from("scans").update({ status: "PROCESSING" }).eq("id", scanId);

    // Call Gemini via Lovable AI for image recognition
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a food recognition AI. Analyze the provided image and return a JSON object with:
{
  "top_label": "the most likely item name",
  "top_confidence": 0.0 to 1.0,
  "candidates": [{"label": "name", "confidence": 0.0}],
  "initial_category": "FOOD" or "NON_FOOD" or "UNCERTAIN",
  "assistant_message": "A friendly message presenting your findings and asking the user to confirm. If food, ask if raw/cooked. If non-food, mention it's not food and suggest uploading a food image."
}
Return ONLY valid JSON, no markdown.`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Please analyze this image and identify what's in it." },
              { type: "image_url", image_url: { url: signedData.signedUrl } }
            ]
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response (handle markdown code blocks)
    let parsed: Record<string, unknown>;
    try {
      const jsonStr = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      parsed = {
        top_label: "Unknown",
        top_confidence: 0,
        candidates: [],
        initial_category: "UNCERTAIN",
        assistant_message: "I had trouble analyzing this image. Could you try uploading a clearer photo?",
      };
    }

    // Update scan with vision results
    await supabase.from("scans").update({
      vision_result: { candidates: parsed.candidates || [] },
      top_label: parsed.top_label || "Unknown",
      top_confidence: parsed.top_confidence || 0,
      category: parsed.initial_category || "UNCERTAIN",
      status: "PROCESSING",
    }).eq("id", scanId);

    // Create first assistant message
    await supabase.from("chat_messages").insert({
      scan_id: scanId,
      role: "assistant",
      content: (parsed.assistant_message as string) || "I'm analyzing your image...",
      metadata: { candidates: parsed.candidates },
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-scan-start error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
