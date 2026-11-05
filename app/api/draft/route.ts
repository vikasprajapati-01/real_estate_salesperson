import { Type } from "@google/genai";
import { NextResponse } from "next/server";
import { generate } from "@/lib/gemini";
import { DRAFT_SYSTEM_PROMPT, buildDraftText } from "@/lib/prompts";

export const maxDuration = 60;

const GOALS: Record<string, string> = {
  first_reply: "A first reply to the customer's inquiry. Acknowledge what they asked for and ask one question to move forward.",
  follow_up: "A follow-up because the customer has not replied. Do not sound pushy. Give one reason to respond.",
  site_visit: "An invitation to a site visit or a call. Suggest two time options and ask which suits them.",
};

const TONES: Record<string, string> = {
  friendly: "warm and friendly",
  professional: "polite and professional",
  assertive: "confident and direct, creating gentle urgency without pressure",
};

export async function POST(req: Request) {
  const { lead, goal, tone } = await req.json();
  if (!lead?.input || !lead?.analysis || !GOALS[goal] || !TONES[tone]) {
    return NextResponse.json({ error: "Missing lead, goal or tone" }, { status: 400 });
  }
  try {
    const res = await generate({
      contents: buildDraftText(lead, GOALS[goal], TONES[tone]),
      config: {
        systemInstruction: DRAFT_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { subject: { type: Type.STRING }, body: { type: Type.STRING } },
          required: ["subject", "body"],
        },
        temperature: 0.6,
      },
    });
    const raw = JSON.parse(res.text ?? "");
    const subject = String(raw?.subject ?? "").trim();
    const body = String(raw?.body ?? "").trim();
    if (!subject || !body) throw new Error("Empty draft");
    return NextResponse.json({ draft: { subject, body } });
  } catch (e) {
    console.error(e);
    const status = (e as { status?: number }).status;
    const busy = status === 503 || status === 504 || status === 429;
    return NextResponse.json(
      { error: busy ? "The AI service is busy right now. Please try again in a moment." : "Could not write the email, please retry" },
      { status: busy ? 503 : 502 },
    );
  }
}