"use strict";

const { GoogleGenAI } = require("@google/genai");

let ai = null;

const getClient = () => {
    if (!ai) {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not configured in the environment.");
        }
        // Resolve credential conflict by strictly using GEMINI_API_KEY
        if (process.env.GOOGLE_API_KEY) {
            delete process.env.GOOGLE_API_KEY;
        }
        ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return ai;
};

/**
 * Generic structured generation function using Gemini.
 * @param {string} prompt - The prompt to send.
 * @param {Object} responseSchema - The expected JSON schema (OpenAPI 3.0 format) for structured output.
 * @returns {Promise<Object>} The parsed result.
 */
const generateStructured = async (prompt, responseSchema) => {
    const client = getClient();
    const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";

    let lastError = null;
    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            const response = await client.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema
                }
            });

            if (!response.text) {
                throw new Error("Empty response from LLM");
            }

            return JSON.parse(response.text);
        } catch (error) {
            lastError = error;
            if (error.status === 503 || error.status === "UNAVAILABLE" || error.message.includes("503") || error.message.includes("UNAVAILABLE")) {
                console.warn(`[LLM Service Warn]: 503 UNAVAILABLE on attempt ${attempt + 1}, retrying...`);
                await new Promise(res => setTimeout(res, 1000 * (attempt + 1))); // exponential backoff
                continue;
            }
            break; // not a 503, break and throw immediately
        }
    }

    console.error("[LLM Service Error]:", lastError.message);
    throw new Error(`LLM generation failed: ${lastError.message}`);
};

module.exports = {
    generateStructured
};
