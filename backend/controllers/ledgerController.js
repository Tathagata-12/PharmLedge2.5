const pool = require("../config/db");

// ==========================================
// GET VENDOR LEDGER
// GET /api/ledger/vendor/:vendorId
// ==========================================

const getVendorLedger = async (req, res) => {
    try {
        const userId = req.user.id;
        const vendorId = req.params.vendorId;

        // ==========================================
        // CHECK VENDOR OWNERSHIP
        // ==========================================

        const vendorResult = await pool.query(
            `
            SELECT
                id,
                name,
                contact,
                email,
                address
            FROM vendors
            WHERE id = $1
            AND user_id = $2
            `,
            [vendorId, userId]
        );

        if (vendorResult.rows.length === 0) {
            return res.status(404).json({
                message: "Vendor not found"
            });
        }

        const vendor = vendorResult.rows[0];

        // ==========================================
        // GET LEDGER TRANSACTIONS
        // ==========================================

        const ledgerResult = await pool.query(
            `
            SELECT
                id,
                vendor_id,
                transaction_type,
                reference_id,
                description,
                debit,
                credit,
                created_at
            FROM vendor_ledger
            WHERE vendor_id = $1
            AND user_id = $2
            ORDER BY created_at ASC, id ASC
            `,
            [vendorId, userId]
        );

        // ==========================================
        // CALCULATE BALANCE
        // ==========================================

        let balance = 0;

        const transactions = ledgerResult.rows.map((transaction) => {

            const debit = Number(transaction.debit || 0);
            const credit = Number(transaction.credit || 0);

            balance += debit;
            balance -= credit;

            return {
                ...transaction,
                debit,
                credit,
                balance
            };
        });

        // ==========================================
        // SUMMARY
        // ==========================================

        const totalPurchases = transactions.reduce(
            (total, transaction) =>
                total + transaction.debit,
            0
        );

        const totalPayments = transactions.reduce(
            (total, transaction) =>
                total + transaction.credit,
            0
        );

        return res.json({
            vendor,
            summary: {
                total_purchases: totalPurchases,
                total_payments: totalPayments,
                outstanding_balance: balance
            },
            transactions
        });

    } catch (error) {

        console.error(
            "Get vendor ledger error:",
            error
        );

        return res.status(500).json({
            message:
                "Server error while fetching vendor ledger"
        });
    }
};


// ==========================================
// ADD VENDOR PAYMENT
// POST /api/ledger/vendor/:vendorId/payment
// ==========================================

const addVendorPayment = async (req, res) => {
    try {
        const userId = req.user.id;
        const vendorId = req.params.vendorId;

        const {
            amount,
            description
        } = req.body;

        const paymentAmount = Number(amount);

        // ==========================================
        // VALIDATION
        // ==========================================

        if (
            !Number.isFinite(paymentAmount) ||
            paymentAmount <= 0
        ) {
            return res.status(400).json({
                message: "Payment amount must be greater than 0"
            });
        }

        // ==========================================
        // CHECK VENDOR
        // ==========================================

        const vendorResult = await pool.query(
            `
            SELECT id, name
            FROM vendors
            WHERE id = $1
            AND user_id = $2
            `,
            [vendorId, userId]
        );

        if (vendorResult.rows.length === 0) {
            return res.status(404).json({
                message: "Vendor not found"
            });
        }

        // ==========================================
        // CHECK CURRENT OUTSTANDING
        // ==========================================

        const balanceResult = await pool.query(
            `
            SELECT
                COALESCE(SUM(debit), 0) -
                COALESCE(SUM(credit), 0) AS balance
            FROM vendor_ledger
            WHERE vendor_id = $1
            AND user_id = $2
            `,
            [vendorId, userId]
        );

        const currentBalance = Number(
            balanceResult.rows[0].balance || 0
        );

        // ==========================================
        // DON'T ALLOW OVERPAYMENT
        // ==========================================

        if (paymentAmount > currentBalance) {
            return res.status(400).json({
                message:
                    `Payment cannot exceed outstanding balance of ₹${currentBalance.toFixed(2)}`
            });
        }

        // ==========================================
        // ADD PAYMENT
        // ==========================================

        const result = await pool.query(
            `
            INSERT INTO vendor_ledger
            (
                vendor_id,
                user_id,
                transaction_type,
                description,
                debit,
                credit
            )
            VALUES
            ($1, $2, 'PAYMENT', $3, 0, $4)
            RETURNING *
            `,
            [
                vendorId,
                userId,
                description || "Payment to vendor",
                paymentAmount
            ]
        );

        return res.status(201).json({
            message: "Vendor payment added successfully",
            transaction: result.rows[0],
            remaining_balance:
                currentBalance - paymentAmount
        });

    } catch (error) {

        console.error(
            "Add vendor payment error:",
            error
        );

        return res.status(500).json({
            message:
                "Server error while adding vendor payment"
        });
    }
};


// ==========================================
// GET VENDOR BALANCE
// GET /api/ledger/vendor/:vendorId/balance
// ==========================================

const getVendorBalance = async (req, res) => {
    try {
        const userId = req.user.id;
        const vendorId = req.params.vendorId;

        // ==========================================
        // CHECK VENDOR
        // ==========================================

        const vendorResult = await pool.query(
            `
            SELECT id, name
            FROM vendors
            WHERE id = $1
            AND user_id = $2
            `,
            [vendorId, userId]
        );

        if (vendorResult.rows.length === 0) {
            return res.status(404).json({
                message: "Vendor not found"
            });
        }

        // ==========================================
        // CALCULATE BALANCE
        // ==========================================

        const result = await pool.query(
            `
            SELECT
                COALESCE(SUM(debit), 0) AS total_debit,
                COALESCE(SUM(credit), 0) AS total_credit,
                COALESCE(SUM(debit), 0) -
                COALESCE(SUM(credit), 0) AS balance
            FROM vendor_ledger
            WHERE vendor_id = $1
            AND user_id = $2
            `,
            [vendorId, userId]
        );

        const totalPurchases =
            Number(result.rows[0].total_debit || 0);

        const totalPayments =
            Number(result.rows[0].total_credit || 0);

        const balance =
            Number(result.rows[0].balance || 0);

        return res.json({
            vendor: vendorResult.rows[0],
            total_purchases: totalPurchases,
            total_payments: totalPayments,
            outstanding_balance: balance
        });

    } catch (error) {

        console.error(
            "Get vendor balance error:",
            error
        );

        return res.status(500).json({
            message:
                "Server error while fetching vendor balance"
        });
    }
};


// ==========================================
// EXPORTS
// ==========================================

module.exports = {
    getVendorLedger,
    addVendorPayment,
    getVendorBalance
};