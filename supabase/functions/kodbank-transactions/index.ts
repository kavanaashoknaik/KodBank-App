import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-kodbank-token",
};

async function getJwtKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = req.headers.get("x-kodbank-token");
    if (!token) {
      return new Response(JSON.stringify({ error: "Authentication required." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = await getJwtKey(Deno.env.get("JWT_SECRET")!);
    let payload: Record<string, unknown>;
    try {
      payload = (await verify(token, key)) as Record<string, unknown>;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid or expired token." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const username = payload.sub as string;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .or(`from_username.eq.${username},to_username.eq.${username}`)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, transactions: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Transactions error:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch transactions." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
