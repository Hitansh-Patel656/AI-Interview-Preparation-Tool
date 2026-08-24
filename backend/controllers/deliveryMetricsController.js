const mongoose = require("mongoose");
const DeliveryMetrics = require("../models/DeliveryMetrics");
const Answer = require("../models/Answer");

const createDeliveryMetrics = async (req, res) => {
    try {
        const { answer_id, pace_wpm, filler_word_count, tone } = req.body;

        if (!answer_id || pace_wpm === undefined || filler_word_count === undefined || !tone) {
            return res.status(400).json({
                message: "answer_id, pace_wpm, filler_word_count, and tone are required"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(answer_id)) {
            return res.status(400).json({ message: "Invalid answer_id" });
        }

        const answerExists = await Answer.findById(answer_id);
        if (!answerExists) {
            return res.status(404).json({ message: "Referenced answer does not exist" });
        }

        const existing = await DeliveryMetrics.findOne({ answer_id });
        if (existing) {
            return res.status(409).json({ message: "Delivery metrics already exist for this answer" });
        }

        const deliveryMetrics = await DeliveryMetrics.create({
            answer_id,
            pace_wpm,
            filler_word_count,
            tone
        });

        res.status(201).json(deliveryMetrics);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "Delivery metrics already exist for this answer" });
        }
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

const getDeliveryMetrics = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid delivery metrics id" });
        }

        const deliveryMetrics = await DeliveryMetrics.findById(req.params.id);
        if (!deliveryMetrics) {
            return res.status(404).json({ message: "Delivery metrics not found" });
        }

        res.status(200).json(deliveryMetrics);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getDeliveryMetricsByAnswer = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.answerId)) {
            return res.status(400).json({ message: "Invalid answer id" });
        }

        const deliveryMetrics = await DeliveryMetrics.findOne({ answer_id: req.params.answerId });
        if (!deliveryMetrics) {
            return res.status(404).json({ message: "No delivery metrics found for this answer" });
        }

        res.status(200).json(deliveryMetrics);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllDeliveryMetrics = async (req, res) => {
    try {
        const filter = {};

        if (req.query.answer_id) {
            if (!mongoose.Types.ObjectId.isValid(req.query.answer_id)) {
                return res.status(400).json({ message: "Invalid answer_id filter" });
            }
            filter.answer_id = req.query.answer_id;
        }

        const deliveryMetrics = await DeliveryMetrics.find(filter);
        res.status(200).json(deliveryMetrics);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createDeliveryMetrics,
    getAllDeliveryMetrics,
    getDeliveryMetrics,
    getDeliveryMetricsByAnswer
};