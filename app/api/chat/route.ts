import { NextResponse } from "next/server";
import { generate } from "@/lib/gemini";
import { CHAT_SYSTEM_PROMPT } from "@/lib/prompts";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { lead, history, message } = await req.json();
  if (!lead || !message) {
    return NextResponse.json({ error: "Missing lead or message" }, { status: 400 });
  }
  try {
    const contents = [
      ...(history ?? []).map((m: { role: string; text: string }) => ({
        role: m.role,
        parts: [{ text: m.text }],
      })),
      { role: "user", parts: [{ text: message }] },
    ];
    const res = await generate({
      contents,
      config: {
        systemInstruction: CHAT_SYSTEM_PROMPT(JSON.stringify({ input: lead.input, analysis: lead.analysis })),
        temperature: 0.6,
      },
    });
    return NextResponse.json({ reply: res.text ?? "" });
  } catch (e) {
    console.error(e);
    const status = (e as { status?: number }).status;
    const busy = status === 503 || status === 504 || status === 429;
    return NextResponse.json(
      { error: busy ? "The AI service is busy right now. Please try again in a moment." : "Chat failed, please retry" },
      { status: busy ? 503 : 502 },
    );
  }
}