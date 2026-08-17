const MetricHistory = require("../models/MetricHistory");

const createMetricHistory = async (req, res) => {
    try {
        const metricHistory = await MetricHistory.create(req.body);
        res.status(201).json(metricHistory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }   
};

const getMetricHistory = async (req, res) => {
    try {
        const metricHistories = await MetricHistory.findById(req.params.id);
        res.status(200).json(metricHistories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const getAllMetricHistory = async (req, res) => {
    try {
        const metricHistories = await MetricHistory.find();
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