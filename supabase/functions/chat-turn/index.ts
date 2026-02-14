import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { scanId, userMessage } = await req.json();
    if (!scanId || !userMessage) throw new Error("scanId and userMessage required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const USDA_API_KEY = Deno.env.get("USDA_FDC_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(supabaseUrl, serviceKey);

    // Get scan
    const { data: scan } = await supabase.from("scans").select("*").eq("id", scanId).single();
    if (!scan) throw new Error("Scan not found");

    // Insert user message
    await supabase.from("chat_messages").insert({
      scan_id: scanId,
      role: "user",
      content: userMessage,
    });

    // Get chat history
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("scan_id", scanId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Build AI prompt
    const systemPrompt = `You are a food recognition and nutrition assistant called FoodLens. You're in a conversation with a user about an image they uploaded.

Current scan state:
- Top label: ${scan.top_label || "unknown"}
- Confidence: ${scan.top_confidence || 0}
- Category: ${scan.category || "UNCERTAIN"}
- Vision candidates: ${JSON.stringify(scan.vision_result?.candidates || [])}
- Confirmed food name: ${scan.final_food_name || "not confirmed"}
- Current nutrition data: ${scan.nutrition ? "available" : "not yet fetched"}

Your job:
1. Help confirm what the item is through conversation
2. Classify as FOOD, NON_FOOD, or UNCERTAIN
3. If FOOD: ask about preparation (raw/cooked/fried/baked) and portion size (grams, pieces, cups)
4. NEVER invent nutrition values. Only show nutrition when USDA data is available.
5. If NON_FOOD: clearly state it's not food, don't show nutrition, suggest uploading a food image.

You MUST return your response as JSON with exactly these fields:
{
  "assistant_message": "your friendly response to the user",
  "state_update": {
    "category": "FOOD" | "NON_FOOD" | "UNCERTAIN",
    "confirmed_name": "string or null",
    "preparation": "raw" | "cooked" | "fried" | "baked" | "mixed" | null,
    "portion": { "amount": number_or_null, "unit": "g" | "piece" | "cup" | "tbsp" | "tsp" | null },
    "needs_more_info": true/false,
    "next_question": "string or null"
  }
}
Return ONLY valid JSON, no markdown.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    ];

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    let parsed: { assistant_message: string; state_update: Record<string, unknown> };
    try {
      const jsonStr = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = {
        assistant_message: rawContent || "I'm not sure about that. Could you clarify?",
        state_update: { category: scan.category, needs_more_info: true },
      };
    }

    const stateUpdate = parsed.state_update || {};
    const scanUpdate: Record<string, unknown> = {};

    if (stateUpdate.category) scanUpdate.category = stateUpdate.category;
    if (stateUpdate.confirmed_name) scanUpdate.final_food_name = stateUpdate.confirmed_name;

    // If FOOD confirmed with name and portion, fetch USDA data
    if (
      stateUpdate.category === "FOOD" &&
      stateUpdate.confirmed_name &&
      !stateUpdate.needs_more_info &&
      USDA_API_KEY
    ) {
      try {
        const foodName = stateUpdate.confirmed_name as string;
        const usdaRes = await fetch(
          `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(foodName)}&pageSize=1&api_key=${USDA_API_KEY}`
        );
        const usdaData = await usdaRes.json();
        const food = usdaData.foods?.[0];

        if (food) {
          const nutrients = food.foodNutrients || [];
          const getNutrient = (name: string) => {
            const n = nutrients.find((n: { nutrientName: string }) =>
              n.nutrientName?.toLowerCase().includes(name.toLowerCase())
            );
            return n?.value || 0;
          };

          const portion = stateUpdate.portion as { amount?: number; unit?: string } | null;
          const grams = portion?.amount && portion?.unit === "g" ? portion.amount : 100;
          const scale = grams / 100;

          const nutrition = {
            food_name: food.description,
            fdc_id: food.fdcId,
            serving_size: `${grams}g`,
            calories: Math.round(getNutrient("Energy") * scale),
            protein: Math.round(getNutrient("Protein") * scale * 10) / 10,
            carbs: Math.round(getNutrient("Carbohydrate") * scale * 10) / 10,
            fat: Math.round(getNutrient("Total lipid") * scale * 10) / 10,
            fiber: Math.round(getNutrient("Fiber") * scale * 10) / 10,
          };

          scanUpdate.nutrition = nutrition;
          scanUpdate.usda_food = { fdcId: food.fdcId, description: food.description };
          scanUpdate.status = "DONE";
        }
      } catch (usdaErr) {
        console.error("USDA error:", usdaErr);
      }
    }

    if (stateUpdate.category === "NON_FOOD") {
      scanUpdate.status = "DONE";
    }

    // Update scan
    if (Object.keys(scanUpdate).length > 0) {
      await supabase.from("scans").update(scanUpdate).eq("id", scanId);
    }

    // Insert assistant message
    await supabase.from("chat_messages").insert({
      scan_id: scanId,
      role: "assistant",
      content: parsed.assistant_message,
      metadata: stateUpdate,
    });

    return new Response(
      JSON.stringify({ assistantMessage: parsed.assistant_message, scanUpdateSummary: scanUpdate }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("chat-turn error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
