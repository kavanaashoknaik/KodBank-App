import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-kodbank-token",
  "Access-Control-Allow-Credentials": "true",
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
    // Extract token from header (sent by frontend from localStorage)
    const token = req.headers.get("x-kodbank-token");

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Authentication required. Please login." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jwtSecret = Deno.env.get("JWT_SECRET")!;
    const key = await getJwtKey(jwtSecret);

    // Verify JWT signature & expiry
    let payload: Record<string, unknown>;
    try {
      payload = await verify(token, key) as Record<string, unknown>;
    } catch (jwtErr) {
      const msg = String(jwtErr);
      if (msg.includes("expired") || msg.includes("exp")) {
        return new Response(
          JSON.stringify({ error: "Session expired. Please login again." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Invalid token. Please login again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const username = payload.sub as string;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify token exists in DB (not revoked)
    const { data: tokenRecord } = await supabase
      .from("user_token")
      .select("tid, expiry")
      .eq("token", token)
      .single();

    if (!tokenRecord) {
      return new Response(
        JSON.stringify({ error: "Invalid session. Please login again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check DB-level expiry too
    if (new Date(tokenRecord.expiry) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Session expired. Please login again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch balance
    const { data: user, error } = await supabase
      .from("kod_user")
      .select("balance, username")
      .eq("username", username)
      .single();

    if (error || !user) {
      return new Response(
        JSON.stringify({ error: "User not found." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, balance: user.balance, username: user.username }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Balance error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch balance. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
