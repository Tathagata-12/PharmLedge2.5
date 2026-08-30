const pool = require("../config/db");

// ==========================================
// GET MEDICINES FOR BILLING
// ==========================================
const getBillingMedicines = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT
                m.id,
                m.name,
                m.category,
                m.selling_price,
                m.low_stock_threshold,
                COALESCE(
                    SUM(
                        CASE
                            WHEN mb.expiry_date IS NULL
                            OR mb.expiry_date >= CURRENT_DATE
                            THEN mb.quantity
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_stock
             FROM medicines m
             LEFT JOIN medicine_batches mb
                ON m.id = mb.medicine_id
                AND mb.user_id = $1
             WHERE m.user_id = $1
             GROUP BY m.id
             HAVING COALESCE(
                SUM(
                    CASE
                        WHEN mb.expiry_date IS NULL
                        OR mb.expiry_date >= CURRENT_DATE
                        THEN mb.quantity
                        ELSE 0
                    END
                ),
                0
             ) > 0
             ORDER BY m.name ASC`,
            [userId]
        );

        res.json({
            count: result.rows.length,
            medicines: result.rows
        });

    } catch (error) {
        console.error("Get billing medicines error:", error);

        res.status(500).json({
            message: "Server error while fetching billing medicines"
        });
    }
};


// ==========================================
// GET BATCHES FOR A MEDICINE
// ==========================================
const getBillingBatches = async (req, res) => {
    try {
        const userId = req.user.id;
        const medicineId = req.params.medicineId;

        const result = await pool.query(
            `SELECT
                mb.id,
                mb.medicine_id,
                mb.batch_number,
                mb.quantity,
                mb.purchase_price,
                mb.selling_price,
                mb.manufacturing_date,
                mb.expiry_date
             FROM medicine_batches mb
             WHERE mb.medicine_id = $1
             AND mb.user_id = $2
             AND mb.quantity > 0
             AND (
                mb.expiry_date IS NULL
                OR mb.expiry_date >= CURRENT_DATE
             )
             ORDER BY
                mb.expiry_date ASC NULLS LAST,
                mb.created_at ASC`,
            [medicineId, userId]
        );

        res.json({
            count: result.rows.length,
            batches: result.rows
        });

    } catch (error) {
        console.error("Get billing batches error:", error);

        res.status(500).json({
            message: "Server error while fetching batches"
        });
    }
};


// ==========================================
// EXPORTS
// ==========================================
module.exports = {
    getBillingMedicines,
    getBillingBatches
};