"use strict";

const { GoogleGenAI } = require("@google/genai");

let ai = null;

const getClient = () => {
    if (!ai) {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not configured in the environment.");
        }

        ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }

    return ai;
};

const generateSpeech = async (text) => {
    if (typeof text !== "string" || text.trim().length === 0) {
        throw new Error("TTS text must be a non-empty string.");
    }

    if (text.trim().length > 10000) {
        throw new Error("TTS text is too long.");
    }

    const client = getClient();
    const model = process.env.GEMINI_TTS_MODEL || "gemini-3.8-flash-tts";
    const voice = process.env.GEMINI_TTS_VOICE || "Kore";
    const style = process.env.GEMINI_TTS_STYLE || "clear, calm, professional interview interviewer";

    try {
        const response = await client.models.generateContent({
            model,
            contents: [{
                role: "user",
                parts: [{
                    text: text.trim(),
                    speech_metadata: { style }
                }]
            }],
            config: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: { voice }
                }
            }
        });

        const audioData = response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (typeof audioData !== "string" || audioData.length === 0) {
            throw new Error("Empty audio returned by Gemini TTS.");
        }

        return Buffer.from(audioData, "base64");
    } catch (error) {
        if (error.message.includes("GEMINI_API_KEY is not configured")) {
            throw error;
        }

        if (error.message.includes("Empty audio returned")) {
            throw error;
        }

        console.error("[Gemini TTS Service Error]:", error.message);
        throw new Error("Gemini TTS failed");
    }
};

module.exports = {
    generateSpeech
};
