"use strict";

const { GoogleGenAI, Type } = require("@google/genai");
const path = require("path");
const { z } = require("zod");

// Define the expected output schema using Zod for runtime validation
const bodyLanguageAnalysisSchema = z.object({
    eye_contact_score: z.number().min(0).max(100),
    posture_score: z.number().min(0).max(100),
    facial_expression_score: z.number().min(0).max(100),
    confidence_score: z.number().min(0).max(100),
    nervous_habits_score: z.number().min(0).max(100),
    overall_body_language_score: z.number().min(0).max(100),
    nervous_habits: z.array(z.object({
        behavior: z.string(),
        severity: z.string(),
        timestamps: z.array(z.object({
            start: z.number().nonnegative(),
            end: z.number().nonnegative()
        })).max(10)
    })).max(10),
    strengths: z.array(z.string()).max(10),
    improvement_suggestions: z.array(z.string()).max(10),
    notable_moments: z.array(z.object({
        timestamp: z.number().nonnegative(),
        observation: z.string()
    })).max(10)
});

// Construct the native SDK JSON Schema
const sdkResponseSchema = {
    type: Type.OBJECT,
    properties: {
        eye_contact_score: { type: Type.NUMBER },
        posture_score: { type: Type.NUMBER },
        facial_expression_score: { type: Type.NUMBER },
        confidence_score: { type: Type.NUMBER },
        nervous_habits_score: { type: Type.NUMBER },
        overall_body_language_score: { type: Type.NUMBER },
        nervous_habits: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    behavior: { type: Type.STRING },
                    severity: { type: Type.STRING },
                    timestamps: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                start: { type: Type.NUMBER },
                                end: { type: Type.NUMBER }
                            }
                        }
                    }
                }
            }
        },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        improvement_suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
        notable_moments: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    timestamp: { type: Type.NUMBER },
                    observation: { type: Type.STRING }
                }
            }
        }
    }
};

const SUPPORTED_MIME_TYPES = ["video/webm", "video/mp4", "video/mpeg", "video/quicktime"];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const analyzeInterviewVideo = async ({
    videoPath,
    mimeType,
    role,
    interviewType,
    questionText,
    transcript
}) => {
    // 1. Validate required inputs
    if (!videoPath || typeof videoPath !== "string") {
        throw new Error("Invalid input: videoPath must be a non-empty string.");
    }
    if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
        throw new Error(`Invalid input: mimeType '${mimeType}' is not supported.`);
    }
    if (!role || typeof role !== "string") {
        throw new Error("Invalid input: role must be a non-empty string.");
    }
    if (!interviewType || typeof interviewType !== "string") {
        throw new Error("Invalid input: interviewType must be a non-empty string.");
    }
    if (!questionText || typeof questionText !== "string") {
        throw new Error("Invalid input: questionText must be a non-empty string.");
    }
    if (typeof transcript !== "string") { // allowing empty string if STT failed or wasn't provided, but strictly string
        throw new Error("Invalid input: transcript must be a string.");
    }

    // 2. Initialize Gemini Client lazily
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Server configuration error: GEMINI_API_KEY is not set.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = process.env.GEMINI_VISION_MODEL || "gemini-3.8-flash";
    const configuredProcessing = (process.env.GEMINI_VIDEO_PROCESSING || "STATIC").toUpperCase();

    if (!["STATIC", "AGENTIC"].includes(configuredProcessing)) {
        throw new Error(`Server configuration error: GEMINI_VIDEO_PROCESSING must be STATIC or AGENTIC, got ${configuredProcessing}`);
    }

    let uploadedFile = null;

    try {
        // 3. Upload Local Video
        uploadedFile = await ai.files.upload({
            file: videoPath,
            config: {
                mimeType,
                displayName: path.basename(videoPath)
            }
        });

        if (!uploadedFile || !uploadedFile.name) {
            throw new Error("Failed to upload video to Gemini: Invalid file object returned.");
        }

        // 4. Processing / Polling
        let fileInfo = await ai.files.get({ name: uploadedFile.name });
        
        const timeoutMs = parseInt(process.env.GEMINI_VIDEO_ANALYSIS_TIMEOUT_MS, 10) || 120000;
        const pollInterval = 5000;
        let elapsed = 0;

        while (fileInfo.state === "PROCESSING") {
            if (elapsed >= timeoutMs) {
                throw new Error("Gemini video processing timed out.");
            }
            await delay(pollInterval);
            elapsed += pollInterval;
            fileInfo = await ai.files.get({ name: uploadedFile.name });
        }

        if (fileInfo.state === "FAILED") {
            throw new Error("Gemini video processing failed.");
        }

        if (fileInfo.state !== "ACTIVE") {
            throw new Error(`Unexpected Gemini video processing state: ${fileInfo.state}`);
        }

        // 5. Generate Prompt
        const promptInstruction = `You are an expert interview coach analyzing observable interview body language from the provided video.

Role: ${role}
Interview Type: ${interviewType}
Question: ${questionText}
Candidate Transcript (for context): ${transcript}

CRITICAL INSTRUCTIONS:
- Analyze ONLY observable interview body language and visual evidence.
- DO NOT infer, suggest, or mention any medical conditions, mental health conditions, personality disorders, protected attributes, or sensitive personal characteristics.
- DO NOT make psychological diagnoses.
- Do not claim exact eye-tracking measurements. Use observable visual evidence.
- Distinguish observable evidence from speculation.
- Focus on eye contact, posture, facial expression, visible confidence/presence, observable nervous habits, and overall presentation.
- Provide actionable improvement suggestions and identify concrete strengths.
- All timestamps must be in seconds.
- Output strictly according to the provided JSON schema.`;

        // 6. Generate Content
        const response = await ai.models.generateContent({
            model,
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            fileData: {
                                fileUri: fileInfo.uri,
                                mimeType: fileInfo.mimeType
                            },
                            mediaProcessing: configuredProcessing
                        },
                        {
                            text: promptInstruction
                        }
                    ]
                }
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: sdkResponseSchema
            }
        });

        const responseText = response.text || "";
        if (!responseText) {
            throw new Error("Gemini returned an empty response.");
        }

        // 7. Parse and Validate Output
        let rawOutput;
        try {
            rawOutput = JSON.parse(responseText);
        } catch (err) {
            throw new Error("Failed to parse Gemini response as JSON.");
        }

        const validationResult = bodyLanguageAnalysisSchema.safeParse(rawOutput);
        if (!validationResult.success) {
            console.error("[Gemini Video Analysis] Validation failed:", validationResult.error);
            throw new Error("Gemini response failed schema validation.");
        }

        return validationResult.data;

    } finally {
        // 8. Cleanup Gemini File
        if (uploadedFile && uploadedFile.name) {
            try {
                await ai.files.delete({ name: uploadedFile.name });
            } catch (cleanupError) {
                console.error(`[Gemini Video Analysis] Failed to clean up Gemini file ${uploadedFile.name}:`, cleanupError.message);
                // Do NOT throw the cleanup error to avoid swallowing the original error or failing a successful analysis
            }
        }
    }
};

module.exports = {
    analyzeInterviewVideo
};
