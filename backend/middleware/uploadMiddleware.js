// uploadMiddleware.js
// Multer configuration for file uploads.
// - resumeUpload: PDF/DOCX only, small size limit (R.1.2)
// - videoUpload: video clips for optional body-language analysis (R.2.4)

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const RESUME_DIR = path.join(__dirname, "..", "uploads", "resumes");
const VIDEO_DIR = path.join(__dirname, "..", "uploads", "videos");

// Ensure upload directories exist
[RESUME_DIR, VIDEO_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// ---------------------------
// Resume upload (R.1.2)
// ---------------------------
const resumeStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, RESUME_DIR),
    filename: (req, file, cb) => {
        const uniqueSuffix = `${req.user?.id || "anon"}-${Date.now()}`;
        cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const resumeFileFilter = (req, file, cb) => {
    const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" // .docx
    ];

    if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error("Only PDF and DOCX files are allowed for resumes"), false);
    }
    cb(null, true);
};

const resumeUpload = multer({
    storage: resumeStorage,
    fileFilter: resumeFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// ---------------------------
// Video upload (R.2.4 - optional)
// ---------------------------
const videoStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, VIDEO_DIR),
    filename: (req, file, cb) => {
        const uniqueSuffix = `${req.user?.id || "anon"}-${Date.now()}`;
        cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const videoFileFilter = (req, file, cb) => {
    const allowedTypes = ["video/webm", "video/mp4"];
    if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error("Only WEBM and MP4 video files are allowed"), false);
    }
    cb(null, true);
};

const videoUpload = multer({
    storage: videoStorage,
    fileFilter: videoFileFilter,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

module.exports = {
    resumeUpload,
    videoUpload
};