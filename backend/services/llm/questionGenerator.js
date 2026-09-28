"use strict";

const { z } = require("zod");
const llmService = require("./llmService");

// Define the Zod schema for runtime validation
const QuestionSchema = z.object({
    question: z.string().min(5),
    is_followup: z.boolean()
});

// Define the API schema for the LLM
const questionResponseSchema = {
    type: "OBJECT",
    properties: {
        question: {
            type: "STRING",
            description: "The generated interview question."
        },
        is_followup: {
            type: "BOOLEAN",
            description: "Must be false for the initial question."
        }
    },
    required: ["question", "is_followup"]
};

/**
 * Generates an initial interview question based on the provided context.
 * @param {Object} context
 * @param {string} context.role
 * @param {string} context.interview_type
 * @param {Object} [context.resume] - Parsed resume data
 * @param {Object} [context.jobDescription] - Job description data (raw_text, parsed_keywords)
 * @returns {Promise<Object>} The validated generated question
 */
const generateInitialQuestion = async (context) => {
    const { role, interview_type, resume, jobDescription } = context;

    let prompt = `You are an expert AI interviewer conducting a professional interview.
Your task is to generate the VERY FIRST question to ask the candidate.

Interview Context:
- Target Role: ${role}
- Interview Type: ${interview_type}

`;

    if (jobDescription) {
        prompt += `Job Description Context:\n- Description: ${jobDescription.raw_text || "N/A"}\n- Keywords: ${JSON.stringify(jobDescription.parsed_keywords || [])}\n\n`;
    }

    if (resume && resume.parsedData) {
        prompt += `Candidate's Resume Data:\n${JSON.stringify(resume.parsedData)}\n\n`;
    }

    prompt += `Instructions:
1. Act as the interviewer.
2. The question should be relevant to the role and interview type.
3. If it's a Technical interview, prefer domain/problem-solving questions.
4. If it's an HR interview, prefer behavioral/background questions.
5. If it's a Behavioral interview, prefer questions suitable for STAR-style responses.
6. Use the provided Job Description and Resume context to personalize the question if available.
7. Avoid asking multiple unrelated questions at once.
8. Do not invent candidate experience.
9. Return the response strictly as a JSON object matching the provided schema.
`;

    const rawResult = await llmService.generateStructured(prompt, questionResponseSchema);

    // Validate with Zod
    const validatedResult = QuestionSchema.parse(rawResult);

    // Enforce initial question rule
    if (validatedResult.is_followup) {
        validatedResult.is_followup = false;
    }

    return validatedResult;
};

module.exports = {
    generateInitialQuestion
};
