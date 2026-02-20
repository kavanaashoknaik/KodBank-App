import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { uid, username, password, email, phone, role } = await req.json();

    // Validate inputs
    if (!username || !password || !email || !phone) {
      return new Response(
        JSON.stringify({ error: "All fields are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (role && role !== "Customer") {
      return new Response(
        JSON.stringify({ error: "Only 'Customer' role is allowed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Encrypt password with bcrypt (10 rounds)
    const hashedPassword = await bcrypt.hash(password, 10);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Insert user
    const insertData: Record<string, unknown> = {
      username,
      email,
      password: hashedPassword,
      phone,
      role: "Customer",
      balance: 100000,
    };
    if (uid) insertData.uid = uid;

    const { data, error } = await supabase
      .from("kod_user")
      .insert([insertData])
      .select("uid, username, email, role")
      .single();

    if (error) {
      if (error.code === "23505") {
        return new Response(
          JSON.stringify({ error: "Username or email already exists" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, user: data }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Register error:", err);
    return new Response(
      JSON.stringify({ error: "Registration failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
