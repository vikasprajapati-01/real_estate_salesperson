import { GoogleGenAI } from "@google/genai";

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const MODELS = [
  process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  ...(process.env.GEMINI_FALLBACK_MODELS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Params = Parameters<typeof ai.models.generateContent>[0];

export async function generate(params: Omit<Params, "model">) {
  let lastError: unknown;
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await ai.models.generateContent({
          ...params,
          model,
          config: { ...params.config, httpOptions: { timeout: 20000 } },
        });
        console.log(`Gemini OK: ${model}`);
        return res;
      } catch (e) {
        lastError = e;
        const status = (e as { status?: number }).status;
        if (status === 400 || status === 401 || status === 403) throw e; // our fault, don't retry
        if (status === 404 || status === 429) { console.warn(`Gemini ${model} unavailable (${status}), trying next`); break; }
        console.warn(`Gemini ${model} attempt ${attempt + 1} failed`, status);
        await sleep(800 * (attempt + 1));
      }
    }
  }
  throw lastError;
}