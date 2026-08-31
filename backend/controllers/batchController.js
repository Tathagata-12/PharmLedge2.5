const pool = require("../config/db");


// ==========================================
// ADD BATCH / ADD STOCK
// POST /api/batches
// ==========================================

const createBatch = async (req, res) => {

    const client = await pool.connect();

    let transactionStarted = false;

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
        // VALIDATE REQUIRED FIELDS
        // ==========================================

        if (
            medicine_id === undefined ||
            medicine_id === null ||
            medicine_id === "" ||
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


        const medicineId =
            Number(medicine_id);

        const batchQuantity =
            Number(quantity);

        const purchasePrice =
            Number(purchase_price);

        const sellingPrice =
            Number(selling_price);


        // ==========================================
        // VALIDATE NUMBERS
        // ==========================================

        if (
            !Number.isInteger(medicineId) ||
            medicineId <= 0
        ) {

            return res.status(400).json({
                message:
                    "Invalid medicine"
            });
        }


        if (
            !Number.isInteger(batchQuantity) ||
            batchQuantity < 0
        ) {

            return res.status(400).json({
                message:
                    "Quantity must be a non-negative integer"
            });
        }


        if (
            !Number.isFinite(purchasePrice) ||
            purchasePrice < 0
        ) {

            return res.status(400).json({
                message:
                    "Purchase price must be a valid non-negative number"
            });
        }


        if (
            !Number.isFinite(sellingPrice) ||
            sellingPrice < 0
        ) {

            return res.status(400).json({
                message:
                    "Selling price must be a valid non-negative number"
            });
        }


        // ==========================================
        // CLEAN BATCH NUMBER
        // ==========================================

        const cleanBatchNumber =
            String(batch_number).trim();


        if (!cleanBatchNumber) {

            return res.status(400).json({
                message:
                    "Batch number is required"
            });
        }


        // ==========================================
        // START TRANSACTION
        // ==========================================

        await client.query("BEGIN");

        transactionStarted = true;


        // ==========================================
        // CHECK MEDICINE OWNERSHIP
        // ==========================================

        const medicineCheck =
            await client.query(
                `
                SELECT
                    id,
                    name
                FROM medicines
                WHERE id = $1
                AND user_id = $2
                FOR UPDATE
                `,
                [
                    medicineId,
                    userId
                ]
            );


        if (
            medicineCheck.rows.length === 0
        ) {

            throw new Error(
                "Medicine not found"
            );
        }


        const medicine =
            medicineCheck.rows[0];


        // ==========================================
        // CHECK VENDOR OWNERSHIP
        // ==========================================

        let vendor = null;


        if (
            vendor_id !== undefined &&
            vendor_id !== null &&
            vendor_id !== ""
        ) {

            const vendorId =
                Number(vendor_id);


            if (
                !Number.isInteger(vendorId) ||
                vendorId <= 0
            ) {

                throw new Error(
                    "Invalid vendor"
                );
            }


            const vendorCheck =
                await client.query(
                    `
                    SELECT
                        id,
                        name
                    FROM vendors
                    WHERE id = $1
                    AND user_id = $2
                    FOR UPDATE
                    `,
                    [
                        vendorId,
                        userId
                    ]
                );


            if (
                vendorCheck.rows.length === 0
            ) {

                throw new Error(
                    "Vendor not found"
                );
            }


            vendor =
                vendorCheck.rows[0];
        }


        // ==========================================
        // CHECK DUPLICATE BATCH
        // ==========================================

        const existingBatch =
            await client.query(
                `
                SELECT id
                FROM medicine_batches
                WHERE user_id = $1
                AND batch_number = $2
                `,
                [
                    userId,
                    cleanBatchNumber
                ]
            );


        if (
            existingBatch.rows.length > 0
        ) {

            throw new Error(
                "Batch number already exists"
            );
        }


        // ==========================================
        // CREATE BATCH
        // ==========================================

        const result =
            await client.query(
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
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8,
                    $9
                )
                RETURNING *
                `,
                [
                    medicineId,

                    userId,

                    vendor
                        ? vendor.id
                        : null,

                    cleanBatchNumber,

                    batchQuantity,

                    purchasePrice,

                    sellingPrice,

                    manufacturing_date ||
                        null,

                    expiry_date ||
                        null
                ]
            );


        const batch =
            result.rows[0];


        // ==========================================
        // CREATE VENDOR LEDGER PURCHASE
        // ==========================================

        if (vendor) {

            const purchaseAmount =
                Number(
                    (
                        batchQuantity *
                        purchasePrice
                    ).toFixed(2)
                );


            if (purchaseAmount > 0) {

                await client.query(
                    `
                    INSERT INTO vendor_ledger
                    (
                        user_id,
                        vendor_id,
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
                        $6
                    )
                    `,
                    [
                        userId,

                        vendor.id,

                        batch.id,

                        `Purchase of ${medicine.name} - Batch ${cleanBatchNumber}`,

                        purchaseAmount,

                        0
                    ]
                );
            }
        }


        // ==========================================
        // COMMIT
        // ==========================================

        await client.query(
            "COMMIT"
        );

        transactionStarted = false;


        // ==========================================
        // RESPONSE
        // ==========================================

        return res.status(201).json({

            message:
                "Batch added successfully",

            batch,

            vendor_ledger:

                vendor
                    ? {
                        transaction_type:
                            "PURCHASE",

                        debit:
                            Number(
                                (
                                    batchQuantity *
                                    purchasePrice
                                ).toFixed(2)
                            ),

                        credit:
                            0
                    }
                    : null
        });


    } catch (error) {

        // ==========================================
        // ROLLBACK
        // ==========================================

        if (transactionStarted) {

            try {

                await client.query(
                    "ROLLBACK"
                );

            } catch (rollbackError) {

                console.error(
                    "Rollback error:",
                    rollbackError
                );
            }
        }


        console.error(
            "Create batch error:",
            error
        );


        // ==========================================
        // BUSINESS ERROR
        // ==========================================

        const businessMessages = [
            "Medicine not found",
            "Vendor not found",
            "Invalid vendor",
            "Invalid medicine",
            "Batch number already exists"
        ];


        const isBusinessError =
            businessMessages.some(
                (message) =>
                    error.message &&
                    error.message.includes(message)
            );


        if (isBusinessError) {

            return res.status(400).json({

                message:
                    error.message

            });
        }


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

        const userId =
            req.user.id;


        const result =
            await pool.query(
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
                [
                    userId
                ]
            );


        return res.json({

            count:
                result.rows.length,

            batches:
                result.rows

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
// GET BATCHES FOR MEDICINE
// GET /api/batches/medicine/:medicineId
// ==========================================

const getBatchesByMedicine = async (
    req,
    res
) => {

    try {

        const userId =
            req.user.id;

        const medicineId =
            Number(
                req.params.medicineId
            );


        // ==========================================
        // VALIDATE MEDICINE ID
        // ==========================================

        if (
            !Number.isInteger(medicineId) ||
            medicineId <= 0
        ) {

            return res.status(400).json({

                message:
                    "Invalid medicine ID"

            });
        }


        // ==========================================
        // CHECK MEDICINE OWNERSHIP
        // ==========================================

        const medicineCheck =
            await pool.query(
                `
                SELECT id
                FROM medicines
                WHERE id = $1
                AND user_id = $2
                `,
                [
                    medicineId,
                    userId
                ]
            );


        if (
            medicineCheck.rows.length === 0
        ) {

            return res.status(404).json({

                message:
                    "Medicine not found"

            });
        }


        // ==========================================
        // GET BATCHES
        // ==========================================

        const result =
            await pool.query(
                `
                SELECT

                    mb.*,

                    v.name AS vendor_name

                FROM medicine_batches mb

                LEFT JOIN vendors v
                    ON mb.vendor_id = v.id
                    AND v.user_id = $2

                WHERE
                    mb.medicine_id = $1
                    AND mb.user_id = $2

                ORDER BY
                    mb.expiry_date ASC NULLS LAST,
                    mb.created_at ASC,
                    mb.id ASC
                `,
                [
                    medicineId,
                    userId
                ]
            );


        return res.json({

            count:
                result.rows.length,

            batches:
                result.rows

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
//
// IMPORTANT:
// Updating a batch does NOT create another
// vendor ledger purchase.
// This prevents duplicate financial entries.
//
// ==========================================

const updateBatch = async (
    req,
    res
) => {

    try {

        const userId =
            req.user.id;

        const batchId =
            Number(
                req.params.id
            );


        if (
            !Number.isInteger(batchId) ||
            batchId <= 0
        ) {

            return res.status(400).json({

                message:
                    "Invalid batch ID"

            });
        }


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
        // GET EXISTING BATCH
        // ==========================================

        const existingResult =
            await pool.query(
                `
                SELECT *
                FROM medicine_batches
                WHERE id = $1
                AND user_id = $2
                `,
                [
                    batchId,
                    userId
                ]
            );


        if (
            existingResult.rows.length === 0
        ) {

            return res.status(404).json({

                message:
                    "Batch not found"

            });
        }


        const existingBatch =
            existingResult.rows[0];


        // ==========================================
        // DETERMINE FINAL VALUES
        // ==========================================

        const finalMedicineId =
            medicine_id !== undefined
                ? Number(medicine_id)
                : Number(
                    existingBatch.medicine_id
                );


        const finalVendorId =
            vendor_id !== undefined
                ? (
                    vendor_id === null ||
                    vendor_id === ""
                        ? null
                        : Number(vendor_id)
                )
                : existingBatch.vendor_id;


        const finalBatchNumber =
            batch_number !== undefined
                ? String(
                    batch_number
                ).trim()
                : existingBatch.batch_number;


        const finalQuantity =
            quantity !== undefined
                ? Number(quantity)
                : Number(
                    existingBatch.quantity
                );


        const finalPurchasePrice =
            purchase_price !== undefined
                ? Number(purchase_price)
                : Number(
                    existingBatch.purchase_price
                );


        const finalSellingPrice =
            selling_price !== undefined
                ? Number(selling_price)
                : Number(
                    existingBatch.selling_price
                );


        const finalManufacturingDate =
            manufacturing_date !== undefined
                ? (
                    manufacturing_date ||
                    null
                )
                : existingBatch.manufacturing_date;


        const finalExpiryDate =
            expiry_date !== undefined
                ? (
                    expiry_date ||
                    null
                )
                : existingBatch.expiry_date;


        // ==========================================
        // VALIDATE FINAL VALUES
        // ==========================================

        if (
            !Number.isInteger(
                finalMedicineId
            ) ||
            finalMedicineId <= 0
        ) {

            return res.status(400).json({

                message:
                    "Invalid medicine"

            });
        }


        if (
            !finalBatchNumber
        ) {

            return res.status(400).json({

                message:
                    "Batch number is required"

            });
        }


        if (
            !Number.isInteger(
                finalQuantity
            ) ||
            finalQuantity < 0
        ) {

            return res.status(400).json({

                message:
                    "Quantity must be a non-negative integer"

            });
        }


        if (
            !Number.isFinite(
                finalPurchasePrice
            ) ||
            finalPurchasePrice < 0
        ) {

            return res.status(400).json({

                message:
                    "Purchase price must be a valid non-negative number"

            });
        }


        if (
            !Number.isFinite(
                finalSellingPrice
            ) ||
            finalSellingPrice < 0
        ) {

            return res.status(400).json({

                message:
                    "Selling price must be a valid non-negative number"

            });
        }


        if (
            finalVendorId !== null &&
            (
                !Number.isInteger(
                    finalVendorId
                ) ||
                finalVendorId <= 0
            )
        ) {

            return res.status(400).json({

                message:
                    "Invalid vendor"

            });
        }


        // ==========================================
        // CHECK MEDICINE OWNERSHIP
        // ==========================================

        const medicineCheck =
            await pool.query(
                `
                SELECT
                    id,
                    name
                FROM medicines
                WHERE id = $1
                AND user_id = $2
                `,
                [
                    finalMedicineId,
                    userId
                ]
            );


        if (
            medicineCheck.rows.length === 0
        ) {

            return res.status(404).json({

                message:
                    "Medicine not found"

            });
        }


        // ==========================================
        // CHECK VENDOR OWNERSHIP
        // ==========================================

        if (
            finalVendorId !== null
        ) {

            const vendorCheck =
                await pool.query(
                    `
                    SELECT id
                    FROM vendors
                    WHERE id = $1
                    AND user_id = $2
                    `,
                    [
                        finalVendorId,
                        userId
                    ]
                );


            if (
                vendorCheck.rows.length === 0
            ) {

                return res.status(404).json({

                    message:
                        "Vendor not found"

                });
            }
        }


        // ==========================================
        // CHECK DUPLICATE BATCH NUMBER
        // ==========================================

        const duplicateCheck =
            await pool.query(
                `
                SELECT id
                FROM medicine_batches
                WHERE user_id = $1
                AND batch_number = $2
                AND id != $3
                `,
                [
                    userId,
                    finalBatchNumber,
                    batchId
                ]
            );


        if (
            duplicateCheck.rows.length > 0
        ) {

            return res.status(409).json({

                message:
                    "Batch number already exists"

            });
        }


        // ==========================================
        // UPDATE BATCH
        // ==========================================

        const result =
            await pool.query(
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

                    updated_at =
                        CURRENT_TIMESTAMP

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

                    finalManufacturingDate,

                    finalExpiryDate,

                    batchId,

                    userId
                ]
            );


        return res.json({

            message:
                "Batch updated successfully",

            batch:
                result.rows[0],

            ledger_updated:
                false,

            ledger_note:
                "Editing a batch does not create a new vendor purchase transaction."

        });


    } catch (error) {

        console.error(
            "Update batch error:",
            error
        );


        return res.status(500).json({

            message:
                "Server error while updating batch"

        });
    }
};



// ==========================================
// DELETE BATCH
// DELETE /api/batches/:id
// ==========================================
//
// IMPORTANT:
// A deleted batch's purchase ledger entry
// is reversed instead of simply disappearing.
// This keeps the vendor balance accurate.
//
// ==========================================

const deleteBatch = async (
    req,
    res
) => {

    const client =
        await pool.connect();

    let transactionStarted = false;

    try {

        const userId =
            req.user.id;

        const batchId =
            Number(
                req.params.id
            );


        if (
            !Number.isInteger(batchId) ||
            batchId <= 0
        ) {

            return res.status(400).json({

                message:
                    "Invalid batch ID"

            });
        }


        // ==========================================
        // START TRANSACTION
        // ==========================================

        await client.query(
            "BEGIN"
        );

        transactionStarted = true;


        // ==========================================
        // GET BATCH
        // ==========================================

        const batchResult =
            await client.query(
                `
                SELECT
                    mb.*,
                    m.name AS medicine_name,
                    v.name AS vendor_name

                FROM medicine_batches mb

                INNER JOIN medicines m
                    ON mb.medicine_id = m.id
                    AND m.user_id = $2

                LEFT JOIN vendors v
                    ON mb.vendor_id = v.id
                    AND v.user_id = $2

                WHERE mb.id = $1
                AND mb.user_id = $2

                FOR UPDATE
                `,
                [
                    batchId,
                    userId
                ]
            );


        if (
            batchResult.rows.length === 0
        ) {

            await client.query(
                "ROLLBACK"
            );

            transactionStarted = false;

            return res.status(404).json({

                message:
                    "Batch not found"

            });
        }


        const batch =
            batchResult.rows[0];


        // ==========================================
        // DELETE BATCH
        // ==========================================

        await client.query(
            `
            DELETE FROM medicine_batches

            WHERE id = $1
            AND user_id = $2
            `,
            [
                batchId,
                userId
            ]
        );


        // ==========================================
        // HANDLE VENDOR LEDGER
        // ==========================================
        //
        // We do NOT delete the original purchase
        // transaction because that would destroy
        // financial history.
        //
        // Instead, create a reversal credit.
        //
        // Example:
        //
        // Original purchase:
        // DEBIT ₹1000
        //
        // Batch deleted:
        // CREDIT ₹1000
        //
        // Net outstanding = ₹0
        //
        // ==========================================

        if (
            batch.vendor_id !== null &&
            batch.vendor_id !== undefined
        ) {

            const purchaseAmount =
                Number(
                    (
                        Number(
                            batch.quantity
                        ) *
                        Number(
                            batch.purchase_price
                        )
                    ).toFixed(2)
                );


            if (
                purchaseAmount > 0
            ) {

                await client.query(
                    `
                    INSERT INTO vendor_ledger
                    (
                        user_id,
                        vendor_id,
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
                        'PURCHASE_REVERSAL',
                        $3,
                        $4,
                        0,
                        $5
                    )
                    `,
                    [
                        userId,

                        batch.vendor_id,

                        batch.id,

                        `Reversal for deleted purchase - ${batch.medicine_name} - Batch ${batch.batch_number}`,

                        purchaseAmount
                    ]
                );
            }
        }


        // ==========================================
        // COMMIT
        // ==========================================

        await client.query(
            "COMMIT"
        );

        transactionStarted = false;


        // ==========================================
        // RESPONSE
        // ==========================================

        return res.json({

            message:
                "Batch deleted successfully",

            ledger_reversed:
                Boolean(
                    batch.vendor_id
                )

        });


    } catch (error) {

        if (transactionStarted) {

            try {

                await client.query(
                    "ROLLBACK"
                );

            } catch (rollbackError) {

                console.error(
                    "Rollback error:",
                    rollbackError
                );
            }
        }


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