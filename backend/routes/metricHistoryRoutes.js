const express = require("express");

const{
    createMetricHistory,
    getAllMetricHistory,
    getMetricHistory
} = require("../controllers/metricHistoryController");

const router = express.Router();

router.post("/", createMetricHistory);
router.get("/", getAllMetricHistory);
router.get("/:id", getMetricHistory);

module.exports=router;