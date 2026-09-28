"use strict";

const { z } = require("zod");
const llmService = require("./llmService");

const EvaluationSchema = z.object({
    content_relevance_score: z.number().min(0).max(100),
    content_relevance_notes: z.string(),
    star_rating: z.number().min(0).max(100),
    star_suggestions: z.string(),
    model_answer: z.string(),
    follow_up_required: z.boolean(),
    follow_up_reason: z.string()
});

const evaluationResponseSchema = {
    type: "OBJECT",
    properties: {
        content_relevance_score: {
            type: "NUMBER",
            description: "A score from 0 to 100 representing the factual accuracy and relevance of the answer to the question asked."
        },
        content_relevance_notes: {
            type: "STRING",
            description: "Qualitative notes explaining the content_relevance_score."
        },
        star_rating: {
            type: "NUMBER",
            description: "A score from 0 to 100 rating how well the answer follows the Situation, Task, Action, Result framework."
        },
        star_suggestions: {
            type: "STRING",
            description: "Feedback and suggestions on how to improve the STAR structure of the answer."
        },
        model_answer: {
            type: "STRING",
            description: "A rewritten, improved, ideal example answer for the question."
        },
        follow_up_required: {
            type: "BOOLEAN",
            description: "True if the answer is incomplete, vague, or warrants a follow-up question to dig deeper."
        },
        follow_up_reason: {
            type: "STRING",
            description: "Reasoning for why a follow-up is or is not required."
        }
    },
    required: [
        "content_relevance_score",
        "content_relevance_notes",
        "star_rating",
        "star_suggestions",
        "model_answer",
        "follow_up_required",
        "follow_up_reason"
    ]
};

const evaluateAnswer = async (context) => {
    const { role, interview_type, question, transcript, resume, jobDescription } = context;

    let prompt = `You are an expert AI interviewer evaluating a candidate's answer.

Interview Context:
- Target Role: ${role}
- Interview Type: ${interview_type}

Question Asked:
"${question}"

Candidate's Answer:
"${transcript}"

`;

    if (jobDescription) {
        prompt += `Job Description Context:\n- Description: ${jobDescription.raw_text || "N/A"}\n- Keywords: ${JSON.stringify(jobDescription.parsed_keywords || [])}\n\n`;
    }

    if (resume && resume.parsedData) {
        prompt += `Candidate's Resume Data:\n${JSON.stringify(resume.parsedData)}\n\n`;
    }

    prompt += `Instructions:
1. Evaluate the answer strictly against the Question Asked.
2. Provide a 'content_relevance_score' (0-100) assessing factual accuracy and relevance.
3. Provide a 'star_rating' (0-100) assessing the STAR structure (Situation, Task, Action, Result). If the answer lacks evidence for STAR, lower the rating and explain what is missing. Do not hallucinate facts.
4. Write a 'model_answer' that is a concise, well-structured example answer for this question.
5. Determine if a follow-up is required ('follow_up_required'). True if the candidate missed key details, was vague, or if their answer naturally prompts a deeper technical or behavioral dive.
6. Provide a 'follow_up_reason' explaining your decision.
7. Return the response strictly as a JSON object matching the provided schema.
`;

    const rawResult = await llmService.generateStructured(prompt, evaluationResponseSchema);
    const validatedResult = EvaluationSchema.parse(rawResult);

    return validatedResult;
};

module.exports = {
    evaluateAnswer
};
