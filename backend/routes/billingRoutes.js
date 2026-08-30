const express = require("express");

const {
    getBillingMedicines,
    getBillingBatches
} = require("../controllers/billingController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// AUTHENTICATION
// ==========================================

router.use(authMiddleware);

// ==========================================
// BILLING MEDICINES
// ==========================================

// Get medicines available for billing
router.get("/medicines", getBillingMedicines);

// ==========================================
// BILLING BATCHES
// ==========================================

// Get available batches for a medicine
router.get(
    "/medicines/:medicineId/batches",
    getBillingBatches
);

module.exports = router;