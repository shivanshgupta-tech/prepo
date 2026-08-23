import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
  "gemini-2.0-flash",
].filter(Boolean);

function errorKind(error) {
  const message = error?.message || "";
  const status = error?.status;
  if (
    status === 404 ||
    message.includes("404") ||
    message.includes("not found") ||
    message.includes("not supported")
  ) {
    return "missing";
  }
  if (
    status === 429 ||
    status === 503 ||
    message.includes("429") ||
    message.includes("503") ||
    message.includes("high demand") ||
    message.includes("try again")
  ) {
    return "busy";
  }
  return "fatal";
}

export function getGeminiModel(modelName = MODEL_CANDIDATES[0]) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: modelName });
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        const error = new Error("Gemini request timed out");
        error.status = 503;
        reject(error);
      }, timeoutMs);
    }),
  ]);
}

export async function generateGeminiContent(prompt) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  let lastError;
  const deadline = Date.now() + 12000;

  for (const modelName of [...new Set(MODEL_CANDIDATES)]) {
    if (Date.now() > deadline) break;

    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const remaining = Math.max(2500, deadline - Date.now());
      return await withTimeout(model.generateContent(prompt), remaining);
    } catch (error) {
      lastError = error;
      if (errorKind(error) === "fatal") {
        throw error;
      }
    }
  }

  throw lastError;
}
