const express = require("express");

const {
    getDashboard
} = require("../controllers/dashboardController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// AUTHENTICATION
// ==========================================

router.use(authMiddleware);

// ==========================================
// DASHBOARD
// ==========================================

router.get("/", getDashboard);

// ==========================================
// EXPORT
// ==========================================

module.exports = router;