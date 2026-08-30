const express = require("express");

const {
    createVendor,
    getVendors,
    getVendorById,
    updateVendor,
    deleteVendor
} = require("../controllers/vendorController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// All vendor routes require authentication
router.use(authMiddleware);

// Create vendor
router.post("/", createVendor);

// Get all vendors
router.get("/", getVendors);

// Get single vendor
router.get("/:id", getVendorById);

// Update vendor
router.put("/:id", updateVendor);

// Delete vendor
router.delete("/:id", deleteVendor);

module.exports = router;