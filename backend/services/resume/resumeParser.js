"use strict";

const fs = require("fs").promises;
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const { z } = require("zod");
const llmService = require("../llm/llmService");

class ResumeParseError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ResumeParseError';
    }
}

class ResumeUpstreamError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ResumeUpstreamError';
    }
}

const isEmptyField = (val) => val == null || (typeof val === 'string' && val.trim() === "");

const ResumeSchema = z.object({
    skills: z.array(z.string()).default([]),
    experience: z.array(z.object({
        job_title: z.string().nullable(),
        company: z.string().nullable(),
        start_date: z.string().nullable(),
        end_date: z.string().nullable(),
        description: z.string().nullable()
    }))
    .transform(arr => arr.filter(exp =>
        !isEmptyField(exp.job_title) ||
        !isEmptyField(exp.company) ||
        !isEmptyField(exp.start_date) ||
        !isEmptyField(exp.end_date) ||
        !isEmptyField(exp.description)
    ))
    .default([]),
    education: z.array(z.object({
        degree: z.string().nullable(),
        institution: z.string().nullable(),
        start_date: z.string().nullable(),
        end_date: z.string().nullable(),
        field: z.string().nullable()
    }))
    .transform(arr => arr.filter(edu =>
        !isEmptyField(edu.degree) ||
        !isEmptyField(edu.institution) ||
        !isEmptyField(edu.start_date) ||
        !isEmptyField(edu.end_date) ||
        !isEmptyField(edu.field)
    ))
    .default([])
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
    try {
        if (ext === ".pdf") {
            const pdfData = await pdfParse(dataBuffer);
            text = pdfData.text;
        } else if (ext === ".docx") {
            const result = await mammoth.extractRawText({ buffer: dataBuffer });
            text = result.value;
        } else {
            throw new ResumeParseError("Unsupported file format for text extraction");
        }
    } catch (err) {
        if (err instanceof ResumeParseError) throw err;
        throw new ResumeParseError("Failed to extract text from document");
    }

    if (!text || text.trim().length === 0) {
        throw new ResumeParseError("Could not extract readable text from the document");
    }

    if (text.length > 50000) {
        throw new ResumeParseError("Resume text is too long to parse (exceeds 50,000 characters)");
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

    let rawResult;
    try {
        rawResult = await llmService.generateStructured(prompt, resumeResponseSchema);
    } catch (err) {
        throw new ResumeUpstreamError("Failed to communicate with LLM parser");
    }

    try {
        const validatedResult = ResumeSchema.parse(rawResult);
        return validatedResult;
    } catch (err) {
        throw new ResumeUpstreamError("LLM returned malformed structured data");
    }
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
    parseExtractedText,
    ResumeParseError,
    ResumeUpstreamError
};
