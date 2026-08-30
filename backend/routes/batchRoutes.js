const express = require("express");

const {
    createBatch,
    getAllBatches,
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
// GET ALL STOCK
// GET /api/batches
// ==========================================

router.get("/", getAllBatches);

// ==========================================
// ADD NEW BATCH / STOCK
// POST /api/batches
// ==========================================

router.post("/", createBatch);

// ==========================================
// GET ALL BATCHES FOR A MEDICINE
// GET /api/batches/medicine/:medicineId
// ==========================================

router.get(
    "/medicine/:medicineId",
    getBatchesByMedicine
);

// ==========================================
// UPDATE BATCH
// PUT /api/batches/:id
// ==========================================

router.put(
    "/:id",
    updateBatch
);

// ==========================================
// DELETE BATCH
// DELETE /api/batches/:id
// ==========================================

router.delete(
    "/:id",
    deleteBatch
);

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;