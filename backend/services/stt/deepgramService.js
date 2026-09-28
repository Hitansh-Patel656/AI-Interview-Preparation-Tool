"use strict";

const fs = require("fs");
const { DeepgramClient } = require("@deepgram/sdk");

let deepgramClient = null;

const getClient = () => {
    if (!deepgramClient) {
        if (!process.env.DEEPGRAM_API_KEY) {
            throw new Error("DEEPGRAM_API_KEY is not configured in the environment.");
        }
        deepgramClient = new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY });
    }
    return deepgramClient;
};

/**
 * Transcribes audio from a local file path using Deepgram STT.
 * @param {string} filePath - Absolute path to the local audio file.
 * @returns {Promise<string>} The transcript string.
 */
const transcribeAudio = async (filePath) => {
    const client = getClient();
    const model = process.env.DEEPGRAM_MODEL || "nova-3";

    try {
        const stream = fs.createReadStream(filePath);

        const response = await client.listen.v1.media.transcribeFile(
            stream,
            {
                model: model,
                smart_format: true,
                language: "en"
            }
        );

        if (!response?.results?.channels) {
            throw new Error("Invalid response structure from Deepgram API.");
        }

        const transcript =
            response?.results?.channels?.[0]?.alternatives?.[0]?.transcript;

        if (typeof transcript !== "string" || transcript.trim().length === 0) {
            throw new Error("Empty transcript returned by Deepgram.");
        }

        return transcript.trim();
    } catch (error) {
        // Distinguish errors
        if (error.message.includes("DEEPGRAM_API_KEY is not configured")) {
            throw error; // configuration error
        }
        if (error.message.includes("Empty transcript")) {
            throw error;
        }

        // Deepgram API failure or unexpected format
        console.error("[Deepgram Service Error]:", error.message);
        throw new Error("Deepgram STT failed");
    }
};

module.exports = {
    transcribeAudio
};
