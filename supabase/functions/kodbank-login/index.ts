import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const { username, password } = await req.json();

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: "Username and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch user
    const { data: user, error } = await supabase
      .from("kod_user")
      .select("uid, username, email, password, role")
      .eq("username", username)
      .single();

    if (error || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid username or password" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return new Response(
        JSON.stringify({ error: "Invalid username or password" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate JWT
    const jwtSecret = Deno.env.get("JWT_SECRET")!;
    const key = await getJwtKey(jwtSecret);
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24);

    const token = await create(
      { alg: "HS256", typ: "JWT" },
      {
        sub: user.username,
        role: user.role,
        uid: user.uid,
        exp: getNumericDate(60 * 60 * 24), // 24 hours
      },
      key
    );

    // Store token in UserToken table
    await supabase.from("user_token").insert([{
      token,
      uid: user.uid,
      expiry: expiryDate.toISOString(),
    }]);

    return new Response(
      JSON.stringify({ success: true, token, username: user.username, role: user.role }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Set-Cookie": `kodbank_token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=None; Secure`,
        },
      }
    );
  } catch (err) {
    console.error("Login error:", err);
    return new Response(
      JSON.stringify({ error: "Login failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
