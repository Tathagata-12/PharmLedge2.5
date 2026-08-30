const pool = require("../config/db");

// ==========================================
// CREATE MEDICINE
// ==========================================

const createMedicine = async (req, res) => {
    try {
        const userId = req.user.id;

        const {
            name,
            category,
            manufacturer,
            description,
            purchase_price,
            selling_price,
            low_stock_threshold,
            vendor_id
        } = req.body;

        // Validate required fields
        if (
            !name ||
            purchase_price === undefined ||
            selling_price === undefined
        ) {
            return res.status(400).json({
                message: "Name, purchase price and selling price are required"
            });
        }

        // Validate vendor ownership
        if (vendor_id) {
            const vendorCheck = await pool.query(
                `SELECT id
                 FROM vendors
                 WHERE id = $1
                 AND user_id = $2`,
                [vendor_id, userId]
            );

            if (vendorCheck.rows.length === 0) {
                return res.status(403).json({
                    message: "Invalid vendor"
                });
            }
        }

        // Create medicine
        const result = await pool.query(
            `INSERT INTO medicines
            (
                user_id,
                vendor_id,
                name,
                category,
                manufacturer,
                description,
                purchase_price,
                selling_price,
                low_stock_threshold
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            RETURNING *`,
            [
                userId,
                vendor_id || null,
                name,
                category || null,
                manufacturer || null,
                description || null,
                purchase_price,
                selling_price,
                low_stock_threshold || 10
            ]
        );

        return res.status(201).json({
            message: "Medicine created successfully",
            medicine: result.rows[0]
        });

    } catch (error) {
        console.error("Create medicine error:", error);

        return res.status(500).json({
            message: "Server error while creating medicine"
        });
    }
};


// ==========================================
// GET ALL MEDICINES
// ==========================================

const getMedicines = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT
                m.id,
                m.name,
                m.category,
                m.manufacturer,
                m.description,
                m.purchase_price,
                m.selling_price,
                m.low_stock_threshold,
                m.vendor_id,

                COALESCE(SUM(mb.quantity), 0) AS total_stock,

                m.created_at,
                m.updated_at

             FROM medicines m

             LEFT JOIN medicine_batches mb
                ON m.id = mb.medicine_id
                AND mb.user_id = $1

             WHERE m.user_id = $1

             GROUP BY m.id

             ORDER BY m.created_at DESC`,
            [userId]
        );

        return res.json({
            count: result.rows.length,
            medicines: result.rows
        });

    } catch (error) {
        console.error("Get medicines error:", error);

        return res.status(500).json({
            message: "Server error while fetching medicines"
        });
    }
};


// ==========================================
// GET SINGLE MEDICINE
// ==========================================

const getMedicineById = async (req, res) => {
    try {
        const userId = req.user.id;
        const medicineId = req.params.id;

        const result = await pool.query(
            `SELECT
                m.id,
                m.name,
                m.category,
                m.manufacturer,
                m.description,
                m.purchase_price,
                m.selling_price,
                m.low_stock_threshold,
                m.vendor_id,

                COALESCE(SUM(mb.quantity), 0) AS total_stock,

                m.created_at,
                m.updated_at

             FROM medicines m

             LEFT JOIN medicine_batches mb
                ON m.id = mb.medicine_id
                AND mb.user_id = $1

             WHERE m.id = $2
             AND m.user_id = $1

             GROUP BY m.id`,
            [userId, medicineId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Medicine not found"
            });
        }

        return res.json({
            medicine: result.rows[0]
        });

    } catch (error) {
        console.error("Get medicine error:", error);

        return res.status(500).json({
            message: "Server error while fetching medicine"
        });
    }
};


// ==========================================
// UPDATE MEDICINE
// ==========================================

const updateMedicine = async (req, res) => {
    try {
        const userId = req.user.id;
        const medicineId = req.params.id;

        const {
            name,
            category,
            manufacturer,
            description,
            purchase_price,
            selling_price,
            low_stock_threshold,
            vendor_id
        } = req.body;

        // Check medicine ownership
        const medicineCheck = await pool.query(
            `SELECT id
             FROM medicines
             WHERE id = $1
             AND user_id = $2`,
            [medicineId, userId]
        );

        if (medicineCheck.rows.length === 0) {
            return res.status(404).json({
                message: "Medicine not found"
            });
        }

        // Validate vendor ownership
        if (vendor_id !== undefined && vendor_id !== null) {
            const vendorCheck = await pool.query(
                `SELECT id
                 FROM vendors
                 WHERE id = $1
                 AND user_id = $2`,
                [vendor_id, userId]
            );

            if (vendorCheck.rows.length === 0) {
                return res.status(403).json({
                    message: "Invalid vendor"
                });
            }
        }

        // Update medicine
        const result = await pool.query(
            `UPDATE medicines
             SET
                name = COALESCE($1, name),
                category = COALESCE($2, category),
                manufacturer = COALESCE($3, manufacturer),
                description = COALESCE($4, description),
                purchase_price = COALESCE($5, purchase_price),
                selling_price = COALESCE($6, selling_price),
                low_stock_threshold = COALESCE($7, low_stock_threshold),

                vendor_id = CASE
                    WHEN $8::INTEGER IS NULL THEN NULL
                    ELSE $8
                END,

                updated_at = CURRENT_TIMESTAMP

             WHERE id = $9
             AND user_id = $10

             RETURNING *`,
            [
                name,
                category,
                manufacturer,
                description,
                purchase_price,
                selling_price,
                low_stock_threshold,
                vendor_id,
                medicineId,
                userId
            ]
        );

        return res.json({
            message: "Medicine updated successfully",
            medicine: result.rows[0]
        });

    } catch (error) {
        console.error("Update medicine error:", error);

        return res.status(500).json({
            message: "Server error while updating medicine"
        });
    }
};


// ==========================================
// DELETE MEDICINE
// ==========================================

const deleteMedicine = async (req, res) => {
    try {
        const userId = req.user.id;
        const medicineId = req.params.id;

        const result = await pool.query(
            `DELETE FROM medicines
             WHERE id = $1
             AND user_id = $2
             RETURNING id`,
            [medicineId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Medicine not found"
            });
        }

        return res.json({
            message: "Medicine deleted successfully"
        });

    } catch (error) {
        console.error("Delete medicine error:", error);

        return res.status(500).json({
            message: "Server error while deleting medicine"
        });
    }
};


// ==========================================
// EXPORT
// ==========================================

module.exports = {
    createMedicine,
    getMedicines,
    getMedicineById,
    updateMedicine,
    deleteMedicine
};