const pool = require("../config/db");


// ==========================================
// CREATE SALE / AUTOMATED BILLING
// POST /api/sales
// ==========================================

const createSale = async (req, res) => {

    const client = await pool.connect();

    let transactionStarted = false;

    try {

        const userId = req.user.id;

        const {
            customer_name,
            customer_phone,
            items,
            discount = 0,
            tax = 0,
            payment_method = "Cash"
        } = req.body;


        // ==========================================
        // VALIDATE ITEMS
        // ==========================================

        if (
            !Array.isArray(items) ||
            items.length === 0
        ) {

            return res.status(400).json({
                message:
                    "At least one medicine is required"
            });
        }


        // ==========================================
        // VALIDATE DISCOUNT
        // ==========================================

        const discountAmount =
            Number(discount);


        if (
            !Number.isFinite(discountAmount) ||
            discountAmount < 0
        ) {

            return res.status(400).json({
                message:
                    "Discount must be a valid non-negative number"
            });
        }


        // ==========================================
        // VALIDATE TAX
        // ==========================================

        const taxAmount =
            Number(tax);


        if (
            !Number.isFinite(taxAmount) ||
            taxAmount < 0
        ) {

            return res.status(400).json({
                message:
                    "Tax must be a valid non-negative number"
            });
        }


        // ==========================================
        // START TRANSACTION
        // ==========================================

        await client.query("BEGIN");

        transactionStarted = true;


        let subtotal = 0;

        const processedItems = [];


        // ==========================================
        // PROCESS EACH MEDICINE
        // ==========================================

        for (const item of items) {

            const medicineId =
                Number(item.medicine_id);

            const requestedQuantity =
                Number(item.quantity);


            // ==========================================
            // VALIDATE ITEM
            // ==========================================

            if (
                !Number.isInteger(medicineId) ||
                medicineId <= 0
            ) {

                throw new Error(
                    "Each item must contain a valid medicine_id"
                );
            }


            if (
                !Number.isInteger(requestedQuantity) ||
                requestedQuantity <= 0
            ) {

                throw new Error(
                    "Medicine quantity must be a positive integer"
                );
            }


            // ==========================================
            // CHECK MEDICINE OWNERSHIP
            // ==========================================

            const medicineResult =
                await client.query(
                    `
                    SELECT
                        id,
                        name,
                        selling_price
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
                medicineResult.rows.length === 0
            ) {

                throw new Error(
                    `Medicine ${medicineId} not found`
                );
            }


            const medicine =
                medicineResult.rows[0];


            let remainingQuantity =
                requestedQuantity;


            // ==========================================
            // GET AVAILABLE BATCHES
            // FEFO
            // FIRST EXPIRY FIRST OUT
            // ==========================================

            const batchesResult =
                await client.query(
                    `
                    SELECT
                        id,
                        quantity,
                        selling_price,
                        expiry_date,
                        batch_number
                    FROM medicine_batches
                    WHERE medicine_id = $1
                    AND user_id = $2
                    AND quantity > 0
                    AND (
                        expiry_date IS NULL
                        OR expiry_date >= CURRENT_DATE
                    )
                    ORDER BY
                        expiry_date ASC NULLS LAST,
                        created_at ASC,
                        id ASC
                    FOR UPDATE
                    `,
                    [
                        medicineId,
                        userId
                    ]
                );


            // ==========================================
            // CALCULATE AVAILABLE STOCK
            // ==========================================

            let availableStock = 0;


            for (
                const batch of batchesResult.rows
            ) {

                availableStock +=
                    Number(batch.quantity) || 0;
            }


            // ==========================================
            // CHECK STOCK
            // ==========================================

            if (
                availableStock <
                requestedQuantity
            ) {

                throw new Error(
                    `Insufficient stock for ${medicine.name}. Available: ${availableStock}`
                );
            }


            // ==========================================
            // DEDUCT STOCK
            // ==========================================

            for (
                const batch of batchesResult.rows
            ) {

                if (
                    remainingQuantity <= 0
                ) {

                    break;
                }


                const batchQuantity =
                    Number(batch.quantity) || 0;


                const deduction =
                    Math.min(
                        remainingQuantity,
                        batchQuantity
                    );


                // ==========================================
                // DETERMINE SELLING PRICE
                // ==========================================

                const batchSellingPrice =
                    Number(
                        batch.selling_price
                    );


                const medicineSellingPrice =
                    Number(
                        medicine.selling_price
                    );


                let unitPrice;


                if (
                    Number.isFinite(
                        batchSellingPrice
                    ) &&
                    batchSellingPrice >= 0
                ) {

                    unitPrice =
                        batchSellingPrice;

                } else {

                    unitPrice =
                        medicineSellingPrice;
                }


                if (
                    !Number.isFinite(unitPrice) ||
                    unitPrice < 0
                ) {

                    throw new Error(
                        `Invalid selling price for ${medicine.name}`
                    );
                }


                // ==========================================
                // CALCULATE ITEM TOTAL
                // ==========================================

                const itemTotal =
                    deduction *
                    unitPrice;


                // ==========================================
                // DEDUCT BATCH STOCK
                // ==========================================

                await client.query(
                    `
                    UPDATE medicine_batches
                    SET
                        quantity =
                            quantity - $1,
                        updated_at =
                            CURRENT_TIMESTAMP
                    WHERE id = $2
                    AND user_id = $3
                    `,
                    [
                        deduction,
                        batch.id,
                        userId
                    ]
                );


                // ==========================================
                // STORE PROCESSED ITEM
                // ==========================================

                processedItems.push({

                    medicine_id:
                        medicine.id,

                    medicine_name:
                        medicine.name,

                    batch_id:
                        batch.id,

                    batch_number:
                        batch.batch_number,

                    quantity:
                        deduction,

                    unit_price:
                        unitPrice,

                    total_price:
                        itemTotal

                });


                subtotal +=
                    itemTotal;


                remainingQuantity -=
                    deduction;
            }
        }


        // ==========================================
        // ROUND SUBTOTAL
        // ==========================================

        const subtotalAmount =
            Number(
                subtotal.toFixed(2)
            );


        // ==========================================
        // VALIDATE DISCOUNT
        // ==========================================

        if (
            discountAmount >
            subtotalAmount
        ) {

            throw new Error(
                "Discount cannot be greater than subtotal"
            );
        }


        // ==========================================
        // CALCULATE TOTAL
        // ==========================================

        const totalAmount =
            Number(
                (
                    subtotalAmount -
                    discountAmount +
                    taxAmount
                ).toFixed(2)
            );


        // ==========================================
        // VALIDATE PAYMENT METHOD
        // ==========================================

        const paymentMethod =
            String(
                payment_method || "Cash"
            ).trim();


        if (!paymentMethod) {

            throw new Error(
                "Payment method is required"
            );
        }


        // ==========================================
        // CREATE SALE
        // ==========================================

        const saleResult =
            await client.query(
                `
                INSERT INTO sales
                (
                    user_id,
                    customer_name,
                    customer_phone,
                    subtotal,
                    discount,
                    tax,
                    total_amount,
                    payment_method
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
                    $8
                )
                RETURNING *
                `,
                [
                    userId,

                    customer_name
                        ? String(customer_name).trim()
                        : null,

                    customer_phone
                        ? String(customer_phone).trim()
                        : null,

                    subtotalAmount,

                    discountAmount,

                    taxAmount,

                    totalAmount,

                    paymentMethod
                ]
            );


        const sale =
            saleResult.rows[0];


        // ==========================================
        // CREATE SALE ITEMS
        // ==========================================

        for (
            const item of processedItems
        ) {

            await client.query(
                `
                INSERT INTO sale_items
                (
                    sale_id,
                    medicine_id,
                    batch_id,
                    quantity,
                    unit_price,
                    total_price
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6
                )
                `,
                [
                    sale.id,

                    item.medicine_id,

                    item.batch_id,

                    item.quantity,

                    item.unit_price,

                    item.total_price
                ]
            );
        }


        // ==========================================
        // COMMIT
        // ==========================================

        await client.query(
            "COMMIT"
        );

        transactionStarted = false;


        // ==========================================
        // RETURN BILL
        // ==========================================

        return res.status(201).json({

            message:
                "Sale completed successfully",

            bill: {

                sale_id:
                    sale.id,

                customer_name:
                    sale.customer_name,

                customer_phone:
                    sale.customer_phone,

                items:
                    processedItems,

                subtotal:
                    subtotalAmount,

                discount:
                    discountAmount,

                tax:
                    taxAmount,

                total_amount:
                    totalAmount,

                payment_method:
                    sale.payment_method,

                created_at:
                    sale.created_at
            }
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
            "Create sale error:",
            error
        );


        // ==========================================
        // BUSINESS / VALIDATION ERROR
        // ==========================================

        const businessErrors = [
            "not found",
            "Insufficient stock",
            "quantity",
            "medicine_id",
            "Discount",
            "Invalid selling price",
            "Payment method"
        ];


        const isBusinessError =
            businessErrors.some(
                (message) =>
                    error.message &&
                    error.message.includes(message)
            );


        if (isBusinessError) {

            return res.status(400).json({

                message:
                    error.message ||
                    "Sale could not be completed"

            });
        }


        // ==========================================
        // SERVER ERROR
        // ==========================================

        return res.status(500).json({

            message:
                "Server error while processing sale"

        });


    } finally {

        client.release();

    }
};



// ==========================================
// GET SALES HISTORY
// GET /api/sales
// ==========================================

const getSales = async (req, res) => {

    try {

        const userId =
            req.user.id;


        const result =
            await pool.query(
                `
                SELECT *
                FROM sales
                WHERE user_id = $1
                ORDER BY
                    created_at DESC,
                    id DESC
                `,
                [
                    userId
                ]
            );


        return res.json({

            count:
                result.rows.length,

            sales:
                result.rows

        });


    } catch (error) {

        console.error(
            "Get sales error:",
            error
        );


        return res.status(500).json({

            message:
                "Server error while fetching sales"

        });
    }
};



// ==========================================
// GET SINGLE SALE / BILL
// GET /api/sales/:id
// ==========================================

const getSaleById = async (req, res) => {

    try {

        const userId =
            req.user.id;

        const saleId =
            req.params.id;


        // ==========================================
        // GET SALE
        // ==========================================

        const saleResult =
            await pool.query(
                `
                SELECT *
                FROM sales
                WHERE id = $1
                AND user_id = $2
                `,
                [
                    saleId,
                    userId
                ]
            );


        if (
            saleResult.rows.length === 0
        ) {

            return res.status(404).json({

                message:
                    "Sale not found"

            });
        }


        const sale =
            saleResult.rows[0];


        // ==========================================
        // GET SALE ITEMS
        // ==========================================

        const itemsResult =
            await pool.query(
                `
                SELECT
                    si.id,
                    si.sale_id,
                    si.medicine_id,
                    si.batch_id,
                    si.quantity,
                    si.unit_price,
                    si.total_price,

                    m.name AS medicine_name,

                    mb.batch_number

                FROM sale_items si

                INNER JOIN medicines m
                    ON si.medicine_id = m.id
                    AND m.user_id = $2

                LEFT JOIN medicine_batches mb
                    ON si.batch_id = mb.id
                    AND mb.user_id = $2

                WHERE si.sale_id = $1

                ORDER BY
                    si.id ASC
                `,
                [
                    saleId,
                    userId
                ]
            );


        // ==========================================
        // RETURN SALE
        // ==========================================

        return res.json({

            sale,

            items:
                itemsResult.rows

        });


    } catch (error) {

        console.error(
            "Get sale error:",
            error
        );


        return res.status(500).json({

            message:
                "Server error while fetching sale"

        });
    }
};



// ==========================================
// EXPORTS
// ==========================================

module.exports = {

    createSale,

    getSales,

    getSaleById

};