const express = require("express");

const {
    createBatch,
    getBatchesByMedicine,
    updateBatch,
    deleteBatch
} = require("../controllers/batchController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// ALL BATCH ROUTES REQUIRE AUTHENTICATION
// ==========================================

router.use(authMiddleware);

// ==========================================
// ADD NEW BATCH / STOCK
// POST /api/batches
// ==========================================

router.post("/", createBatch);

// ==========================================
// GET ALL BATCHES FOR A MEDICINE
// GET /api/batches/medicine/:medicineId
// ==========================================

router.get("/medicine/:medicineId", getBatchesByMedicine);

// ==========================================
// UPDATE BATCH
// PUT /api/batches/:id
// ==========================================

router.put("/:id", updateBatch);

// ==========================================
// DELETE BATCH
// DELETE /api/batches/:id
// ==========================================

router.delete("/:id", deleteBatch);

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;