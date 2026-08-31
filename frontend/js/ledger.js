requireAuth();


// ==========================================
// GET VENDOR ID FROM URL
// ==========================================

const urlParams =
    new URLSearchParams(window.location.search);

const vendorId =
    urlParams.get("vendorId");


// ==========================================
// DOM ELEMENTS
// ==========================================

const vendorName =
    document.getElementById("vendorName");

const vendorContact =
    document.getElementById("vendorContact");

const totalPurchases =
    document.getElementById("totalPurchases");

const totalPaid =
    document.getElementById("totalPaid");

const outstandingBalance =
    document.getElementById("outstandingBalance");

const transactionCount =
    document.getElementById("transactionCount");

const ledgerTableBody =
    document.getElementById("ledgerTableBody");

const ledgerMessage =
    document.getElementById("ledgerMessage");

const paymentModal =
    document.getElementById("paymentModal");

const paymentForm =
    document.getElementById("paymentForm");

const paymentAmount =
    document.getElementById("paymentAmount");

const paymentDescription =
    document.getElementById("paymentDescription");

const addPaymentBtn =
    document.getElementById("addPaymentBtn");

const closePaymentModalBtn =
    document.getElementById("closePaymentModalBtn");

const cancelPaymentBtn =
    document.getElementById("cancelPaymentBtn");

const savePaymentBtn =
    document.getElementById("savePaymentBtn");


// ==========================================
// LOAD USER
// ==========================================

function loadUser() {

    const user =
        getCurrentUser();

    if (!user) {
        return;
    }

    const name =
        user.name || "User";

    const email =
        user.email || "";


    const sidebarName =
        document.getElementById("sidebarUserName");

    const sidebarEmail =
        document.getElementById("sidebarUserEmail");

    const topName =
        document.getElementById("topUserName");

    const userAvatar =
        document.getElementById("userAvatar");

    const topUserAvatar =
        document.getElementById("topUserAvatar");


    if (sidebarName) {
        sidebarName.textContent = name;
    }

    if (sidebarEmail) {
        sidebarEmail.textContent = email;
    }

    if (topName) {
        topName.textContent = name;
    }


    const letter =
        name.charAt(0).toUpperCase();


    if (userAvatar) {
        userAvatar.textContent = letter;
    }

    if (topUserAvatar) {
        topUserAvatar.textContent = letter;
    }
}


// ==========================================
// VALIDATE VENDOR ID
// ==========================================

function validateVendorId() {

    if (!vendorId) {

        showMessage(
            "Vendor ID is missing.",
            "error"
        );

        ledgerTableBody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="empty-table">

                    Invalid vendor.

                </td>
            </tr>
        `;

        return false;
    }

    return true;
}


// ==========================================
// LOAD VENDOR LEDGER
// ==========================================

async function loadLedger() {

    if (!validateVendorId()) {
        return;
    }


    ledgerTableBody.innerHTML = `
        <tr>
            <td
                colspan="6"
                class="loading-state">

                Loading ledger...

            </td>
        </tr>
    `;


    try {

        // ==================================
        // GET LEDGER
        // ==================================

        const response =
            await getVendorLedger(vendorId);


        console.log(
            "Vendor ledger:",
            response
        );


        // ==================================
        // GET BALANCE
        // ==================================

        let balanceResponse = null;

        try {

            balanceResponse =
                await getVendorBalance(
                    vendorId
                );

        } catch (balanceError) {

            console.warn(
                "Unable to load vendor balance:",
                balanceError
            );
        }


        // ==================================
        // NORMALIZE RESPONSE
        // ==================================

        const ledger =
            Array.isArray(response)
                ? response
                : response.ledger ||
                  response.transactions ||
                  response.entries ||
                  [];


        // ==================================
        // VENDOR INFORMATION
        // ==================================

        const vendor =
            response.vendor ||
            response.vendor_info ||
            null;


        if (vendor) {

            vendorName.textContent =
                vendor.name || "Vendor";

            vendorContact.textContent =
                vendor.contact ||
                vendor.email ||
                "Vendor information";

        }


        // ==================================
        // CALCULATE SUMMARY
        // ==================================

        let purchases = 0;

        let payments = 0;

        let runningBalance = 0;


        ledger.forEach(function (entry) {

            const amount =
                Number(
                    entry.amount ||
                    entry.total_amount ||
                    entry.purchase_amount ||
                    entry.payment_amount ||
                    0
                );


            const type =
                String(
                    entry.type ||
                    entry.transaction_type ||
                    entry.entry_type ||
                    ""
                ).toLowerCase();


            if (
                type.includes("purchase") ||
                type.includes("debit") ||
                type.includes("stock")
            ) {

                purchases += amount;

            } else if (
                type.includes("payment") ||
                type.includes("credit")
            ) {

                payments += amount;

            }

        });


        // ==================================
        // USE BALANCE API IF AVAILABLE
        // ==================================

        if (balanceResponse) {

            const apiBalance =
                Number(
                    balanceResponse.balance ??
                    balanceResponse.outstanding_balance ??
                    balanceResponse.amount ??
                    0
                );


            if (
                !Number.isNaN(apiBalance)
            ) {

                runningBalance =
                    apiBalance;

            }

        } else {

            runningBalance =
                purchases - payments;

        }


        // ==================================
        // UPDATE SUMMARY
        // ==================================

        totalPurchases.textContent =
            formatCurrency(purchases);

        totalPaid.textContent =
            formatCurrency(payments);

        outstandingBalance.textContent =
            formatCurrency(runningBalance);


        // ==================================
        // RENDER LEDGER
        // ==================================

        renderLedger(ledger);


    } catch (error) {

        console.error(
            "Ledger loading error:",
            error
        );


        ledgerTableBody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="empty-table">

                    Unable to load vendor ledger.

                </td>
            </tr>
        `;


        transactionCount.textContent =
            "Unable to load transactions";


        showMessage(
            error.message ||
            "Unable to load vendor ledger.",
            "error"
        );
    }
}


// ==========================================
// RENDER LEDGER
// ==========================================

function renderLedger(entries) {

    if (!entries || !entries.length) {

        ledgerTableBody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="empty-table">

                    <div class="empty-state">

                        <div class="empty-icon">
                            📒
                        </div>

                        <strong>
                            No transactions yet
                        </strong>

                        <span>
                            Vendor purchases and payments will appear here.
                        </span>

                    </div>

                </td>
            </tr>
        `;


        transactionCount.textContent =
            "0 transactions";

        return;
    }


    transactionCount.textContent =
        `${entries.length} transaction${
            entries.length === 1
                ? ""
                : "s"
        }`;


    let calculatedBalance = 0;


    ledgerTableBody.innerHTML =
        entries.map(function (entry) {

            const amount =
                Number(
                    entry.amount ||
                    entry.total_amount ||
                    entry.purchase_amount ||
                    entry.payment_amount ||
                    0
                );


            const type =
                String(
                    entry.type ||
                    entry.transaction_type ||
                    entry.entry_type ||
                    ""
                ).toLowerCase();


            const isPayment =
                type.includes("payment") ||
                type.includes("credit");


            const isPurchase =
                type.includes("purchase") ||
                type.includes("debit") ||
                type.includes("stock");


            if (isPayment) {

                calculatedBalance -= amount;

            } else if (isPurchase) {

                calculatedBalance += amount;

            }


            const date =
                entry.created_at ||
                entry.date ||
                entry.transaction_date;


            const description =
                entry.description ||
                entry.details ||
                entry.note ||
                (isPayment
                    ? "Payment to vendor"
                    : "Medicine purchase");


            const debit =
                isPurchase
                    ? amount
                    : 0;


            const credit =
                isPayment
                    ? amount
                    : 0;


            const balance =
                entry.balance !== undefined
                    ? Number(entry.balance)
                    : calculatedBalance;


            return `
                <tr>

                    <!-- DATE -->

                    <td>
                        ${formatDate(date)}
                    </td>


                    <!-- TYPE -->

                    <td>

                        <span class="status-badge ${
                            isPayment
                                ? "success"
                                : "warning"
                        }">

                            ${
                                isPayment
                                    ? "Payment"
                                    : "Purchase"
                            }

                        </span>

                    </td>


                    <!-- DESCRIPTION -->

                    <td>
                        ${escapeHTML(
                            description
                        )}
                    </td>


                    <!-- DEBIT -->

                    <td>

                        ${
                            debit > 0
                                ? formatCurrency(debit)
                                : "-"
                        }

                    </td>


                    <!-- CREDIT -->

                    <td>

                        ${
                            credit > 0
                                ? formatCurrency(credit)
                                : "-"
                        }

                    </td>


                    <!-- BALANCE -->

                    <td>

                        <strong>
                            ${formatCurrency(balance)}
                        </strong>

                    </td>

                </tr>
            `;

        }).join("");
}


// ==========================================
// OPEN PAYMENT MODAL
// ==========================================

function openPaymentModal() {

    if (!validateVendorId()) {
        return;
    }


    paymentForm.reset();

    paymentModal.classList.add("show");

    paymentAmount.focus();
}


// ==========================================
// CLOSE PAYMENT MODAL
// ==========================================

function closePaymentModal() {

    paymentModal.classList.remove("show");

    paymentForm.reset();
}


// ==========================================
// ADD PAYMENT
// ==========================================

async function savePayment(event) {

    event.preventDefault();


    const amount =
        Number(
            paymentAmount.value
        );


    const description =
        paymentDescription.value.trim();


    if (!amount || amount <= 0) {

        showMessage(
            "Payment amount must be greater than 0.",
            "error"
        );

        return;
    }


    const paymentData = {

        amount: amount,

        description:
            description || null

    };


    savePaymentBtn.disabled = true;

    savePaymentBtn.textContent =
        "Saving...";


    try {

        const response =
            await addVendorPayment(
                vendorId,
                paymentData
            );


        showMessage(
            response.message ||
            "Payment recorded successfully.",
            "success"
        );


        closePaymentModal();


        await loadLedger();


    } catch (error) {

        console.error(
            "Payment error:",
            error
        );


        showMessage(
            error.message ||
            "Unable to record payment.",
            "error"
        );


    } finally {

        savePaymentBtn.disabled = false;

        savePaymentBtn.textContent =
            "Save Payment";
    }
}


// ==========================================
// BACK TO VENDORS
// ==========================================

function goBackToVendors() {

    window.location.href =
        "vendors.html";
}


// ==========================================
// SHOW MESSAGE
// ==========================================

function showMessage(
    message,
    type
) {

    if (!ledgerMessage) {
        return;
    }


    ledgerMessage.textContent =
        message;

    ledgerMessage.className =
        `auth-message ${type}`;


    setTimeout(function () {

        ledgerMessage.className =
            "auth-message hidden";

    }, 3500);
}


// ==========================================
// FORMAT CURRENCY
// ==========================================

function formatCurrency(amount) {

    const number =
        Number(amount) || 0;


    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2
        }
    ).format(number);
}


// ==========================================
// FORMAT DATE
// ==========================================

function formatDate(dateValue) {

    if (!dateValue) {
        return "-";
    }


    const date =
        new Date(dateValue);


    if (Number.isNaN(date.getTime())) {
        return "-";
    }


    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
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
// PAYMENT BUTTON
// ==========================================

if (addPaymentBtn) {

    addPaymentBtn.addEventListener(
        "click",
        openPaymentModal
    );
}


// ==========================================
// CLOSE PAYMENT MODAL
// ==========================================

if (closePaymentModalBtn) {

    closePaymentModalBtn.addEventListener(
        "click",
        closePaymentModal
    );
}


if (cancelPaymentBtn) {

    cancelPaymentBtn.addEventListener(
        "click",
        closePaymentModal
    );
}


// ==========================================
// CLICK OUTSIDE MODAL
// ==========================================

if (paymentModal) {

    paymentModal.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                paymentModal
            ) {

                closePaymentModal();

            }

        }
    );
}


// ==========================================
// PAYMENT FORM
// ==========================================

if (paymentForm) {

    paymentForm.addEventListener(
        "submit",
        savePayment
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

loadLedger();