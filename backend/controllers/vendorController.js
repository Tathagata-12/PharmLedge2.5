const pool = require("../config/db");

// ==========================================
// CREATE VENDOR
// ==========================================
const createVendor = async (req, res) => {
    try {
        const userId = req.user.id;

        const {
            name,
            contact,
            email,
            address
        } = req.body;

        // Validate vendor name
        if (!name || !name.trim()) {
            return res.status(400).json({
                message: "Vendor name is required"
            });
        }

        const result = await pool.query(
            `INSERT INTO vendors
            (
                user_id,
                name,
                contact,
                email,
                address
            )
            VALUES ($1,$2,$3,$4,$5)
            RETURNING *`,
            [
                userId,
                name.trim(),
                contact || null,
                email || null,
                address || null
            ]
        );

        return res.status(201).json({
            message: "Vendor created successfully",
            vendor: result.rows[0]
        });

    } catch (error) {
        console.error("Create vendor error:", error);

        return res.status(500).json({
            message: "Server error while creating vendor"
        });
    }
};


// ==========================================
// GET ALL VENDORS
// ==========================================
const getVendors = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT *
             FROM vendors
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [userId]
        );

        return res.json({
            count: result.rows.length,
            vendors: result.rows
        });

    } catch (error) {
        console.error("Get vendors error:", error);

        return res.status(500).json({
            message: "Server error while fetching vendors"
        });
    }
};


// ==========================================
// GET SINGLE VENDOR
// ==========================================
const getVendorById = async (req, res) => {
    try {
        const userId = req.user.id;
        const vendorId = req.params.id;

        const result = await pool.query(
            `SELECT *
             FROM vendors
             WHERE id = $1
             AND user_id = $2`,
            [vendorId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Vendor not found"
            });
        }

        return res.json({
            vendor: result.rows[0]
        });

    } catch (error) {
        console.error("Get vendor error:", error);

        return res.status(500).json({
            message: "Server error while fetching vendor"
        });
    }
};


// ==========================================
// UPDATE VENDOR
// ==========================================
const updateVendor = async (req, res) => {
    try {
        const userId = req.user.id;
        const vendorId = req.params.id;

        const {
            name,
            contact,
            email,
            address
        } = req.body;

        // Validate name if provided
        if (name !== undefined && !name.trim()) {
            return res.status(400).json({
                message: "Vendor name cannot be empty"
            });
        }

        const result = await pool.query(
            `UPDATE vendors
             SET
                name = COALESCE($1, name),
                contact = COALESCE($2, contact),
                email = COALESCE($3, email),
                address = COALESCE($4, address)
             WHERE id = $5
             AND user_id = $6
             RETURNING *`,
            [
                name !== undefined ? name.trim() : null,
                contact,
                email,
                address,
                vendorId,
                userId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Vendor not found"
            });
        }

        return res.json({
            message: "Vendor updated successfully",
            vendor: result.rows[0]
        });

    } catch (error) {
        console.error("Update vendor error:", error);

        return res.status(500).json({
            message: "Server error while updating vendor"
        });
    }
};


// ==========================================
// DELETE VENDOR
// ==========================================
const deleteVendor = async (req, res) => {
    try {
        const userId = req.user.id;
        const vendorId = req.params.id;

        const result = await pool.query(
            `DELETE FROM vendors
             WHERE id = $1
             AND user_id = $2
             RETURNING id`,
            [vendorId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Vendor not found"
            });
        }

        return res.json({
            message: "Vendor deleted successfully"
        });

    } catch (error) {
        console.error("Delete vendor error:", error);

        return res.status(500).json({
            message: "Server error while deleting vendor"
        });
    }
};


module.exports = {
    createVendor,
    getVendors,
    getVendorById,
    updateVendor,
    deleteVendor
};