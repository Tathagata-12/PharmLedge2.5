const express = require("express");

const {
    createMedicine,
    getMedicines,
    getMedicineById,
    updateMedicine,
    deleteMedicine
} = require("../controllers/medicineController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// ALL MEDICINE ROUTES REQUIRE AUTHENTICATION
// ==========================================

router.use(authMiddleware);

// ==========================================
// CREATE MEDICINE
// POST /api/medicines
// ==========================================

router.post("/", createMedicine);

// ==========================================
// GET ALL MEDICINES
// GET /api/medicines
// ==========================================

router.get("/", getMedicines);

// ==========================================
// GET SINGLE MEDICINE
// GET /api/medicines/:id
// ==========================================

router.get("/:id", getMedicineById);

// ==========================================
// UPDATE MEDICINE
// PUT /api/medicines/:id
// ==========================================

router.put("/:id", updateMedicine);

// ==========================================
// DELETE MEDICINE
// DELETE /api/medicines/:id
// ==========================================

router.delete("/:id", deleteMedicine);

module.exports = router;