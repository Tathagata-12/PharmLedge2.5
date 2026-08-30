requireAuth();

// ==========================================
// DOM ELEMENTS
// ==========================================

const salesTableBody = document.getElementById("salesTableBody");
const salesCount = document.getElementById("salesCount");
const searchInput = document.getElementById("searchInput");
const paymentFilter = document.getElementById("paymentFilter");

const saleModal = document.getElementById("saleModal");
const closeSaleModal = document.getElementById("closeSaleModal");
const saleDetails = document.getElementById("saleDetails");

let sales = [];

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

    const sidebarUserName =
        document.getElementById("sidebarUserName");

    const sidebarUserEmail =
        document.getElementById("sidebarUserEmail");

    const topUserName =
        document.getElementById("topUserName");

    const userAvatar =
        document.getElementById("userAvatar");

    const topUserAvatar =
        document.getElementById("topUserAvatar");

    if (sidebarUserName) {
        sidebarUserName.textContent = name;
    }

    if (sidebarUserEmail) {
        sidebarUserEmail.textContent = email;
    }

    if (topUserName) {
        topUserName.textContent = name;
    }

    const letter = name.charAt(0).toUpperCase();

    if (userAvatar) {
        userAvatar.textContent = letter;
    }

    if (topUserAvatar) {
        topUserAvatar.textContent = letter;
    }
}

// ==========================================
// LOAD SALES
// ==========================================

async function loadSales() {
    try {
        salesTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="loading-state">
                    Loading sales...
                </td>
            </tr>
        `;

        const token = localStorage.getItem("token");

        const response = await fetch(
            "http://localhost:5050/api/sales",
            {
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Unable to load sales"
            );
        }

        if (Array.isArray(data)) {
            sales = data;
        } else if (Array.isArray(data.sales)) {
            sales = data.sales;
        } else {
            sales = [];
        }

        renderSales();

    } catch (error) {
        console.error("Sales loading error:", error);

        salesTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-table">
                    Unable to load sales.
                </td>
            </tr>
        `;

        salesCount.textContent = "Unable to load sales.";
    }
}

// ==========================================
// FILTER SALES
// ==========================================

function getFilteredSales() {
    const search = searchInput.value
        .trim()
        .toLowerCase();

    const payment = paymentFilter.value;

    return sales.filter(function (sale) {
        const customer = String(
            sale.customer_name || ""
        ).toLowerCase();

        const saleId = String(
            sale.id ||
            sale.sale_id ||
            ""
        );

        const salePayment = String(
            sale.payment_method || ""
        );

        const matchesSearch =
            !search ||
            customer.includes(search) ||
            saleId.toLowerCase().includes(search);

        const matchesPayment =
            !payment ||
            salePayment.toLowerCase() ===
            payment.toLowerCase();

        return matchesSearch && matchesPayment;
    });
}

// ==========================================
// RENDER SALES
// ==========================================

function renderSales() {
    const filtered = getFilteredSales();

    salesCount.textContent =
        filtered.length +
        (filtered.length === 1 ? " sale" : " sales");

    if (filtered.length === 0) {
        salesTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-table">
                    <div class="empty-state">

                        <div class="empty-icon">
                            📈
                        </div>

                        <strong>
                            No sales found
                        </strong>

                        <span>
                            Completed sales will appear here.
                        </span>

                    </div>
                </td>
            </tr>
        `;

        return;
    }

    salesTableBody.innerHTML = filtered
        .map(function (sale) {

            const id =
                sale.id ||
                sale.sale_id ||
                "-";

            const customer =
                sale.customer_name ||
                "Walk-in Customer";

            const amount =
                Number(
                    sale.total_amount || 0
                );

            const payment =
                sale.payment_method ||
                "Cash";

            const date =
                formatDate(
                    sale.created_at
                );

            const items =
                sale.items_count ??
                sale.item_count ??
                (Array.isArray(sale.items)
                    ? sale.items.length
                    : "-");

            return `
                <tr>

                    <td>
                        <strong>
                            #${escapeHTML(String(id))}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(customer)}
                    </td>

                    <td>
                        ${escapeHTML(String(items))}
                    </td>

                    <td>
                        <strong>
                            ₹${formatCurrency(amount)}
                        </strong>
                    </td>

                    <td>
                        <span class="status-badge success">
                            ${escapeHTML(payment)}
                        </span>
                    </td>

                    <td>
                        ${date}
                    </td>

                    <td>
                        <button
                            type="button"
                            class="table-action edit"
                            onclick="viewSale(${Number(id)})"
                            title="View"
                        >
                            👁
                        </button>
                    </td>

                </tr>
            `;
        })
        .join("");
}

// ==========================================
// VIEW SALE
// ==========================================

window.viewSale = async function (id) {

    const sale = sales.find(function (item) {

        return Number(
            item.id ||
            item.sale_id
        ) === Number(id);

    });

    if (!sale) {
        return;
    }

    const customer =
        sale.customer_name ||
        "Walk-in Customer";

    const phone =
        sale.customer_phone ||
        "Not provided";

    const amount =
        Number(
            sale.total_amount || 0
        );

    const payment =
        sale.payment_method ||
        "Cash";

    const date =
        formatDate(
            sale.created_at
        );

    let itemsHTML = "";

    if (
        Array.isArray(sale.items) &&
        sale.items.length > 0
    ) {

        itemsHTML = sale.items
            .map(function (item) {

                const quantity =
                    Number(
                        item.quantity || 0
                    );

                const unitPrice =
                    Number(
                        item.unit_price || 0
                    );

                const total =
                    Number(
                        item.total_price ??
                        quantity * unitPrice
                    );

                return `
                    <div
                        style="
                            display:flex;
                            justify-content:space-between;
                            gap:20px;
                            padding:12px 0;
                            border-bottom:1px solid var(--border);
                        "
                    >

                        <div>

                            <strong>
                                ${escapeHTML(
                                    item.medicine_name ||
                                    "Medicine"
                                )}
                            </strong>

                            <div
                                style="
                                    font-size:11px;
                                    color:var(--text-light);
                                    margin-top:4px;
                                "
                            >
                                Qty: ${quantity}
                            </div>

                        </div>

                        <strong>
                            ₹${formatCurrency(total)}
                        </strong>

                    </div>
                `;
            })
            .join("");

    } else {

        itemsHTML = `
            <p style="color:var(--text-light);">
                Item details not available.
            </p>
        `;
    }

    const saleId =
        sale.id ||
        sale.sale_id ||
        "";

    saleDetails.innerHTML = `
        <div style="padding:25px;">

            <div
                style="
                    display:grid;
                    grid-template-columns:repeat(2, minmax(0, 1fr));
                    gap:18px;
                    margin-bottom:25px;
                "
            >

                <div>

                    <span
                        style="
                            font-size:10px;
                            color:var(--text-light);
                        "
                    >
                        BILL ID
                    </span>

                    <strong
                        style="
                            display:block;
                            margin-top:5px;
                        "
                    >
                        #${escapeHTML(String(saleId))}
                    </strong>

                </div>

                <div>

                    <span
                        style="
                            font-size:10px;
                            color:var(--text-light);
                        "
                    >
                        DATE
                    </span>

                    <strong
                        style="
                            display:block;
                            margin-top:5px;
                        "
                    >
                        ${date}
                    </strong>

                </div>

                <div>

                    <span
                        style="
                            font-size:10px;
                            color:var(--text-light);
                        "
                    >
                        CUSTOMER
                    </span>

                    <strong
                        style="
                            display:block;
                            margin-top:5px;
                        "
                    >
                        ${escapeHTML(customer)}
                    </strong>

                </div>

                <div>

                    <span
                        style="
                            font-size:10px;
                            color:var(--text-light);
                        "
                    >
                        PHONE
                    </span>

                    <strong
                        style="
                            display:block;
                            margin-top:5px;
                        "
                    >
                        ${escapeHTML(phone)}
                    </strong>

                </div>

            </div>

            <h3
                style="
                    margin-bottom:10px;
                    font-size:14px;
                "
            >
                Items
            </h3>

            <div>
                ${itemsHTML}
            </div>

            <div
                style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    margin-top:22px;
                    padding-top:18px;
                    border-top:1px solid var(--border);
                "
            >

                <div>

                    <span
                        style="
                            display:block;
                            font-size:10px;
                            color:var(--text-light);
                        "
                    >
                        PAYMENT
                    </span>

                    <strong>
                        ${escapeHTML(payment)}
                    </strong>

                </div>

                <div style="text-align:right;">

                    <span
                        style="
                            display:block;
                            font-size:10px;
                            color:var(--text-light);
                        "
                    >
                        TOTAL
                    </span>

                    <strong
                        style="
                            font-size:20px;
                            color:var(--primary);
                        "
                    >
                        ₹${formatCurrency(amount)}
                    </strong>

                </div>

            </div>

        </div>
    `;

    saleModal.classList.add("show");
    document.body.classList.add("modal-open");
};

// ==========================================
// CLOSE MODAL
// ==========================================

function closeModal() {
    saleModal.classList.remove("show");
    document.body.classList.remove("modal-open");
}

// ==========================================
// FORMAT DATE
// ==========================================

function formatDate(value) {

    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
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
// SEARCH
// ==========================================

searchInput.addEventListener(
    "input",
    renderSales
);

// ==========================================
// PAYMENT FILTER
// ==========================================

paymentFilter.addEventListener(
    "change",
    renderSales
);

// ==========================================
// CLOSE SALE MODAL
// ==========================================

if (closeSaleModal) {

    closeSaleModal.addEventListener(
        "click",
        closeModal
    );
}

// ==========================================
// CLOSE MODAL OUTSIDE
// ==========================================

saleModal.addEventListener(
    "click",
    function (event) {

        if (event.target === saleModal) {
            closeModal();
        }

    }
);

// ==========================================
// MOBILE SIDEBAR
// ==========================================

const mobileMenuBtn =
    document.getElementById("mobileMenuBtn");

const sidebar =
    document.getElementById("sidebar");

const sidebarOverlay =
    document.getElementById("sidebarOverlay");

if (
    mobileMenuBtn &&
    sidebar &&
    sidebarOverlay
) {

    mobileMenuBtn.addEventListener(
        "click",
        function () {

            sidebar.classList.add("open");

            sidebarOverlay.classList.add("show");

        }
    );

    sidebarOverlay.addEventListener(
        "click",
        function () {

            sidebar.classList.remove("open");

            sidebarOverlay.classList.remove("show");

        }
    );
}

// ==========================================
// INITIALIZE
// ==========================================

loadUser();
loadSales();