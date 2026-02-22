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
    const { amount } = await req.json();
    const depositAmount = Number(amount);

    if (!depositAmount || depositAmount <= 0 || depositAmount > 1000000) {
      return new Response(JSON.stringify({ error: "Invalid amount. Must be between 1 and 10,00,000." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get current balance
    const { data: user, error: userErr } = await supabase
      .from("kod_user")
      .select("balance, username")
      .eq("username", username)
      .single();

    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "User not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newBalance = Number(user.balance) + depositAmount;

    // Update balance
    const { error: updateErr } = await supabase
      .from("kod_user")
      .update({ balance: newBalance })
      .eq("username", username);

    if (updateErr) throw updateErr;

    // Log transaction
    await supabase.from("transactions").insert({
      to_username: username,
      type: "deposit",
      amount: depositAmount,
      description: `Deposit of ₹${depositAmount.toLocaleString("en-IN")}`,
    });

    return new Response(
      JSON.stringify({ success: true, newBalance, message: `₹${depositAmount.toLocaleString("en-IN")} deposited successfully.` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Deposit error:", err);
    return new Response(JSON.stringify({ error: "Deposit failed." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
