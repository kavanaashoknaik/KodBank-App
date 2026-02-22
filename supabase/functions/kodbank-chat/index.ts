import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-kodbank-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getJwtKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function authenticateUser(token: string | null) {
  if (!token) return null;
  try {
    const key = await getJwtKey(Deno.env.get("JWT_SECRET")!);
    const payload = (await verify(token, key)) as Record<string, unknown>;
    return payload.sub as string;
  } catch {
    return null;
  }
}

// Tool implementations
async function getBalance(username: string) {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await supabase.from("kod_user").select("balance").eq("username", username).single();
  return data ? { balance: data.balance } : { error: "User not found" };
}

async function doDeposit(username: string, amount: number) {
  if (!amount || amount <= 0 || amount > 1000000) return { error: "Amount must be between ₹1 and ₹10,00,000" };
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: user } = await supabase.from("kod_user").select("balance").eq("username", username).single();
  if (!user) return { error: "User not found" };
  const newBal = Number(user.balance) + amount;
  await supabase.from("kod_user").update({ balance: newBal }).eq("username", username);
  await supabase.from("transactions").insert({ to_username: username, type: "deposit", amount, description: `Deposit of ₹${amount}` });
  return { success: true, newBalance: newBal };
}

async function doTransfer(fromUser: string, toUser: string, amount: number) {
  if (!amount || amount <= 0 || amount > 1000000) return { error: "Amount must be between ₹1 and ₹10,00,000" };
  if (fromUser.toLowerCase() === toUser.toLowerCase()) return { error: "Cannot transfer to yourself" };
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: sender } = await supabase.from("kod_user").select("balance").eq("username", fromUser).single();
  if (!sender) return { error: "Sender not found" };
  if (Number(sender.balance) < amount) return { error: "Insufficient balance" };
  const { data: recipient } = await supabase.from("kod_user").select("balance, username").ilike("username", toUser.trim()).single();
  if (!recipient) return { error: `Recipient '${toUser}' not found` };
  await supabase.from("kod_user").update({ balance: Number(sender.balance) - amount }).eq("username", fromUser);
  await supabase.from("kod_user").update({ balance: Number(recipient.balance) + amount }).eq("username", recipient.username);
  await supabase.from("transactions").insert({ from_username: fromUser, to_username: recipient.username, type: "transfer", amount, description: `Transfer to ${recipient.username}` });
  return { success: true, newBalance: Number(sender.balance) - amount, recipient: recipient.username };
}

async function getTransactions(username: string) {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await supabase.from("transactions").select("*").or(`from_username.eq.${username},to_username.eq.${username}`).order("created_at", { ascending: false }).limit(10);
  return { transactions: data || [] };
}

const tools = [
  {
    type: "function",
    function: {
      name: "check_balance",
      description: "Check the current account balance of the logged-in user",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "deposit_money",
      description: "Deposit money into the logged-in user's account",
      parameters: {
        type: "object",
        properties: { amount: { type: "number", description: "Amount in INR to deposit" } },
        required: ["amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "transfer_money",
      description: "Transfer money from the logged-in user's account to another user",
      parameters: {
        type: "object",
        properties: {
          to_username: { type: "string", description: "Recipient's username" },
          amount: { type: "number", description: "Amount in INR to transfer" },
        },
        required: ["to_username", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_transactions",
      description: "Get the recent transaction history of the logged-in user",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const kodbankToken = req.headers.get("x-kodbank-token");
    const username = await authenticateUser(kodbankToken);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are KodBank AI Assistant — a friendly, knowledgeable banking chatbot.
${username ? `The logged-in user is: "${username}". You can perform actions on their behalf using the available tools.` : "The user is not logged in. You can answer general banking questions but cannot perform account actions."}

Your capabilities:
- Check the user's account balance (use check_balance tool)
- Deposit money into their account (use deposit_money tool)
- Transfer money to other KodBank users (use transfer_money tool)
- View transaction history (use get_transactions tool)
- Explain banking concepts, fees, terminology
- Provide financial literacy tips

Rules:
- Use ₹ (INR) as the default currency
- Always confirm the action result to the user in a friendly way
- For transfers, always ask for the recipient username and amount if not provided
- Keep responses concise (under 150 words unless detail is needed)
- If a question is NOT related to banking/finance, politely redirect
- Be warm and professional`;

    const aiMessages = [{ role: "system", content: systemPrompt }, ...messages];

    // First AI call (may request tool calls)
    let response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        tools: username ? tools : undefined,
        stream: false,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI service unavailable");
    }

    let result = await response.json();
    let choice = result.choices?.[0];

    // Handle tool calls (loop for multi-step)
    let iterations = 0;
    while (choice?.finish_reason === "tool_calls" && choice?.message?.tool_calls && iterations < 3) {
      iterations++;
      const toolCalls = choice.message.tool_calls;
      aiMessages.push(choice.message);

      for (const tc of toolCalls) {
        const args = JSON.parse(tc.function.arguments || "{}");
        let toolResult: any;

        if (!username) {
          toolResult = { error: "User not logged in. Please login first." };
        } else {
          switch (tc.function.name) {
            case "check_balance":
              toolResult = await getBalance(username);
              break;
            case "deposit_money":
              toolResult = await doDeposit(username, args.amount);
              break;
            case "transfer_money":
              toolResult = await doTransfer(username, args.to_username, args.amount);
              break;
            case "get_transactions":
              toolResult = await getTransactions(username);
              break;
            default:
              toolResult = { error: "Unknown tool" };
          }
        }

        aiMessages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(toolResult) });
      }

      // Follow-up call with tool results
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: aiMessages,
          tools: username ? tools : undefined,
          stream: true,
        }),
      });

      if (!response.ok) throw new Error("AI follow-up failed");

      // If streaming, return directly
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // If no tool calls, stream the initial response
    // Re-do the call with streaming
    response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        tools: username ? tools : undefined,
        stream: true,
      }),
    });

    if (!response.ok) throw new Error("AI streaming failed");

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
