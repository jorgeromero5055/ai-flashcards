import { GoogleGenAI, Type } from "@google/genai";
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("GEMINI_API_KEY is missing");
const ai = new GoogleGenAI({ apiKey });

import type { GeneratedCards } from "../types.js";

export interface ResponseGenerator {
  generate(topic: string): Promise<GeneratedCards>;
}

function validateCards(data: unknown): GeneratedCards {
  if (!Array.isArray(data)) throw new Error("expected an array");
  if (data.length === 0) throw new Error("no cards returned");

  for (const item of data) {
    if (typeof item !== "object" || item === null)
      throw new Error("item is not an object");
    if (typeof item.front !== "string" || item.front.trim() === "")
      throw new Error("front missing a value");
    if (typeof item.back !== "string" || item.back.trim() === "")
      throw new Error("back missing a value");
  }

  return data as GeneratedCards;
}

export class GeminiResponseGenerator implements ResponseGenerator {
  async generate(topic: string): Promise<GeneratedCards> {
    const res = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: `Create flashcards about: ${topic}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: {
                type: Type.STRING,
                description: "The question/prompt side of the flashcard",
              },
              back: { type: Type.STRING, description: "The answer side" },
            },
            required: ["front", "back"],
          },
        },
      },
    });

    let raw: unknown;
    try {
      raw = JSON.parse(res.text ?? "[]");
    } catch {
      throw new Error("model did not return valid JSON");
    } // layer 2 only
    const cards = validateCards(raw); // layer 3 errors propagate honestly
    return cards;
  }
}
