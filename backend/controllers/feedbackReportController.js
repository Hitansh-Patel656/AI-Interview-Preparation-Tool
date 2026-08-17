const FeedbackReport = require('../controllers/feedbackReportController');

const createFeedbackReport = async (req, res) => {
    try {
        const feedbackReport = await FeedbackReport.create(req.body);
        res.status(201).json(feedbackReport);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getFeedbackReport = async (req, res) => {
    try {
        const feedbackReports = await FeedbackReport.findById(req.params.id);
        res.status(200).json(feedbackReports);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const getAllFeedbackReports = async (req, res) => {
    try {
        const feedbackReports = await FeedbackReport.find();
        res.status(200).json(feedbackReports);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createFeedbackReport,
    getFeedbackReport,
    getAllFeedbackReports
};