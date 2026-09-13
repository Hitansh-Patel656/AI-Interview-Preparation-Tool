// UserRoutes.js
// Routes for: Authentication (R.6), Resume/JD upload (R.1.2, R.1.3),
// Post-interview outcomes (R.4), Progress dashboard data (R.5.1)

const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware.');
const upload = require('../middleware/uploadMiddleware'); // e.g. multer config for resume files

// ---------------------------
// Auth Routes (R.6)
// ---------------------------

// R.6.1 - Register a new user
router.post('/register', userController.register);

// R.6.2 - Login (email/password)
router.post('/login', userController.login);

// R.6.2 - OAuth login/callback (Firebase/Auth0)
router.post('/oauth/callback', userController.oauthCallback);

// Refresh session/JWT
router.post('/refresh-token', userController.refreshToken);

// R.6.3 - Logout (requires active session)
router.post('/logout', authMiddleware, userController.logout);

// ---------------------------
// Profile Routes
// ---------------------------

// Get current authenticated user's profile
router.get('/me', authMiddleware, userController.getProfile);

// Update profile (name, email, password)
router.put('/me', authMiddleware, userController.updateProfile);

// ---------------------------
// Resume & Job Description (R.1.2, R.1.3)
// ---------------------------

// R.1.2 - Upload and parse resume
router.post(
  '/me/resume',
  authMiddleware,
  upload.single('resume'),
  userController.uploadResume
);

// Fetch parsed resume data
router.post('/me/resume', authMiddleware, resumeUpload.single('resume'), userController.uploadResume);


// R.1.3 - Submit/paste job description for personalization
router.post('/me/job-description', authMiddleware, userController.addJobDescription);

// ---------------------------
// Post-Interview Outcomes (R.4)
// ---------------------------

// R.4.1 / R.4.2 - Submit post-interview outcome form
router.post('/me/outcomes', authMiddleware, userController.submitOutcome);

// List past logged outcomes
router.get('/me/outcomes', authMiddleware, userController.getOutcomes);

// ---------------------------
// Progress Dashboard (R.5.1)
// ---------------------------

// Fetch historical performance / per-metric progress data
router.get('/me/progress', authMiddleware, userController.getProgress);

module.exports = router;