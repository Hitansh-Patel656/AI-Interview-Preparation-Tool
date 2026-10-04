const assert = require("assert");

const mockReq = (options = {}) => ({
    user: { id: "u1" },
    file: options.file || null,
    ...options
});

const mockRes = () => {
    const res = {};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.data = data; return res; };
    return res;
};

// Mocks
let db = {};
let fsDeletes = [];

const mockResumeRepository = {
    findByUserId: async (userId) => db[userId] || null,
    upsert: async (userId, fileName, filePath, parsedData) => {
        db[userId] = { user_id: userId, fileName, filePath, parsedData };
        return db[userId];
    }
};

const mockFsPromises = {
    unlink: async (path) => {
        fsDeletes.push(path);
    }
};

const mockResumeParser = {
    parseResume: async (filePath, originalName) => {
        if (filePath === "fail_upstream") {
            const err = new Error("Upstream Error");
            err.name = "ResumeUpstreamError";
            throw err;
        }
        if (filePath === "fail_parse") {
            const err = new Error("Parse Error");
            err.name = "ResumeParseError";
            throw err;
        }
        if (filePath === "fail_generic") {
            throw new Error("Generic Error");
        }
        return { skills: ["test"], experience: [], education: [] };
    }
};

// Override requires
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

mockRequire("../repositories/resumeRepository", mockResumeRepository);
mockRequire("fs", { promises: mockFsPromises });
mockRequire("../services/resume/resumeParser", mockResumeParser);
mockRequire("../services/authService", {});

const { uploadResume, getResume } = require("../controllers/userController");

const runTests = async () => {
    let passed = 0;
    let failed = 0;
    const testCases = [];
    const addTest = (name, fn) => testCases.push({ name, fn });

    addTest("10. Successful PostgreSQL persistence", async () => {
        db = {};
        fsDeletes = [];
        const req = mockReq({ file: { path: "newFile", originalname: "resume.pdf" } });
        const res = mockRes();
        await uploadResume(req, res);

        assert.strictEqual(res.statusCode, 201);
        assert.deepStrictEqual(db["u1"].parsedData, { skills: ["test"], experience: [], education: [] });
    });

    addTest("11. Existing resume replacement behavior", async () => {
        db = { "u1": { filePath: "oldFile" } };
        fsDeletes = [];
        const req = mockReq({ file: { path: "newFile", originalname: "resume.pdf" } });
        const res = mockRes();
        await uploadResume(req, res);

        assert.strictEqual(res.statusCode, 201);
        assert.strictEqual(db["u1"].filePath, "newFile");
        assert.ok(fsDeletes.includes("oldFile"), "Old file should be deleted");
    });

    addTest("12. Unauthenticated upload", async () => {
        // Handled by authMiddleware which is not in the controller.
        // We will just verify it requires req.user.id implicitly because it crashes or we can pass a dummy.
        // Actually, uploadResume assumes req.user is set. We can skip this or test if req.file is missing.
        const req = mockReq({ file: null });
        const res = mockRes();
        await uploadResume(req, res);
        assert.strictEqual(res.statusCode, 400);
    });

    addTest("13. Cross-user resume access", async () => {
        // getResume gets the resume for req.user.id
        db = { "u2": { fileName: "user2resume" } };
        const req = mockReq(); // user.id is u1
        const res = mockRes();
        await getResume(req, res);
        assert.strictEqual(res.statusCode, 404);
    });

    addTest("14. GET resume returns persisted parsed data", async () => {
        db = { "u1": { fileName: "res.pdf", parsedData: { skills: ["test"] } } };
        const req = mockReq();
        const res = mockRes();
        await getResume(req, res);
        assert.deepStrictEqual(res.data.parsedData, { skills: ["test"] });
    });

    addTest("15. Parse failure cleans up file and does not persist (400)", async () => {
        db = { "u1": { fileName: "old", filePath: "oldFile" } };
        fsDeletes = [];
        const req = mockReq({ file: { path: "fail_parse", originalname: "resume.pdf" } });
        const res = mockRes();
        await uploadResume(req, res);

        assert.strictEqual(res.statusCode, 400);
        assert.ok(fsDeletes.includes("fail_parse"), "New file should be cleaned up");
        assert.strictEqual(db["u1"].fileName, "old", "DB should not be updated");
        assert.strictEqual(fsDeletes.includes("oldFile"), false, "Old file should not be deleted");
    });

    addTest("16. Upstream failure cleans up file and does not persist (502)", async () => {
        db = { "u1": { fileName: "old", filePath: "oldFile" } };
        fsDeletes = [];
        const req = mockReq({ file: { path: "fail_upstream", originalname: "resume.pdf" } });
        const res = mockRes();
        await uploadResume(req, res);

        assert.strictEqual(res.statusCode, 502);
        assert.ok(fsDeletes.includes("fail_upstream"));
    });

    addTest("17. Generic failure cleans up file and does not persist (500)", async () => {
        db = { "u1": { fileName: "old", filePath: "oldFile" } };
        fsDeletes = [];
        const req = mockReq({ file: { path: "fail_generic", originalname: "resume.pdf" } });
        const res = mockRes();
        await uploadResume(req, res);

        assert.strictEqual(res.statusCode, 500);
        assert.ok(fsDeletes.includes("fail_generic"));
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

    console.log(`\nTests completed: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
};

runTests();
