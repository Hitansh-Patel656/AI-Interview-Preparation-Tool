"use strict";

const fs = require("fs").promises;
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const { z } = require("zod");
const llmService = require("../llm/llmService");

const ResumeSchema = z.object({
    skills: z.array(z.string()).default([]),
    experience: z.array(z.object({
        job_title: z.string().nullable(),
        company: z.string().nullable(),
        start_date: z.string().nullable(),
        end_date: z.string().nullable(),
        description: z.string().nullable()
    })).default([]),
    education: z.array(z.object({
        degree: z.string().nullable(),
        institution: z.string().nullable(),
        start_date: z.string().nullable(),
        end_date: z.string().nullable(),
        field: z.string().nullable()
    })).default([])
});

const resumeResponseSchema = {
    type: "OBJECT",
    properties: {
        skills: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "List of skills explicitly mentioned in the resume."
        },
        experience: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    job_title: { type: "STRING", nullable: true },
                    company: { type: "STRING", nullable: true },
                    start_date: { type: "STRING", nullable: true },
                    end_date: { type: "STRING", nullable: true },
                    description: { type: "STRING", nullable: true }
                }
            },
            description: "List of work experiences explicitly mentioned in the resume."
        },
        education: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    degree: { type: "STRING", nullable: true },
                    institution: { type: "STRING", nullable: true },
                    start_date: { type: "STRING", nullable: true },
                    end_date: { type: "STRING", nullable: true },
                    field: { type: "STRING", nullable: true }
                }
            },
            description: "List of educational background elements explicitly mentioned in the resume."
        }
    },
    required: ["skills", "experience", "education"]
};

/**
 * Extracts raw text from a PDF or DOCX file.
 * @param {string} filePath 
 * @param {string} originalName 
 * @returns {Promise<string>}
 */
const extractText = async (filePath, originalName) => {
    const ext = path.extname(originalName).toLowerCase();
    const dataBuffer = await fs.readFile(filePath);

    let text = "";
    if (ext === ".pdf") {
        const pdfData = await pdfParse(dataBuffer);
        text = pdfData.text;
    } else if (ext === ".docx") {
        const result = await mammoth.extractRawText({ buffer: dataBuffer });
        text = result.value;
    } else {
        throw new Error("Unsupported file format for text extraction");
    }

    if (!text || text.trim().length === 0) {
        throw new Error("Could not extract readable text from the document");
    }

    // Limit text length to prevent prompt explosion (Gemini limits)
    // 50,000 characters is more than enough for any reasonable resume.
    if (text.length > 50000) {
        text = text.substring(0, 50000);
    }

    return text.trim();
};

/**
 * Parses resume text into structured JSON using the LLM service.
 * @param {string} text 
 * @returns {Promise<Object>}
 */
const parseExtractedText = async (text) => {
    const prompt = `You are extracting factual information from a resume. Use only information explicitly present in the supplied resume text. Do not infer or invent facts. If information is absent, return an empty value/array. Do not infer age, gender, religion, caste, ethnicity, health conditions, political affiliation, personality traits, or protected characteristics. Do not fabricate missing dates, companies, degrees, skills, or experience.

Resume Text:
---
${text}
---
`;

    const rawResult = await llmService.generateStructured(prompt, resumeResponseSchema);
    const validatedResult = ResumeSchema.parse(rawResult);
    return validatedResult;
};

/**
 * Main entry point: extracts text and delegates to LLM.
 * @param {string} filePath 
 * @param {string} originalName 
 * @returns {Promise<Object>}
 */
const parseResume = async (filePath, originalName) => {
    const text = await extractText(filePath, originalName);
    const structuredData = await parseExtractedText(text);
    return structuredData;
};

module.exports = {
    parseResume,
    extractText,
    parseExtractedText
};
