const assert = require("assert");
const fs = require("fs").promises;
const path = require("path");

// Mock dependencies
const mockPdfParse = async (buffer) => {
    if (buffer.toString() === "BAD_PDF") throw new Error("Invalid PDF format");
    return { text: buffer.toString() + "_PDF_EXTRACTED" };
};

const mockMammoth = {
    extractRawText: async ({ buffer }) => {
        if (buffer.toString() === "BAD_DOCX") throw new Error("Invalid DOCX format");
        return { value: buffer.toString() + "_DOCX_EXTRACTED" };
    }
};

const mockLlmService = {
    generateStructured: async (prompt, schema) => {
        if (prompt.includes("FAIL_ME")) {
            throw new Error("LLM failure");
        }
        if (prompt.includes("MALFORMED")) {
            return { skills: "Not an array", experience: "Nope", education: [] }; // Bad schema
        }
        
        let skills = ["JavaScript", "Node.js"];
        let experience = [{ job_title: "SWE", company: "Google", start_date: "2020", end_date: "2024", description: "Coded" }];
        let education = [{ degree: "BS CS", institution: "MIT", start_date: "2016", end_date: "2020", field: "Computer Science" }];
        
        if (prompt.includes("MISSING_EDUCATION")) education = [];
        if (prompt.includes("MISSING_EXPERIENCE")) experience = [];
        if (prompt.includes("MISSING_SKILLS")) skills = [];

        // Note: returning directly as object, but parseExtractedText parses raw object
        return { skills, experience, education };
    }
};

// Override require for test
const requireCache = require("module")._cache;

const mockRequire = (id, mockExport) => {
    const resolvedPath = require.resolve(id);
    requireCache[resolvedPath] = {
        id: resolvedPath,
        filename: resolvedPath,
        loaded: true,
        exports: mockExport
    };
};

// Need to resolve path relative to backend
mockRequire("pdf-parse", mockPdfParse);
mockRequire("mammoth", mockMammoth);
mockRequire("../services/llm/llmService", mockLlmService);

// Now load the parser
const { extractText, parseExtractedText, parseResume } = require("../services/resume/resumeParser");

const runTests = async () => {
    let passed = 0;
    let failed = 0;
    const testCases = [];

    const addTest = (name, fn) => testCases.push({ name, fn });

    // Dummy temp files
    await fs.writeFile("test1.pdf", "Hello");
    await fs.writeFile("test2.docx", "World");
    await fs.writeFile("test_bad.pdf", "BAD_PDF");
    await fs.writeFile("test_unsupported.txt", "Unsupported");
    await fs.writeFile("test_fail_llm.pdf", "FAIL_ME");
    await fs.writeFile("test_malformed.pdf", "MALFORMED");

    addTest("1. PDF text extraction", async () => {
        const text = await extractText("test1.pdf", "resume.pdf");
        assert.strictEqual(text, "Hello_PDF_EXTRACTED");
    });

    addTest("2. DOCX text extraction", async () => {
        const text = await extractText("test2.docx", "resume.docx");
        assert.strictEqual(text, "World_DOCX_EXTRACTED");
    });

    addTest("3. Valid resume parsing", async () => {
        const result = await parseResume("test1.pdf", "resume.pdf");
        assert.deepStrictEqual(result.skills, ["JavaScript", "Node.js"]);
        assert.strictEqual(result.experience.length, 1);
        assert.strictEqual(result.education.length, 1);
    });

    addTest("4. Resume with missing education", async () => {
        await fs.writeFile("test_missing_edu.pdf", "MISSING_EDUCATION");
        const result = await parseResume("test_missing_edu.pdf", "resume.pdf");
        assert.strictEqual(result.education.length, 0);
    });

    addTest("5. Resume with missing experience", async () => {
        await fs.writeFile("test_missing_exp.pdf", "MISSING_EXPERIENCE");
        const result = await parseResume("test_missing_exp.pdf", "resume.pdf");
        assert.strictEqual(result.experience.length, 0);
    });

    addTest("6. Resume with missing skills", async () => {
        await fs.writeFile("test_missing_skills.pdf", "MISSING_SKILLS");
        const result = await parseResume("test_missing_skills.pdf", "resume.pdf");
        assert.strictEqual(result.skills.length, 0);
    });

    addTest("7. Malformed/unsupported document", async () => {
        await assert.rejects(extractText("test_unsupported.txt", "resume.txt"), /Unsupported file format/);
        await assert.rejects(extractText("test_bad.pdf", "resume.pdf"), /Invalid PDF format/);
    });

    addTest("8. Malformed structured Gemini response", async () => {
        await assert.rejects(parseResume("test_malformed.pdf", "resume.pdf"), /expected array, received string/);
    });

    addTest("9. Gemini parsing failure", async () => {
        await assert.rejects(parseResume("test_fail_llm.pdf", "resume.pdf"), /LLM failure/);
    });

    for (const test of testCases) {
        try {
            await test.fn();
            console.log(`✅ ${test.name}`);
            passed++;
        } catch (err) {
            console.error(`❌ ${test.name}`);
            console.error(err);
            failed++;
        }
    }

    // Cleanup
    await fs.unlink("test1.pdf").catch(() => {});
    await fs.unlink("test2.docx").catch(() => {});
    await fs.unlink("test_bad.pdf").catch(() => {});
    await fs.unlink("test_unsupported.txt").catch(() => {});
    await fs.unlink("test_fail_llm.pdf").catch(() => {});
    await fs.unlink("test_malformed.pdf").catch(() => {});
    await fs.unlink("test_missing_edu.pdf").catch(() => {});
    await fs.unlink("test_missing_exp.pdf").catch(() => {});
    await fs.unlink("test_missing_skills.pdf").catch(() => {});

    console.log(`\nTests completed: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
};

runTests();
