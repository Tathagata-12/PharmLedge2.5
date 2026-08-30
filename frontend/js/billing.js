requireAuth();


// ==========================================
// DOM ELEMENTS
// ==========================================

const billingMedicine =
    document.getElementById("billingMedicine");

const billingBatch =
    document.getElementById("billingBatch");

const billingQuantity =
    document.getElementById("billingQuantity");

const addToBillBtn =
    document.getElementById("addToBillBtn");

const billTableBody =
    document.getElementById("billTableBody");

const cartCount =
    document.getElementById("cartCount");

const customerName =
    document.getElementById("customerName");

const customerPhone =
    document.getElementById("customerPhone");

const discountInput =
    document.getElementById("discount");

const taxInput =
    document.getElementById("tax");

const subtotalElement =
    document.getElementById("subtotal");

const totalAmountElement =
    document.getElementById("totalAmount");

const paymentMethod =
    document.getElementById("paymentMethod");

const completeSaleBtn =
    document.getElementById("completeSaleBtn");

const clearBillBtn =
    document.getElementById("clearBillBtn");

const billingMessage =
    document.getElementById("billingMessage");


// ==========================================
// BILL MODAL ELEMENTS
// ==========================================

const billModal =
    document.getElementById("billModal");

const billContent =
    document.getElementById("billContent");

const printableBill =
    document.getElementById("printableBill");

const closeBillModal =
    document.getElementById("closeBillModal");

const closeBillBtn =
    document.getElementById("closeBillBtn");

const printBillBtn =
    document.getElementById("printBillBtn");


// ==========================================
// DATA
// ==========================================

let medicines = [];
let batches = [];
let billItems = [];


// ==========================================
// USER
// ==========================================

function loadUser() {

    const user = getCurrentUser();

    if (!user) {
        return;
    }

    const name = user.name || "User";
    const email = user.email || "";

    document.getElementById(
        "sidebarUserName"
    ).textContent = name;

    document.getElementById(
        "sidebarUserEmail"
    ).textContent = email;

    document.getElementById(
        "topUserName"
    ).textContent = name;

    const letter =
        name.charAt(0).toUpperCase();

    document.getElementById(
        "userAvatar"
    ).textContent = letter;

    document.getElementById(
        "topUserAvatar"
    ).textContent = letter;
}


// ==========================================
// LOAD MEDICINES
// ==========================================

async function loadMedicines() {

    try {

        const response =
            await getMedicines();

        medicines =
            Array.isArray(response)
                ? response
                : response.medicines || [];

        billingMedicine.innerHTML = `
            <option value="">
                Select medicine
            </option>
        `;

        medicines.forEach(function (medicine) {

            const option =
                document.createElement("option");

            option.value =
                medicine.id;

            option.textContent =
                `${medicine.name} - ₹${formatCurrency(
                    medicine.selling_price
                )}`;

            billingMedicine.appendChild(option);

        });

    } catch (error) {

        console.error(
            "Medicine loading error:",
            error
        );

        showMessage(
            error.message ||
            "Unable to load medicines.",
            "error"
        );
    }
}


// ==========================================
// LOAD BATCHES
// ==========================================

async function loadBatches(medicineId) {

    billingBatch.innerHTML = `
        <option value="">
            Select batch
        </option>
    `;

    billingBatch.disabled = true;

    batches = [];

    if (!medicineId) {
        return;
    }

    try {

        const response =
            await getMedicineBatches(medicineId);

        batches =
            Array.isArray(response)
                ? response
                : response.batches || [];

        const availableBatches =
            batches.filter(function (batch) {

                return Number(batch.quantity) > 0;

            });

        availableBatches.forEach(function (batch) {

            const option =
                document.createElement("option");

            option.value =
                batch.id;

            const batchNumber =
                batch.batch_number ||
                `Batch #${batch.id}`;

            const quantity =
                Number(batch.quantity || 0);

            const price =
                Number(
                    batch.selling_price || 0
                );

            option.textContent =
                `${batchNumber} | Stock: ${quantity} | ₹${formatCurrency(price)}`;

            billingBatch.appendChild(option);

        });

        billingBatch.disabled =
            availableBatches.length === 0;

    } catch (error) {

        console.error(
            "Batch loading error:",
            error
        );

        showMessage(
            error.message ||
            "Unable to load batches.",
            "error"
        );
    }
}


// ==========================================
// GET SELECTED MEDICINE
// ==========================================

function getSelectedMedicine() {

    const medicineId =
        Number(billingMedicine.value);

    return medicines.find(function (medicine) {

        return Number(medicine.id) === medicineId;

    });
}


// ==========================================
// GET SELECTED BATCH
// ==========================================

function getSelectedBatch() {

    const batchId =
        Number(billingBatch.value);

    return batches.find(function (batch) {

        return Number(batch.id) === batchId;

    });
}


// ==========================================
// ADD ITEM TO BILL
// ==========================================

function addItemToBill() {

    const medicine =
        getSelectedMedicine();

    const batch =
        getSelectedBatch();

    const quantity =
        Number(billingQuantity.value);


    if (!medicine) {

        showMessage(
            "Please select a medicine.",
            "error"
        );

        return;
    }


    if (!batch) {

        showMessage(
            "Please select a batch.",
            "error"
        );

        return;
    }


    if (!quantity || quantity <= 0) {

        showMessage(
            "Please enter a valid quantity.",
            "error"
        );

        return;
    }


    const availableStock =
        Number(batch.quantity || 0);


    if (quantity > availableStock) {

        showMessage(
            `Only ${availableStock} units are available.`,
            "error"
        );

        return;
    }


    const existingItem =
        billItems.find(function (item) {

            return (
                Number(item.medicine_id) ===
                    Number(medicine.id) &&

                Number(item.batch_id) ===
                    Number(batch.id)
            );

        });


    if (existingItem) {

        const newQuantity =
            existingItem.quantity + quantity;


        if (newQuantity > availableStock) {

            showMessage(
                `Only ${availableStock} units are available.`,
                "error"
            );

            return;
        }


        existingItem.quantity =
            newQuantity;


        existingItem.total_price =
            newQuantity *
            existingItem.unit_price;

    } else {

        const unitPrice =
            Number(
                batch.selling_price ||
                medicine.selling_price ||
                0
            );


        billItems.push({

            medicine_id:
                Number(medicine.id),

            medicine_name:
                medicine.name,

            batch_id:
                Number(batch.id),

            batch_number:
                batch.batch_number ||
                `Batch #${batch.id}`,

            quantity:
                quantity,

            unit_price:
                unitPrice,

            total_price:
                quantity * unitPrice

        });
    }


    renderBill();

    billingQuantity.value = 1;

    showMessage(
        "Medicine added to bill.",
        "success"
    );
}


// ==========================================
// RENDER BILL
// ==========================================

function renderBill() {

    if (billItems.length === 0) {

        billTableBody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="empty-table"
                >
                    No medicines added yet.
                </td>
            </tr>
        `;

        cartCount.textContent =
            "0 items";

        updateSummary();

        return;
    }


    billTableBody.innerHTML =
        billItems.map(function (item, index) {

            return `
                <tr>

                    <td>
                        <strong>
                            ${escapeHTML(
                                item.medicine_name
                            )}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(
                            item.batch_number
                        )}
                    </td>

                    <td>
                        ${item.quantity}
                    </td>

                    <td>
                        ₹${formatCurrency(
                            item.unit_price
                        )}
                    </td>

                    <td>
                        <strong>
                            ₹${formatCurrency(
                                item.total_price
                            )}
                        </strong>
                    </td>

                    <td>

                        <button
                            type="button"
                            class="table-action delete"
                            onclick="removeBillItem(${index})"
                            title="Remove"
                        >
                            🗑
                        </button>

                    </td>

                </tr>
            `;

        }).join("");


    const totalQuantity =
        billItems.reduce(
            function (total, item) {

                return total +
                    Number(item.quantity);

            },
            0
        );


    cartCount.textContent =
        `${totalQuantity} item${
            totalQuantity === 1
                ? ""
                : "s"
        }`;


    updateSummary();
}


// ==========================================
// REMOVE BILL ITEM
// ==========================================

window.removeBillItem =
    function (index) {

        if (
            index < 0 ||
            index >= billItems.length
        ) {
            return;
        }

        billItems.splice(index, 1);

        renderBill();
    };


// ==========================================
// CALCULATE SUBTOTAL
// ==========================================

function calculateSubtotal() {

    return billItems.reduce(

        function (total, item) {

            return total +
                Number(
                    item.total_price || 0
                );

        },

        0
    );
}


// ==========================================
// UPDATE SUMMARY
// ==========================================

function updateSummary() {

    const subtotal =
        calculateSubtotal();

    const discount =
        Number(
            discountInput.value || 0
        );

    const tax =
        Number(
            taxInput.value || 0
        );

    const total =
        subtotal -
        discount +
        tax;


    subtotalElement.textContent =
        `₹${formatCurrency(subtotal)}`;


    totalAmountElement.textContent =
        `₹${formatCurrency(
            Math.max(total, 0)
        )}`;
}


// ==========================================
// GENERATE BILL HTML
// ==========================================

function generateBillHTML(saleResponse) {

    const subtotal =
        calculateSubtotal();

    const discount =
        Number(
            discountInput.value || 0
        );

    const tax =
        Number(
            taxInput.value || 0
        );

    const total =
        Math.max(
            subtotal -
            discount +
            tax,
            0
        );


    const customer =
        customerName.value.trim() ||
        "Walk-in Customer";

    const phone =
        customerPhone.value.trim() ||
        "N/A";


    const payment =
        paymentMethod.value ||
        "Cash";


    const billNumber =
        saleResponse?.bill?.bill_number ||
        saleResponse?.bill?.invoice_number ||
        saleResponse?.bill?.id ||
        saleResponse?.sale?.id ||
        Date.now();


    const billDate =
        new Date().toLocaleString(
            "en-IN"
        );


    const itemsHTML =
        billItems.map(function (item, index) {

            return `
                <tr>

                    <td>
                        ${index + 1}
                    </td>

                    <td>
                        ${escapeHTML(
                            item.medicine_name
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            item.batch_number
                        )}
                    </td>

                    <td style="text-align:center;">
                        ${item.quantity}
                    </td>

                    <td style="text-align:right;">
                        ₹${formatCurrency(
                            item.unit_price
                        )}
                    </td>

                    <td style="text-align:right;">
                        ₹${formatCurrency(
                            item.total_price
                        )}
                    </td>

                </tr>
            `;

        }).join("");


    return `

        <div
            style="
                max-width: 800px;
                margin: 0 auto;
                font-family: Arial, sans-serif;
                color: #111;
                background: #fff;
            "
        >

            <!-- HEADER -->

            <div
                style="
                    text-align: center;
                    padding-bottom: 18px;
                    border-bottom: 2px solid #111;
                "
            >

                <h1
                    style="
                        margin: 0;
                        font-size: 28px;
                    "
                >
                    PharmLedge
                </h1>

                <p
                    style="
                        margin: 5px 0 0;
                        font-size: 14px;
                    "
                >
                    Pharmacy Invoice
                </p>

            </div>


            <!-- BILL INFO -->

            <div
                style="
                    display: flex;
                    justify-content: space-between;
                    margin-top: 20px;
                    margin-bottom: 20px;
                    font-size: 14px;
                "
            >

                <div>

                    <strong>
                        Bill No:
                    </strong>

                    ${escapeHTML(
                        String(billNumber)
                    )}

                    <br>

                    <strong>
                        Date:
                    </strong>

                    ${escapeHTML(
                        billDate
                    )}

                </div>


                <div
                    style="
                        text-align: right;
                    "
                >

                    <strong>
                        Customer:
                    </strong>

                    ${escapeHTML(
                        customer
                    )}

                    <br>

                    <strong>
                        Phone:
                    </strong>

                    ${escapeHTML(
                        phone
                    )}

                </div>

            </div>


            <!-- ITEMS TABLE -->

            <table
                style="
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                    font-size: 13px;
                "
            >

                <thead>

                    <tr
                        style="
                            background: #f2f2f2;
                        "
                    >

                        <th
                            style="
                                border: 1px solid #ccc;
                                padding: 10px;
                                text-align: left;
                            "
                        >
                            #
                        </th>

                        <th
                            style="
                                border: 1px solid #ccc;
                                padding: 10px;
                                text-align: left;
                            "
                        >
                            Medicine
                        </th>

                        <th
                            style="
                                border: 1px solid #ccc;
                                padding: 10px;
                                text-align: left;
                            "
                        >
                            Batch
                        </th>

                        <th
                            style="
                                border: 1px solid #ccc;
                                padding: 10px;
                                text-align: center;
                            "
                        >
                            Qty
                        </th>

                        <th
                            style="
                                border: 1px solid #ccc;
                                padding: 10px;
                                text-align: right;
                            "
                        >
                            Unit Price
                        </th>

                        <th
                            style="
                                border: 1px solid #ccc;
                                padding: 10px;
                                text-align: right;
                            "
                        >
                            Total
                        </th>

                    </tr>

                </thead>


                <tbody>

                    ${itemsHTML}

                </tbody>

            </table>


            <!-- SUMMARY -->

            <div
                style="
                    width: 300px;
                    margin-left: auto;
                    margin-top: 25px;
                    font-size: 14px;
                "
            >

                <div
                    style="
                        display: flex;
                        justify-content: space-between;
                        padding: 7px 0;
                    "
                >

                    <span>
                        Subtotal
                    </span>

                    <strong>
                        ₹${formatCurrency(
                            subtotal
                        )}
                    </strong>

                </div>


                <div
                    style="
                        display: flex;
                        justify-content: space-between;
                        padding: 7px 0;
                    "
                >

                    <span>
                        Discount
                    </span>

                    <strong>
                        ₹${formatCurrency(
                            discount
                        )}
                    </strong>

                </div>


                <div
                    style="
                        display: flex;
                        justify-content: space-between;
                        padding: 7px 0;
                    "
                >

                    <span>
                        Tax
                    </span>

                    <strong>
                        ₹${formatCurrency(
                            tax
                        )}
                    </strong>

                </div>


                <div
                    style="
                        display: flex;
                        justify-content: space-between;
                        border-top: 2px solid #111;
                        padding-top: 10px;
                        margin-top: 8px;
                        font-size: 18px;
                    "
                >

                    <strong>
                        Grand Total
                    </strong>

                    <strong>
                        ₹${formatCurrency(
                            total
                        )}
                    </strong>

                </div>

            </div>


            <!-- PAYMENT -->

            <div
                style="
                    margin-top: 25px;
                    padding-top: 15px;
                    border-top: 1px solid #ccc;
                    font-size: 14px;
                "
            >

                <strong>
                    Payment Method:
                </strong>

                ${escapeHTML(
                    payment
                )}

            </div>


            <!-- FOOTER -->

            <div
                style="
                    text-align: center;
                    margin-top: 40px;
                    padding-top: 15px;
                    border-top: 1px solid #ccc;
                    font-size: 12px;
                    color: #555;
                "
            >

                <p>
                    Thank you for your purchase.
                </p>

                <p>
                    PharmLedge Pharmacy Management System
                </p>

            </div>

        </div>

    `;
}


// ==========================================
// OPEN BILL MODAL
// ==========================================

function openBillModal(saleResponse) {

    if (!billModal || !billContent) {
        return;
    }

    billContent.innerHTML =
        generateBillHTML(
            saleResponse
        );

    billModal.classList.add("show");

    billModal.style.display = "flex";
}


// ==========================================
// CLOSE BILL MODAL
// ==========================================

function closeBill() {

    if (!billModal) {
        return;
    }

    billModal.classList.remove("show");

    billModal.style.display = "none";
}


// ==========================================
// PRINT / SAVE PDF
// ==========================================

function printBill() {

    if (!billContent) {
        return;
    }

    window.print();
}


// ==========================================
// COMPLETE SALE
// ==========================================

async function completeSale() {

    if (billItems.length === 0) {

        showMessage(
            "Add at least one medicine to the bill.",
            "error"
        );

        return;
    }


    const subtotal =
        calculateSubtotal();

    const discount =
        Number(
            discountInput.value || 0
        );

    const tax =
        Number(
            taxInput.value || 0
        );


    if (discount < 0) {

        showMessage(
            "Discount cannot be negative.",
            "error"
        );

        return;
    }


    if (tax < 0) {

        showMessage(
            "Tax cannot be negative.",
            "error"
        );

        return;
    }


    if (discount > subtotal) {

        showMessage(
            "Discount cannot be greater than subtotal.",
            "error"
        );

        return;
    }


    const saleData = {

        customer_name:
            customerName.value.trim() ||
            null,

        customer_phone:
            customerPhone.value.trim() ||
            null,

        items:
            billItems.map(function (item) {

                return {

                    medicine_id:
                        item.medicine_id,

                    quantity:
                        item.quantity

                };

            }),

        discount:
            discount,

        tax:
            tax,

        payment_method:
            paymentMethod.value

    };


    completeSaleBtn.disabled =
        true;

    completeSaleBtn.textContent =
        "Processing...";


    try {

        const response =
            await createSale(
                saleData
            );


        console.log(
            "Sale Response:",
            response
        );


        showMessage(
            "Sale completed successfully.",
            "success"
        );


        /*
         * IMPORTANT:
         * Generate the invoice BEFORE
         * clearing the bill.
         */

        openBillModal(
            response
        );


        /*
         * Refresh medicine stock
         * after successful sale.
         */

        await loadMedicines();


        /*
         * Clear the current billing form
         * only after invoice has been generated.
         */

        clearBill();


    } catch (error) {

        console.error(
            "Sale error:",
            error
        );

        showMessage(
            error.message ||
            "Unable to complete sale.",
            "error"
        );

    } finally {

        completeSaleBtn.disabled =
            false;

        completeSaleBtn.textContent =
            "Complete Sale";

    }
}


// ==========================================
// CLEAR BILL
// ==========================================

function clearBill() {

    billItems = [];

    customerName.value = "";

    customerPhone.value = "";

    discountInput.value = 0;

    taxInput.value = 0;

    paymentMethod.value = "Cash";

    billingMedicine.value = "";

    billingBatch.innerHTML = `
        <option value="">
            Select batch
        </option>
    `;

    billingBatch.disabled = true;

    billingQuantity.value = 1;

    renderBill();
}


// ==========================================
// FORMAT CURRENCY
// ==========================================

function formatCurrency(value) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-IN",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
}


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value ?? "";

    return div.innerHTML;
}


// ==========================================
// SHOW MESSAGE
// ==========================================

function showMessage(
    message,
    type
) {

    billingMessage.textContent =
        message;

    billingMessage.className =
        `auth-message ${type}`;


    setTimeout(function () {

        billingMessage.className =
            "auth-message hidden";

    }, 3500);
}


// ==========================================
// MEDICINE CHANGE
// ==========================================

billingMedicine.addEventListener(
    "change",
    function () {

        loadBatches(
            billingMedicine.value
        );

    }
);


// ==========================================
// ADD TO BILL
// ==========================================

addToBillBtn.addEventListener(
    "click",
    addItemToBill
);


// ==========================================
// DISCOUNT CHANGE
// ==========================================

discountInput.addEventListener(
    "input",
    updateSummary
);


// ==========================================
// TAX CHANGE
// ==========================================

taxInput.addEventListener(
    "input",
    updateSummary
);


// ==========================================
// COMPLETE SALE
// ==========================================

completeSaleBtn.addEventListener(
    "click",
    completeSale
);


// ==========================================
// CLEAR BILL
// ==========================================

clearBillBtn.addEventListener(
    "click",
    clearBill
);


// ==========================================
// BILL MODAL CLOSE
// ==========================================

if (closeBillModal) {

    closeBillModal.addEventListener(
        "click",
        closeBill
    );

}


if (closeBillBtn) {

    closeBillBtn.addEventListener(
        "click",
        closeBill
    );

}


// ==========================================
// PRINT BILL
// ==========================================

if (printBillBtn) {

    printBillBtn.addEventListener(
        "click",
        printBill
    );

}


// ==========================================
// CLOSE MODAL WHEN CLICKING OUTSIDE
// ==========================================

if (billModal) {

    billModal.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                billModal
            ) {

                closeBill();

            }

        }
    );

}


// ==========================================
// MOBILE SIDEBAR
// ==========================================

const mobileMenuBtn =
    document.getElementById(
        "mobileMenuBtn"
    );

const sidebar =
    document.getElementById(
        "sidebar"
    );

const sidebarOverlay =
    document.getElementById(
        "sidebarOverlay"
    );


if (
    mobileMenuBtn &&
    sidebar &&
    sidebarOverlay
) {

    mobileMenuBtn.addEventListener(
        "click",
        function () {

            sidebar.classList.add(
                "open"
            );

            sidebarOverlay.classList.add(
                "show"
            );

        }
    );


    sidebarOverlay.addEventListener(
        "click",
        function () {

            sidebar.classList.remove(
                "open"
            );

            sidebarOverlay.classList.remove(
                "show"
            );

        }
    );

}


// ==========================================
// INITIALIZE
// ==========================================

loadUser();

loadMedicines();

renderBill();

updateSummary();