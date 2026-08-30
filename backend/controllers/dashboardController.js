const pool = require("../config/db");

// ==========================================
// GET DASHBOARD SUMMARY
// ==========================================

const getDashboard = async (req, res) => {
    try {
        const userId = req.user.id;

        // ------------------------------------------
        // Total medicines
        // ------------------------------------------

        const medicinesResult = await pool.query(
            `SELECT COUNT(*) AS total_medicines
             FROM medicines
             WHERE user_id = $1`,
            [userId]
        );

        // ------------------------------------------
        // Total live stock
        // ------------------------------------------

        const stockResult = await pool.query(
            `SELECT COALESCE(SUM(quantity), 0) AS total_stock
             FROM medicine_batches
             WHERE user_id = $1
             AND (
                 expiry_date IS NULL
                 OR expiry_date >= CURRENT_DATE
             )`,
            [userId]
        );

        // ------------------------------------------
        // Low stock medicines
        // ------------------------------------------

        const lowStockResult = await pool.query(
            `SELECT
                m.id,
                m.name,
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
                ) AS current_stock

             FROM medicines m

             LEFT JOIN medicine_batches mb
                ON m.id = mb.medicine_id
                AND mb.user_id = $1

             WHERE m.user_id = $1

             GROUP BY
                m.id,
                m.name,
                m.low_stock_threshold

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
             ) <= m.low_stock_threshold

             ORDER BY current_stock ASC`,
            [userId]
        );

        // ------------------------------------------
        // Expiring medicines
        // Next 30 days
        // ------------------------------------------

        const expiryResult = await pool.query(
            `SELECT
                mb.id,
                mb.batch_number,
                mb.quantity,
                mb.expiry_date,

                m.id AS medicine_id,
                m.name AS medicine_name

             FROM medicine_batches mb

             JOIN medicines m
                ON mb.medicine_id = m.id

             WHERE mb.user_id = $1
             AND mb.quantity > 0
             AND mb.expiry_date IS NOT NULL

             AND mb.expiry_date BETWEEN CURRENT_DATE
                                    AND CURRENT_DATE + INTERVAL '30 days'

             ORDER BY mb.expiry_date ASC`,
            [userId]
        );

        // ------------------------------------------
        // Today's sales
        // ------------------------------------------

        const todaySalesResult = await pool.query(
            `SELECT
                COALESCE(SUM(total_amount), 0) AS today_sales,
                COUNT(*) AS today_bills

             FROM sales

             WHERE user_id = $1
             AND created_at >= CURRENT_DATE`,
            [userId]
        );

        // ------------------------------------------
        // Recent sales
        // ------------------------------------------

        const recentSalesResult = await pool.query(
            `SELECT
                id,
                customer_name,
                total_amount,
                payment_method,
                created_at

             FROM sales

             WHERE user_id = $1

             ORDER BY created_at DESC

             LIMIT 10`,
            [userId]
        );

        // ------------------------------------------
        // Response
        // ------------------------------------------

        return res.json({
            summary: {
                total_medicines: Number(
                    medicinesResult.rows[0].total_medicines
                ),

                total_stock: Number(
                    stockResult.rows[0].total_stock
                ),

                today_sales: Number(
                    todaySalesResult.rows[0].today_sales
                ),

                today_bills: Number(
                    todaySalesResult.rows[0].today_bills
                )
            },

            low_stock: lowStockResult.rows,

            expiring_soon: expiryResult.rows,

            recent_sales: recentSalesResult.rows
        });

    } catch (error) {
        console.error("Dashboard error:", error);

        return res.status(500).json({
            message: "Server error while loading dashboard"
        });
    }
};


// ==========================================
// EXPORT
// ==========================================

module.exports = {
    getDashboard
};