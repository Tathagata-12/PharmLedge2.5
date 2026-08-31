const express = require("express");

const {
    getVendorLedger,
    addVendorPayment,
    getVendorBalance
} = require("../controllers/ledgerController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// ALL LEDGER ROUTES REQUIRE AUTHENTICATION
// ==========================================

router.use(authMiddleware);

// ==========================================
// GET COMPLETE VENDOR LEDGER
// GET /api/ledger/vendor/:vendorId
// ==========================================

router.get(
    "/vendor/:vendorId",
    getVendorLedger
);

// ==========================================
// GET VENDOR BALANCE
// GET /api/ledger/vendor/:vendorId/balance
// ==========================================

router.get(
    "/vendor/:vendorId/balance",
    getVendorBalance
);

// ==========================================
// ADD PAYMENT TO VENDOR
// POST /api/ledger/vendor/:vendorId/payment
// ==========================================

router.post(
    "/vendor/:vendorId/payment",
    addVendorPayment
);

// ==========================================
// EXPORT
// ==========================================

module.exports = router;