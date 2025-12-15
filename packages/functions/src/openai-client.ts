/**
 * OpenAI client configuration
 * Uses Firebase secret management for the API key
 */

import OpenAI from "openai";
import { defineSecret } from "firebase-functions/params";

// Define the secret (this tells Firebase to inject it at runtime)
export const openaiApiKey = defineSecret("OPENAI_API_KEY");

/**
 * Creates an OpenAI client instance
 * Call this inside your function to get a configured client
 */
export function createOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY secret is not configured");
  }

  return new OpenAI({
    apiKey: apiKey,
  });
}
