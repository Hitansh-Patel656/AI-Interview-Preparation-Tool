const mongoose = require("mongoose");
const MetricHistory = require("../models/MetricHistory");
const User = require("../models/User");

const createMetricHistory = async (req, res) => {
    try {
        const { user_id, metric_name, value } = req.body;

        if (!user_id || !metric_name || value === undefined) {
            return res.status(400).json({ message: "user_id, metric_name, and value are required" });
        }

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json({ message: "Invalid user_id" });
        }

        const userExists = await User.findById(user_id);
        if (!userExists) {
            return res.status(404).json({ message: "Referenced user does not exist" });
        }

        const metricHistory = await MetricHistory.create({ user_id, metric_name, value });
        res.status(201).json(metricHistory);
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

const getMetricHistory = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid metric history id" });
        }

        const metricHistory = await MetricHistory.findById(req.params.id);
        if (!metricHistory) {
            return res.status(404).json({ message: "Metric history entry not found" });
        }

        res.status(200).json(metricHistory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllMetricHistory = async (req, res) => {
    try {
        const filter = {};

        // Dashboard trend charts (R.5.2) need "this user's history for one metric,
        // in time order" — not a global dump of every metric for every user
        if (req.query.user_id) {
            if (!mongoose.Types.ObjectId.isValid(req.query.user_id)) {
                return res.status(400).json({ message: "Invalid user_id filter" });
            }
            filter.user_id = req.query.user_id;
        }

        if (req.query.metric_name) {
            filter.metric_name = req.query.metric_name;
        }

        const metricHistories = await MetricHistory.find(filter).sort({ recorded_at: 1 });
        res.status(200).json(metricHistories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createMetricHistory,
    getAllMetricHistory,
    getMetricHistory
};