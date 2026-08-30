const express = require("express");

const {
    createSale,
    getSales,
    getSaleById
} = require("../controllers/salesController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// All sales routes require authentication
// ==========================================
router.use(authMiddleware);

// ==========================================
// Create sale / generate bill
// POST /
// ==========================================
router.post("/", createSale);

// ==========================================
// Get sales history
// GET /
// ==========================================
router.get("/", getSales);

// ==========================================
// Get individual bill
// GET /:id
// ==========================================
router.get("/:id", getSaleById);

module.exports = router;