const DeliveryMetrics = require("../models/DeliveryMetrics");

const createDeliveryMetrics = async (req, res) => {
    try {
        const deliveryMetrics = await DeliveryMetrics.create(req.body);
        res.status(201).json(deliveryMetrics);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getDeliveryMetrics = async (req, res) => {
    try {
        const deliveryMetrics = await DeliveryMetrics.findById(req.params.id);
        res.status(200).json(deliveryMetrics);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllDeliveryMetrics = async (req, res) => {
    try {
        const deliveryMetrics = await DeliveryMetrics.find();  
        res.status(200).json(deliveryMetrics);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createDeliveryMetrics,
    getAllDeliveryMetrics,
    getDeliveryMetrics
};