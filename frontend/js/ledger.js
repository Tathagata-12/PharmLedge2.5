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
    document.getElementById(
        "closePaymentModalBtn"
    );

const cancelPaymentBtn =
    document.getElementById(
        "cancelPaymentBtn"
    );

const savePaymentBtn =
    document.getElementById(
        "savePaymentBtn"
    );


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
        document.getElementById(
            "sidebarUserName"
        );

    const sidebarEmail =
        document.getElementById(
            "sidebarUserEmail"
        );

    const topName =
        document.getElementById(
            "topUserName"
        );

    const userAvatar =
        document.getElementById(
            "userAvatar"
        );

    const topUserAvatar =
        document.getElementById(
            "topUserAvatar"
        );


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


        if (ledgerTableBody) {

            ledgerTableBody.innerHTML = `
                <tr>
                    <td
                        colspan="6"
                        class="empty-table">

                        Invalid vendor.

                    </td>
                </tr>
            `;
        }

        return false;
    }


    // Make sure the ID is numeric

    if (!/^\d+$/.test(String(vendorId))) {

        showMessage(
            "Invalid vendor ID.",
            "error"
        );


        if (ledgerTableBody) {

            ledgerTableBody.innerHTML = `
                <tr>
                    <td
                        colspan="6"
                        class="empty-table">

                        Invalid vendor.

                    </td>
                </tr>
            `;
        }

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


    if (ledgerTableBody) {

        ledgerTableBody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="loading-state">

                    Loading ledger...

                </td>
            </tr>
        `;
    }


    try {

        // ==================================
        // GET COMPLETE LEDGER
        // ==================================

        const response =
            await getVendorLedger(
                vendorId
            );


        console.log(
            "Vendor ledger response:",
            response
        );


        // ==================================
        // VENDOR INFORMATION
        // ==================================

        const vendor =
            response &&
            response.vendor
                ? response.vendor
                : null;


        if (vendor) {

            if (vendorName) {

                vendorName.textContent =
                    vendor.name ||
                    "Vendor";
            }


            if (vendorContact) {

                vendorContact.textContent =
                    vendor.contact ||
                    vendor.email ||
                    "Vendor information";
            }
        }


        // ==================================
        // GET TRANSACTIONS
        // ==================================

        const transactions =
            response &&
            Array.isArray(
                response.transactions
            )
                ? response.transactions
                : [];


        // ==================================
        // SUMMARY FROM BACKEND
        // ==================================

        const summary =
            response &&
            response.summary
                ? response.summary
                : {};


        const purchases =
            Number(
                summary.total_purchases || 0
            );


        const payments =
            Number(
                summary.total_payments || 0
            );


        const outstanding =
            Number(
                summary.outstanding_balance || 0
            );


        // ==================================
        // UPDATE SUMMARY CARDS
        // ==================================

        if (totalPurchases) {

            totalPurchases.textContent =
                formatCurrency(
                    purchases
                );
        }


        if (totalPaid) {

            totalPaid.textContent =
                formatCurrency(
                    payments
                );
        }


        if (outstandingBalance) {

            outstandingBalance.textContent =
                formatCurrency(
                    outstanding
                );
        }


        // ==================================
        // RENDER TRANSACTIONS
        // ==================================

        renderLedger(
            transactions
        );

    } catch (error) {

        console.error(
            "Ledger loading error:",
            error
        );


        if (ledgerTableBody) {

            ledgerTableBody.innerHTML = `
                <tr>
                    <td
                        colspan="6"
                        class="empty-table">

                        Unable to load vendor ledger.

                    </td>
                </tr>
            `;
        }


        if (transactionCount) {

            transactionCount.textContent =
                "Unable to load transactions";
        }


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

    if (
        !entries ||
        !entries.length
    ) {

        if (ledgerTableBody) {

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
                                Vendor purchases and payments
                                will appear here.
                            </span>

                        </div>

                    </td>
                </tr>
            `;
        }


        if (transactionCount) {

            transactionCount.textContent =
                "0 transactions";
        }


        return;
    }


    // ==========================================
    // TRANSACTION COUNT
    // ==========================================

    if (transactionCount) {

        transactionCount.textContent =
            `${entries.length} transaction${
                entries.length === 1
                    ? ""
                    : "s"
            }`;
    }


    // ==========================================
    // RENDER ROWS
    // ==========================================

    if (ledgerTableBody) {

        ledgerTableBody.innerHTML =
            entries.map(function (entry) {

                // ==================================
                // BACKEND DIRECTLY PROVIDES
                // debit / credit / balance
                // ==================================

                const debit =
                    Number(
                        entry.debit || 0
                    );


                const credit =
                    Number(
                        entry.credit || 0
                    );


                const balance =
                    Number(
                        entry.balance || 0
                    );


                // ==================================
                // TRANSACTION TYPE
                // ==================================

                const transactionType =
                    String(
                        entry.transaction_type ||
                        entry.type ||
                        entry.entry_type ||
                        ""
                    ).toUpperCase();


                const isPayment =
                    transactionType === "PAYMENT" ||
                    transactionType.includes(
                        "PAYMENT"
                    ) ||
                    credit > 0;


                const isPurchase =
                    transactionType === "PURCHASE" ||
                    transactionType.includes(
                        "PURCHASE"
                    ) ||
                    transactionType === "STOCK" ||
                    transactionType.includes(
                        "STOCK"
                    ) ||
                    debit > 0;


                // ==================================
                // DATE
                // ==================================

                const date =
                    entry.created_at ||
                    entry.date ||
                    entry.transaction_date;


                // ==================================
                // DESCRIPTION
                // ==================================

                const description =
                    entry.description ||
                    (
                        isPayment
                            ? "Payment to vendor"
                            : "Medicine purchase"
                    );


                // ==================================
                // DISPLAY TYPE
                // ==================================

                let displayType =
                    "Transaction";


                let badgeClass =
                    "warning";


                if (isPayment) {

                    displayType =
                        "Payment";

                    badgeClass =
                        "success";

                } else if (isPurchase) {

                    displayType =
                        "Purchase";

                    badgeClass =
                        "warning";
                }


                // ==================================
                // RETURN TABLE ROW
                // ==================================

                return `
                    <tr>

                        <!-- DATE -->

                        <td>
                            ${formatDate(
                                date
                            )}
                        </td>


                        <!-- TYPE -->

                        <td>

                            <span
                                class="status-badge ${badgeClass}">

                                ${displayType}

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
                                    ? formatCurrency(
                                        debit
                                    )
                                    : "-"
                            }

                        </td>


                        <!-- CREDIT -->

                        <td>

                            ${
                                credit > 0
                                    ? formatCurrency(
                                        credit
                                    )
                                    : "-"
                            }

                        </td>


                        <!-- BALANCE -->

                        <td>

                            <strong>
                                ${formatCurrency(
                                    balance
                                )}
                            </strong>

                        </td>

                    </tr>
                `;

            }).join("");
    }
}


// ==========================================
// OPEN PAYMENT MODAL
// ==========================================

function openPaymentModal() {

    if (!validateVendorId()) {
        return;
    }


    if (!paymentModal) {
        return;
    }


    if (paymentForm) {
        paymentForm.reset();
    }


    paymentModal.classList.add(
        "show"
    );


    if (paymentAmount) {

        paymentAmount.focus();
    }
}


// ==========================================
// CLOSE PAYMENT MODAL
// ==========================================

function closePaymentModal() {

    if (!paymentModal) {
        return;
    }


    paymentModal.classList.remove(
        "show"
    );


    if (paymentForm) {

        paymentForm.reset();
    }
}


// ==========================================
// ADD VENDOR PAYMENT
// ==========================================

async function savePayment(event) {

    event.preventDefault();


    if (!validateVendorId()) {
        return;
    }


    const amount =
        Number(
            paymentAmount.value
        );


    const description =
        paymentDescription
            ? paymentDescription.value.trim()
            : "";


    // ==========================================
    // VALIDATION
    // ==========================================

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

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


    if (savePaymentBtn) {

        savePaymentBtn.disabled =
            true;

        savePaymentBtn.textContent =
            "Saving...";
    }


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


        // ==================================
        // RELOAD LEDGER
        // ==================================

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

        if (savePaymentBtn) {

            savePaymentBtn.disabled =
                false;

            savePaymentBtn.textContent =
                "Save Payment";
        }
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


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

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