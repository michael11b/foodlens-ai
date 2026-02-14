import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { scanId, mode, preferences } = await req.json();
    if (!scanId || !mode) throw new Error("scanId and mode required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: scan } = await supabase.from("scans").select("*").eq("id", scanId).single();
    if (!scan) throw new Error("Scan not found");
    if (scan.category !== "FOOD") throw new Error("Can only get ideas for food items");
    if (!scan.final_food_name) throw new Error("Food name not confirmed yet");

    const modeLabels: Record<string, string> = {
      smoothie: "smoothie recipes",
      recipe: "cooking recipes",
      add_to_meal: "meal planning ideas",
      healthier: "healthier alternatives",
    };

    const prompt = `You are a creative food and nutrition assistant. The user has identified "${scan.final_food_name}" and wants ${modeLabels[mode] || "recipe ideas"}.
${preferences ? `User preferences: ${preferences}` : ""}

Generate 5 creative ideas. Each idea should have:
- A catchy name
- Brief ingredient list
- Simple steps (3-5 steps)
- Estimated time
- A short qualitative nutrition note (do NOT invent specific calorie numbers)

Format as JSON:
{
  "ideas": [
    {
      "name": "string",
      "ingredients": ["string"],
      "steps": ["string"],
      "time_estimate": "string",
      "nutrition_note": "string"
    }
  ],
  "disclaimer": "AI-generated suggestions. Verify nutritional info independently."
}

Return ONLY valid JSON, no markdown.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a creative recipe and meal planning assistant. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    let parsed: { ideas: unknown[]; disclaimer: string };
    try {
      const jsonStr = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = { ideas: [], disclaimer: "Failed to generate ideas. Please try again." };
    }

    // Store structured ideas in metadata for card rendering
    const assistantMsg = `Here are some ${modeLabels[mode] || "ideas"} with ${scan.final_food_name}. Tap any card to see the full recipe!`;

    // Insert as chat message with structured ideas in metadata
    await supabase.from("chat_messages").insert({
      scan_id: scanId,
      role: "assistant",
      content: assistantMsg,
      metadata: { mode, ideas: parsed.ideas, display_type: "recipe_cards" },
    });

    return new Response(
      JSON.stringify({ ideas: parsed.ideas }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("get-ideas error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
