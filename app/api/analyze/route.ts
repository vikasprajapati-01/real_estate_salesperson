import { Type } from "@google/genai";
import { NextResponse } from "next/server";
import { generate } from "@/lib/gemini";
import { ANALYSIS_SYSTEM_PROMPT, buildLeadText } from "@/lib/prompts";
import type { Analysis, Priority } from "@/lib/types";
import { limited } from "@/lib/rateLimit";

export const maxDuration = 60;

const CHANNELS = ["call", "whatsapp", "email"] as const;

function clean(raw: any): Analysis {
  const score = Math.min(10, Math.max(1, Math.round(Number(raw?.score)) || 1));
  const priority: Priority = ["hot", "warm", "cold"].includes(raw?.priority)
    ? raw.priority
    : score >= 8 ? "hot" : score >= 5 ? "warm" : "cold";
  const list = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
  return {
    summary: String(raw?.summary ?? ""),
    intent: String(raw?.intent ?? ""),
    keyRequirements: list(raw?.keyRequirements),
    objections: list(raw?.objections),
    nextAction: String(raw?.nextAction ?? ""),
    suggestedResponse: String(raw?.suggestedResponse ?? ""),
    score,
    priority,
    scoreReason: String(raw?.scoreReason ?? ""),
    followUps: (Array.isArray(raw?.followUps) ? raw.followUps : []).map((f: any) => ({
      dayOffset: Math.max(0, Math.round(Number(f?.dayOffset)) || 0),
      channel: CHANNELS.includes(f?.channel) ? f.channel : "call",
      action: String(f?.action ?? ""),
      message: String(f?.message ?? ""),
    })),
  };
}

export async function POST(req: Request) {
  const blocked = limited(req);
  if (blocked) return blocked;
  const input = await req.json();
  if (!input?.name || !input?.message) {
    return NextResponse.json({ error: "Name and message are required" }, { status: 400 });
  }
  if (String(input.message).length > 4000) {
    return NextResponse.json({ error: "Message is too long (max 4000 characters)" }, { status: 400 });
  }
  try {
    const res = await generate({
      contents: buildLeadText(input),
      config: {
        systemInstruction: ANALYSIS_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            intent: { type: Type.STRING },
            keyRequirements: { type: Type.ARRAY, items: { type: Type.STRING } },
            objections: { type: Type.ARRAY, items: { type: Type.STRING } },
            nextAction: { type: Type.STRING },
            suggestedResponse: { type: Type.STRING },
            score: { type: Type.INTEGER },
            priority: { type: Type.STRING, enum: ["hot", "warm", "cold"] },
            scoreReason: { type: Type.STRING },
            followUps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dayOffset: { type: Type.INTEGER },
                  channel: { type: Type.STRING, enum: ["call", "whatsapp", "email"] },
                  action: { type: Type.STRING },
                  message: { type: Type.STRING },
                },
                required: ["dayOffset", "channel", "action", "message"],
              },
            },
          },
          required: ["summary", "intent", "keyRequirements", "objections", "nextAction",
            "suggestedResponse", "score", "priority", "scoreReason", "followUps"],
        },
        maxOutputTokens: 8192,
        temperature: 0.3,
      },
    });
    const analysis = clean(JSON.parse(res.text ?? ""));
    return NextResponse.json({ analysis });
  } catch (e) {
    console.error(e);
    const status = (e as { status?: number }).status;
    const busy = status === 503 || status === 504 || status === 429;
    return NextResponse.json(
      { error: busy ? "The AI service is busy right now. Please try again in a moment." : "Analysis failed, please retry" },
      { status: busy ? 503 : 502 },
    );
  }
}