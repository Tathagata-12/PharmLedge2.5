const pool = require("../config/db");


// ==========================================
// ADD BATCH / ADD STOCK
// POST /api/batches
// ==========================================

const createBatch = async (req, res) => {

    const client = await pool.connect();

    try {

        const userId = req.user.id;

        const {
            medicine_id,
            vendor_id,
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


        const numericQuantity = Number(quantity);
        const numericPurchasePrice = Number(purchase_price);
        const numericSellingPrice = Number(selling_price);


        if (
            !Number.isFinite(numericQuantity) ||
            numericQuantity < 0
        ) {
            return res.status(400).json({
                message: "Quantity cannot be negative"
            });
        }


        if (
            !Number.isFinite(numericPurchasePrice) ||
            numericPurchasePrice < 0
        ) {
            return res.status(400).json({
                message: "Purchase price cannot be negative"
            });
        }


        if (
            !Number.isFinite(numericSellingPrice) ||
            numericSellingPrice < 0
        ) {
            return res.status(400).json({
                message: "Selling price cannot be negative"
            });
        }


        // ==========================================
        // START TRANSACTION
        // ==========================================

        await client.query("BEGIN");


        // ==========================================
        // CHECK MEDICINE OWNERSHIP
        // ==========================================

        const medicineCheck = await client.query(
            `
            SELECT id
            FROM medicines
            WHERE id = $1
            AND user_id = $2
            `,
            [medicine_id, userId]
        );


        if (medicineCheck.rows.length === 0) {

            await client.query("ROLLBACK");

            return res.status(404).json({
                message: "Medicine not found"
            });
        }


        // ==========================================
        // CHECK VENDOR OWNERSHIP
        // ==========================================

        if (
            vendor_id !== undefined &&
            vendor_id !== null &&
            vendor_id !== ""
        ) {

            const vendorCheck = await client.query(
                `
                SELECT id
                FROM vendors
                WHERE id = $1
                AND user_id = $2
                `,
                [vendor_id, userId]
            );


            if (vendorCheck.rows.length === 0) {

                await client.query("ROLLBACK");

                return res.status(404).json({
                    message: "Vendor not found"
                });
            }
        }


        // ==========================================
        // CHECK DUPLICATE BATCH
        // ==========================================

        const existingBatch = await client.query(
            `
            SELECT id
            FROM medicine_batches
            WHERE user_id = $1
            AND batch_number = $2
            `,
            [userId, batch_number]
        );


        if (existingBatch.rows.length > 0) {

            await client.query("ROLLBACK");

            return res.status(409).json({
                message: "Batch number already exists"
            });
        }


        // ==========================================
        // CREATE BATCH
        // ==========================================

        const batchResult = await client.query(
            `
            INSERT INTO medicine_batches
            (
                medicine_id,
                user_id,
                vendor_id,
                batch_number,
                quantity,
                purchase_price,
                selling_price,
                manufacturing_date,
                expiry_date
            )
            VALUES
            ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            RETURNING *
            `,
            [
                medicine_id,
                userId,
                vendor_id || null,
                batch_number,
                numericQuantity,
                numericPurchasePrice,
                numericSellingPrice,
                manufacturing_date || null,
                expiry_date || null
            ]
        );


        const batch = batchResult.rows[0];


        // ==========================================
        // CREATE VENDOR PURCHASE LEDGER
        // ==========================================

        if (
            vendor_id !== undefined &&
            vendor_id !== null &&
            vendor_id !== ""
        ) {

            const purchaseAmount =
                numericQuantity * numericPurchasePrice;


            await client.query(
                `
                INSERT INTO vendor_ledger
                (
                    vendor_id,
                    user_id,
                    transaction_type,
                    reference_id,
                    description,
                    debit,
                    credit
                )
                VALUES
                (
                    $1,
                    $2,
                    'PURCHASE',
                    $3,
                    $4,
                    $5,
                    0
                )
                `,
                [
                    vendor_id,
                    userId,
                    batch.id,
                    `Purchase - Batch ${batch_number}`,
                    purchaseAmount
                ]
            );
        }


        // ==========================================
        // COMMIT
        // ==========================================

        await client.query("COMMIT");


        return res.status(201).json({
            message: "Batch added successfully",
            batch
        });


    } catch (error) {

        await client.query("ROLLBACK");

        console.error(
            "Create batch error:",
            error
        );

        return res.status(500).json({
            message:
                "Server error while adding batch"
        });

    } finally {

        client.release();
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
                mb.vendor_id,
                mb.batch_number,
                mb.quantity,
                mb.purchase_price,
                mb.selling_price,
                mb.manufacturing_date,
                mb.expiry_date,
                mb.created_at,
                mb.updated_at,

                m.name AS medicine_name,
                v.name AS vendor_name

            FROM medicine_batches mb

            INNER JOIN medicines m
                ON mb.medicine_id = m.id
                AND m.user_id = $1

            LEFT JOIN vendors v
                ON mb.vendor_id = v.id
                AND v.user_id = $1

            WHERE mb.user_id = $1

            ORDER BY
                mb.expiry_date ASC NULLS LAST,
                mb.id DESC
            `,
            [userId]
        );


        return res.json({
            count: result.rows.length,
            batches: result.rows
        });


    } catch (error) {

        console.error(
            "Get all batches error:",
            error
        );

        return res.status(500).json({
            message:
                "Server error while fetching stock"
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
            SELECT
                mb.*,
                v.name AS vendor_name

            FROM medicine_batches mb

            LEFT JOIN vendors v
                ON mb.vendor_id = v.id
                AND v.user_id = $2

            WHERE mb.medicine_id = $1
            AND mb.user_id = $2

            ORDER BY
                mb.expiry_date ASC NULLS LAST
            `,
            [medicineId, userId]
        );


        return res.json({
            count: result.rows.length,
            batches: result.rows
        });


    } catch (error) {

        console.error(
            "Get batches by medicine error:",
            error
        );

        return res.status(500).json({
            message:
                "Server error while fetching batches"
        });
    }
};



// ==========================================
// UPDATE BATCH
// PUT /api/batches/:id
// ==========================================

const updateBatch = async (req, res) => {

    const client = await pool.connect();

    try {

        const userId = req.user.id;
        const batchId = req.params.id;


        const {
            medicine_id,
            vendor_id,
            batch_number,
            quantity,
            purchase_price,
            selling_price,
            manufacturing_date,
            expiry_date
        } = req.body;


        // ==========================================
        // START TRANSACTION
        // ==========================================

        await client.query("BEGIN");


        // ==========================================
        // GET EXISTING BATCH
        // ==========================================

        const existingBatchResult =
            await client.query(
                `
                SELECT *
                FROM medicine_batches
                WHERE id = $1
                AND user_id = $2
                `,
                [batchId, userId]
            );


        if (existingBatchResult.rows.length === 0) {

            await client.query("ROLLBACK");

            return res.status(404).json({
                message: "Batch not found"
            });
        }


        const existingBatch =
            existingBatchResult.rows[0];


        // ==========================================
        // VALIDATION
        // ==========================================

        if (
            quantity !== undefined &&
            (
                !Number.isFinite(Number(quantity)) ||
                Number(quantity) < 0
            )
        ) {

            await client.query("ROLLBACK");

            return res.status(400).json({
                message: "Quantity cannot be negative"
            });
        }


        if (
            purchase_price !== undefined &&
            (
                !Number.isFinite(Number(purchase_price)) ||
                Number(purchase_price) < 0
            )
        ) {

            await client.query("ROLLBACK");

            return res.status(400).json({
                message: "Purchase price cannot be negative"
            });
        }


        if (
            selling_price !== undefined &&
            (
                !Number.isFinite(Number(selling_price)) ||
                Number(selling_price) < 0
            )
        ) {

            await client.query("ROLLBACK");

            return res.status(400).json({
                message: "Selling price cannot be negative"
            });
        }


        // ==========================================
        // CHECK MEDICINE
        // ==========================================

        if (medicine_id !== undefined) {

            const medicineCheck =
                await client.query(
                    `
                    SELECT id
                    FROM medicines
                    WHERE id = $1
                    AND user_id = $2
                    `,
                    [medicine_id, userId]
                );


            if (medicineCheck.rows.length === 0) {

                await client.query("ROLLBACK");

                return res.status(404).json({
                    message: "Medicine not found"
                });
            }
        }


        // ==========================================
        // CHECK VENDOR
        // ==========================================

        if (
            vendor_id !== undefined &&
            vendor_id !== null &&
            vendor_id !== ""
        ) {

            const vendorCheck =
                await client.query(
                    `
                    SELECT id
                    FROM vendors
                    WHERE id = $1
                    AND user_id = $2
                    `,
                    [vendor_id, userId]
                );


            if (vendorCheck.rows.length === 0) {

                await client.query("ROLLBACK");

                return res.status(404).json({
                    message: "Vendor not found"
                });
            }
        }


        // ==========================================
        // CHECK DUPLICATE BATCH NUMBER
        // ==========================================

        if (batch_number !== undefined) {

            const duplicateCheck =
                await client.query(
                    `
                    SELECT id
                    FROM medicine_batches
                    WHERE user_id = $1
                    AND batch_number = $2
                    AND id != $3
                    `,
                    [
                        userId,
                        batch_number,
                        batchId
                    ]
                );


            if (duplicateCheck.rows.length > 0) {

                await client.query("ROLLBACK");

                return res.status(409).json({
                    message:
                        "Batch number already exists"
                });
            }
        }


        // ==========================================
        // DETERMINE FINAL VALUES
        // ==========================================

        const finalMedicineId =
            medicine_id !== undefined
                ? medicine_id
                : existingBatch.medicine_id;


        const finalVendorId =
            vendor_id !== undefined
                ? (
                    vendor_id === ""
                        ? null
                        : vendor_id
                )
                : existingBatch.vendor_id;


        const finalBatchNumber =
            batch_number !== undefined
                ? batch_number
                : existingBatch.batch_number;


        const finalQuantity =
            quantity !== undefined
                ? Number(quantity)
                : Number(existingBatch.quantity);


        const finalPurchasePrice =
            purchase_price !== undefined
                ? Number(purchase_price)
                : Number(existingBatch.purchase_price);


        const finalSellingPrice =
            selling_price !== undefined
                ? Number(selling_price)
                : Number(existingBatch.selling_price);


        const finalManufacturingDate =
            manufacturing_date !== undefined
                ? manufacturing_date
                : existingBatch.manufacturing_date;


        const finalExpiryDate =
            expiry_date !== undefined
                ? expiry_date
                : existingBatch.expiry_date;


        // ==========================================
        // UPDATE BATCH
        // ==========================================

        const result = await client.query(
            `
            UPDATE medicine_batches
            SET
                medicine_id = $1,
                vendor_id = $2,
                batch_number = $3,
                quantity = $4,
                purchase_price = $5,
                selling_price = $6,
                manufacturing_date = $7,
                expiry_date = $8,
                updated_at = CURRENT_TIMESTAMP

            WHERE id = $9
            AND user_id = $10

            RETURNING *
            `,
            [
                finalMedicineId,
                finalVendorId,
                finalBatchNumber,
                finalQuantity,
                finalPurchasePrice,
                finalSellingPrice,
                finalManufacturingDate || null,
                finalExpiryDate || null,
                batchId,
                userId
            ]
        );


        const updatedBatch =
            result.rows[0];


        // ==========================================
        // UPDATE VENDOR LEDGER
        // ==========================================

        const purchaseAmount =
            finalQuantity * finalPurchasePrice;


        // ------------------------------------------
        // IF VENDOR EXISTS
        // ------------------------------------------

        if (finalVendorId) {

            const ledgerResult =
                await client.query(
                    `
                    SELECT id
                    FROM vendor_ledger

                    WHERE reference_id = $1
                    AND user_id = $2
                    AND transaction_type = 'PURCHASE'

                    LIMIT 1
                    `,
                    [
                        batchId,
                        userId
                    ]
                );


            if (ledgerResult.rows.length > 0) {

                // UPDATE EXISTING PURCHASE

                await client.query(
                    `
                    UPDATE vendor_ledger

                    SET
                        vendor_id = $1,
                        description = $2,
                        debit = $3,
                        credit = 0

                    WHERE id = $4
                    AND user_id = $5
                    `,
                    [
                        finalVendorId,
                        `Purchase - Batch ${finalBatchNumber}`,
                        purchaseAmount,
                        ledgerResult.rows[0].id,
                        userId
                    ]
                );

            } else {

                // CREATE LEDGER ENTRY
                // Useful for older batches created
                // before ledger integration.

                await client.query(
                    `
                    INSERT INTO vendor_ledger
                    (
                        vendor_id,
                        user_id,
                        transaction_type,
                        reference_id,
                        description,
                        debit,
                        credit
                    )
                    VALUES
                    (
                        $1,
                        $2,
                        'PURCHASE',
                        $3,
                        $4,
                        $5,
                        0
                    )
                    `,
                    [
                        finalVendorId,
                        userId,
                        batchId,
                        `Purchase - Batch ${finalBatchNumber}`,
                        purchaseAmount
                    ]
                );
            }

        }

        // ------------------------------------------
        // IF VENDOR WAS REMOVED
        // ------------------------------------------

        else {

            await client.query(
                `
                DELETE FROM vendor_ledger

                WHERE reference_id = $1
                AND user_id = $2
                AND transaction_type = 'PURCHASE'
                `,
                [
                    batchId,
                    userId
                ]
            );
        }


        // ==========================================
        // COMMIT
        // ==========================================

        await client.query("COMMIT");


        return res.json({
            message:
                "Batch updated successfully",
            batch: updatedBatch
        });


    } catch (error) {

        await client.query("ROLLBACK");

        console.error(
            "Update batch error:",
            error
        );

        return res.status(500).json({
            message:
                "Server error while updating batch"
        });

    } finally {

        client.release();
    }
};



// ==========================================
// DELETE BATCH
// DELETE /api/batches/:id
// ==========================================

const deleteBatch = async (req, res) => {

    const client = await pool.connect();

    try {

        const userId = req.user.id;
        const batchId = req.params.id;


        // ==========================================
        // START TRANSACTION
        // ==========================================

        await client.query("BEGIN");


        // ==========================================
        // CHECK BATCH
        // ==========================================

        const batchCheck =
            await client.query(
                `
                SELECT id
                FROM medicine_batches
                WHERE id = $1
                AND user_id = $2
                `,
                [batchId, userId]
            );


        if (batchCheck.rows.length === 0) {

            await client.query("ROLLBACK");

            return res.status(404).json({
                message: "Batch not found"
            });
        }


        // ==========================================
        // DELETE PURCHASE LEDGER ENTRY
        // ==========================================

        await client.query(
            `
            DELETE FROM vendor_ledger

            WHERE reference_id = $1
            AND user_id = $2
            AND transaction_type = 'PURCHASE'
            `,
            [
                batchId,
                userId
            ]
        );


        // ==========================================
        // DELETE BATCH
        // ==========================================

        const result =
            await client.query(
                `
                DELETE FROM medicine_batches

                WHERE id = $1
                AND user_id = $2

                RETURNING id
                `,
                [
                    batchId,
                    userId
                ]
            );


        if (result.rows.length === 0) {

            await client.query("ROLLBACK");

            return res.status(404).json({
                message: "Batch not found"
            });
        }


        // ==========================================
        // COMMIT
        // ==========================================

        await client.query("COMMIT");


        return res.json({
            message:
                "Batch deleted successfully"
        });


    } catch (error) {

        await client.query("ROLLBACK");

        console.error(
            "Delete batch error:",
            error
        );

        return res.status(500).json({
            message:
                "Server error while deleting batch"
        });

    } finally {

        client.release();
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