const pool = require("../config/db");

// ==========================================
// ADD BATCH / ADD STOCK
// ==========================================

const createBatch = async (req, res) => {
    try {
        const userId = req.user.id;

        const {
            medicine_id,
            batch_number,
            quantity,
            purchase_price,
            selling_price,
            manufacturing_date,
            expiry_date
        } = req.body;

        // ==========================================
        // VALIDATION
        // ==========================================

        if (
            !medicine_id ||
            !batch_number ||
            quantity === undefined ||
            purchase_price === undefined ||
            selling_price === undefined
        ) {
            return res.status(400).json({
                message:
                    "Medicine, batch number, quantity, purchase price and selling price are required"
            });
        }

        if (Number(quantity) < 0) {
            return res.status(400).json({
                message: "Quantity cannot be negative"
            });
        }

        if (Number(purchase_price) < 0) {
            return res.status(400).json({
                message: "Purchase price cannot be negative"
            });
        }

        if (Number(selling_price) < 0) {
            return res.status(400).json({
                message: "Selling price cannot be negative"
            });
        }

        // ==========================================
        // CHECK MEDICINE OWNERSHIP
        // ==========================================

        const medicineCheck = await pool.query(
            `
            SELECT id
            FROM medicines
            WHERE id = $1
            AND user_id = $2
            `,
            [medicine_id, userId]
        );

        if (medicineCheck.rows.length === 0) {
            return res.status(404).json({
                message: "Medicine not found"
            });
        }

        // ==========================================
        // CHECK DUPLICATE BATCH
        // ==========================================

        const existingBatch = await pool.query(
            `
            SELECT id
            FROM medicine_batches
            WHERE user_id = $1
            AND batch_number = $2
            `,
            [userId, batch_number]
        );

        if (existingBatch.rows.length > 0) {
            return res.status(409).json({
                message: "Batch number already exists"
            });
        }

        // ==========================================
        // CREATE BATCH
        // ==========================================

        const result = await pool.query(
            `
            INSERT INTO medicine_batches
            (
                medicine_id,
                user_id,
                batch_number,
                quantity,
                purchase_price,
                selling_price,
                manufacturing_date,
                expiry_date
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            RETURNING *
            `,
            [
                medicine_id,
                userId,
                batch_number,
                quantity,
                purchase_price,
                selling_price,
                manufacturing_date || null,
                expiry_date || null
            ]
        );

        return res.status(201).json({
            message: "Batch added successfully",
            batch: result.rows[0]
        });

    } catch (error) {
        console.error("Create batch error:", error);

        return res.status(500).json({
            message: "Server error while adding batch"
        });
    }
};


// ==========================================
// GET ALL BATCHES
// GET /api/batches
// ==========================================

const getAllBatches = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `
            SELECT
                mb.id,
                mb.medicine_id,
                mb.user_id,
                mb.batch_number,
                mb.quantity,
                mb.purchase_price,
                mb.selling_price,
                mb.manufacturing_date,
                mb.expiry_date,
                mb.created_at,
                mb.updated_at,
                m.name AS medicine_name
            FROM medicine_batches mb
            INNER JOIN medicines m
                ON mb.medicine_id = m.id
            WHERE mb.user_id = $1
            ORDER BY mb.expiry_date ASC NULLS LAST, mb.id DESC
            `,
            [userId]
        );

        return res.json({
            count: result.rows.length,
            batches: result.rows
        });

    } catch (error) {
        console.error("Get all batches error:", error);

        return res.status(500).json({
            message: "Server error while fetching stock"
        });
    }
};


// ==========================================
// GET ALL BATCHES FOR A MEDICINE
// GET /api/batches/medicine/:medicineId
// ==========================================

const getBatchesByMedicine = async (req, res) => {
    try {
        const userId = req.user.id;
        const medicineId = req.params.medicineId;

        // ==========================================
        // CHECK MEDICINE OWNERSHIP
        // ==========================================

        const medicineCheck = await pool.query(
            `
            SELECT id
            FROM medicines
            WHERE id = $1
            AND user_id = $2
            `,
            [medicineId, userId]
        );

        if (medicineCheck.rows.length === 0) {
            return res.status(404).json({
                message: "Medicine not found"
            });
        }

        // ==========================================
        // GET BATCHES
        // ==========================================

        const result = await pool.query(
            `
            SELECT *
            FROM medicine_batches
            WHERE medicine_id = $1
            AND user_id = $2
            ORDER BY expiry_date ASC NULLS LAST
            `,
            [medicineId, userId]
        );

        return res.json({
            count: result.rows.length,
            batches: result.rows
        });

    } catch (error) {
        console.error("Get batches by medicine error:", error);

        return res.status(500).json({
            message: "Server error while fetching batches"
        });
    }
};


// ==========================================
// UPDATE BATCH
// PUT /api/batches/:id
// ==========================================

const updateBatch = async (req, res) => {
    try {
        const userId = req.user.id;
        const batchId = req.params.id;

        const {
            medicine_id,
            batch_number,
            quantity,
            purchase_price,
            selling_price,
            manufacturing_date,
            expiry_date
        } = req.body;

        // ==========================================
        // CHECK BATCH OWNERSHIP
        // ==========================================

        const batchCheck = await pool.query(
            `
            SELECT id
            FROM medicine_batches
            WHERE id = $1
            AND user_id = $2
            `,
            [batchId, userId]
        );

        if (batchCheck.rows.length === 0) {
            return res.status(404).json({
                message: "Batch not found"
            });
        }

        // ==========================================
        // VALIDATION
        // ==========================================

        if (
            quantity !== undefined &&
            Number(quantity) < 0
        ) {
            return res.status(400).json({
                message: "Quantity cannot be negative"
            });
        }

        if (
            purchase_price !== undefined &&
            Number(purchase_price) < 0
        ) {
            return res.status(400).json({
                message: "Purchase price cannot be negative"
            });
        }

        if (
            selling_price !== undefined &&
            Number(selling_price) < 0
        ) {
            return res.status(400).json({
                message: "Selling price cannot be negative"
            });
        }

        // ==========================================
        // CHECK MEDICINE IF PROVIDED
        // ==========================================

        if (medicine_id !== undefined) {
            const medicineCheck = await pool.query(
                `
                SELECT id
                FROM medicines
                WHERE id = $1
                AND user_id = $2
                `,
                [medicine_id, userId]
            );

            if (medicineCheck.rows.length === 0) {
                return res.status(404).json({
                    message: "Medicine not found"
                });
            }
        }

        // ==========================================
        // CHECK DUPLICATE BATCH NUMBER
        // ==========================================

        if (batch_number !== undefined) {
            const duplicateCheck = await pool.query(
                `
                SELECT id
                FROM medicine_batches
                WHERE user_id = $1
                AND batch_number = $2
                AND id != $3
                `,
                [userId, batch_number, batchId]
            );

            if (duplicateCheck.rows.length > 0) {
                return res.status(409).json({
                    message: "Batch number already exists"
                });
            }
        }

        // ==========================================
        // UPDATE
        // ==========================================

        const result = await pool.query(
            `
            UPDATE medicine_batches
            SET
                medicine_id = COALESCE($1, medicine_id),
                batch_number = COALESCE($2, batch_number),
                quantity = COALESCE($3, quantity),
                purchase_price = COALESCE($4, purchase_price),
                selling_price = COALESCE($5, selling_price),
                manufacturing_date = COALESCE($6, manufacturing_date),
                expiry_date = COALESCE($7, expiry_date),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
            AND user_id = $9
            RETURNING *
            `,
            [
                medicine_id,
                batch_number,
                quantity,
                purchase_price,
                selling_price,
                manufacturing_date,
                expiry_date,
                batchId,
                userId
            ]
        );

        return res.json({
            message: "Batch updated successfully",
            batch: result.rows[0]
        });

    } catch (error) {
        console.error("Update batch error:", error);

        return res.status(500).json({
            message: "Server error while updating batch"
        });
    }
};


// ==========================================
// DELETE BATCH
// DELETE /api/batches/:id
// ==========================================

const deleteBatch = async (req, res) => {
    try {
        const userId = req.user.id;
        const batchId = req.params.id;

        const result = await pool.query(
            `
            DELETE FROM medicine_batches
            WHERE id = $1
            AND user_id = $2
            RETURNING id
            `,
            [batchId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Batch not found"
            });
        }

        return res.json({
            message: "Batch deleted successfully"
        });

    } catch (error) {
        console.error("Delete batch error:", error);

        return res.status(500).json({
            message: "Server error while deleting batch"
        });
    }
};


// ==========================================
// EXPORTS
// ==========================================

module.exports = {
    createBatch,
    getAllBatches,
    getBatchesByMedicine,
    updateBatch,
    deleteBatch
};