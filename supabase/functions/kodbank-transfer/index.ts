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

    const senderUsername = payload.sub as string;
    const { to_username, amount } = await req.json();
    const transferAmount = Number(amount);

    if (!to_username || typeof to_username !== "string" || to_username.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Recipient username is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!transferAmount || transferAmount <= 0 || transferAmount > 1000000) {
      return new Response(JSON.stringify({ error: "Invalid amount. Must be between 1 and 10,00,000." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (to_username.trim().toLowerCase() === senderUsername.toLowerCase()) {
      return new Response(JSON.stringify({ error: "Cannot transfer to yourself." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get sender
    const { data: sender, error: sErr } = await supabase
      .from("kod_user")
      .select("balance, username")
      .eq("username", senderUsername)
      .single();

    if (sErr || !sender) {
      return new Response(JSON.stringify({ error: "Sender not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (Number(sender.balance) < transferAmount) {
      return new Response(JSON.stringify({ error: "Insufficient balance." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get recipient
    const { data: recipient, error: rErr } = await supabase
      .from("kod_user")
      .select("balance, username")
      .ilike("username", to_username.trim())
      .single();

    if (rErr || !recipient) {
      return new Response(JSON.stringify({ error: `Recipient '${to_username.trim()}' not found.` }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update balances
    const { error: u1 } = await supabase
      .from("kod_user")
      .update({ balance: Number(sender.balance) - transferAmount })
      .eq("username", senderUsername);

    const { error: u2 } = await supabase
      .from("kod_user")
      .update({ balance: Number(recipient.balance) + transferAmount })
      .eq("username", recipient.username);

    if (u1 || u2) throw new Error("Balance update failed");

    // Log transaction
    await supabase.from("transactions").insert({
      from_username: senderUsername,
      to_username: recipient.username,
      type: "transfer",
      amount: transferAmount,
      description: `Transfer from ${senderUsername} to ${recipient.username}`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        newBalance: Number(sender.balance) - transferAmount,
        message: `₹${transferAmount.toLocaleString("en-IN")} transferred to ${recipient.username} successfully.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Transfer error:", err);
    return new Response(JSON.stringify({ error: "Transfer failed." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
