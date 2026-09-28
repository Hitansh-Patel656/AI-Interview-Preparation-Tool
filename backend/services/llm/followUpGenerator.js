"use strict";

const { z } = require("zod");
const llmService = require("./llmService");

const FollowUpSchema = z.object({
    question: z.string().min(5)
});

const followUpResponseSchema = {
    type: "OBJECT",
    properties: {
        question: {
            type: "STRING",
            description: "The generated follow-up interview question."
        }
    },
    required: ["question"]
};

const generateFollowUpQuestion = async (context) => {
    const { role, interview_type, question, transcript, evaluation, resume, jobDescription } = context;

    let prompt = `You are an expert AI interviewer conducting a professional interview.
You have just asked a question, and the candidate provided an answer. The evaluation determined that a follow-up question is required.

Interview Context:
- Target Role: ${role}
- Interview Type: ${interview_type}

Original Question:
"${question}"

Candidate's Answer:
"${transcript}"

Evaluation Reason for Follow-up:
"${evaluation.follow_up_reason}"

`;

    if (jobDescription) {
        prompt += `Job Description Context:\n- Description: ${jobDescription.raw_text || "N/A"}\n- Keywords: ${JSON.stringify(jobDescription.parsed_keywords || [])}\n\n`;
    }

    if (resume && resume.parsedData) {
        prompt += `Candidate's Resume Data:\n${JSON.stringify(resume.parsedData)}\n\n`;
    }

    prompt += `Instructions:
1. Generate a single follow-up question based on the candidate's answer and the evaluation reason.
2. The question should probe a missing detail, trade-off, claim, or technical depth.
3. Do not repeat the original question.
4. It must be a single interview question, not multiple numbered questions.
5. Return the response strictly as a JSON object matching the provided schema.
`;

    const rawResult = await llmService.generateStructured(prompt, followUpResponseSchema);
    const validatedResult = FollowUpSchema.parse(rawResult);

    return validatedResult;
};

module.exports = {
    generateFollowUpQuestion
};
