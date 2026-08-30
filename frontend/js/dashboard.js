// ==========================================
// PHARMLEDGE DASHBOARD
// ==========================================

requireAuth();

// ==========================================
// DOM ELEMENTS
// ==========================================

const welcomeName =
    document.getElementById("welcomeName");

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

const totalMedicines =
    document.getElementById("totalMedicines");

const totalStock =
    document.getElementById("totalStock");

const todaySales =
    document.getElementById("todaySales");

const todayBills =
    document.getElementById("todayBills");

const lowStockList =
    document.getElementById("lowStockList");

const expiryList =
    document.getElementById("expiryList");

const recentSalesTable =
    document.getElementById("recentSalesTable");

const currentDate =
    document.getElementById("currentDate");

const mobileMenuBtn =
    document.getElementById("mobileMenuBtn");

const sidebar =
    document.getElementById("sidebar");

const sidebarOverlay =
    document.getElementById("sidebarOverlay");


// ==========================================
// USER INFORMATION
// ==========================================

function loadUserInfo() {

    const user = getCurrentUser();

    if (!user) {
        return;
    }

    const name = user.name || "User";
    const email = user.email || "";

    welcomeName.textContent = name;
    sidebarUserName.textContent = name;
    sidebarUserEmail.textContent = email;
    topUserName.textContent = name;

    const firstLetter =
        name.charAt(0).toUpperCase();

    userAvatar.textContent = firstLetter;
    topUserAvatar.textContent = firstLetter;
}


// ==========================================
// CURRENT DATE
// ==========================================

function loadCurrentDate() {

    const today = new Date();

    const formatted =
        today.toLocaleDateString(
            "en-IN",
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );

    currentDate.textContent = formatted;
}


// ==========================================
// FORMAT CURRENCY
// ==========================================

function formatCurrency(value) {

    const number = Number(value || 0);

    return number.toLocaleString(
        "en-IN",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
}


// ==========================================
// FORMAT DATE
// ==========================================

function formatDate(dateValue) {

    if (!dateValue) {
        return "—";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "—";
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
// LOAD DASHBOARD DATA
// ==========================================

async function loadDashboard() {

    try {

        const data = await getDashboard();

        console.log("Dashboard data:", data);

        // ==================================
        // SUMMARY
        // ==================================

        const summary = data.summary || {};

        totalMedicines.textContent =
            summary.total_medicines ?? 0;

        totalStock.textContent =
            summary.total_stock ?? 0;

        todaySales.textContent =
            formatCurrency(
                summary.today_sales
            );

        todayBills.textContent =
            summary.today_bills ?? 0;


        // ==================================
        // LOW STOCK
        // ==================================

        renderLowStock(
            data.low_stock || []
        );


        // ==================================
        // EXPIRING SOON
        // ==================================

        renderExpiring(
            data.expiring_soon || []
        );


        // ==================================
        // RECENT SALES
        // ==================================

        renderRecentSales(
            data.recent_sales || []
        );

    } catch (error) {

        console.error(
            "Dashboard loading error:",
            error
        );

        showDashboardError();
    }
}


// ==========================================
// LOW STOCK
// ==========================================

function renderLowStock(items) {

    if (!Array.isArray(items) || items.length === 0) {

        lowStockList.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    ✓
                </div>

                <strong>
                    Stock looks good
                </strong>

                <span>
                    No medicines are currently low in stock.
                </span>

            </div>
        `;

        return;
    }


    lowStockList.innerHTML =
        items
            .slice(0, 5)
            .map(item => {

                return `
                    <div class="alert-item">

                        <div class="alert-item-icon warning">
                            !
                        </div>

                        <div class="alert-item-content">

                            <strong>
                                ${escapeHTML(item.name)}
                            </strong>

                            <span>
                                ${Number(
                                    item.current_stock || 0
                                )}
                                units remaining
                            </span>

                        </div>

                        <div class="stock-badge warning">
                            Low
                        </div>

                    </div>
                `;

            })
            .join("");
}


// ==========================================
// EXPIRING MEDICINES
// ==========================================

function renderExpiring(items) {

    if (!Array.isArray(items) || items.length === 0) {

        expiryList.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    ✓
                </div>

                <strong>
                    No upcoming expiry
                </strong>

                <span>
                    No batches expire within 30 days.
                </span>

            </div>
        `;

        return;
    }


    expiryList.innerHTML =
        items
            .slice(0, 5)
            .map(item => {

                return `
                    <div class="alert-item">

                        <div class="alert-item-icon danger">
                            !
                        </div>

                        <div class="alert-item-content">

                            <strong>
                                ${escapeHTML(
                                    item.medicine_name
                                )}
                            </strong>

                            <span>
                                Batch
                                ${escapeHTML(
                                    item.batch_number || "—"
                                )}
                            </span>

                        </div>

                        <div class="expiry-date">
                            ${formatDate(
                                item.expiry_date
                            )}
                        </div>

                    </div>
                `;

            })
            .join("");
}


// ==========================================
// RECENT SALES
// ==========================================

function renderRecentSales(items) {

    if (!Array.isArray(items) || items.length === 0) {

        recentSalesTable.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="empty-table"
                >
                    No sales yet.
                </td>
            </tr>
        `;

        return;
    }


    recentSalesTable.innerHTML =
        items
            .slice(0, 5)
            .map(sale => {

                return `
                    <tr>

                        <td>
                            <span class="bill-id">
                                #${escapeHTML(
                                    String(sale.id ?? "")
                                )}
                            </span>
                        </td>

                        <td>
                            <strong>
                                ${escapeHTML(
                                    sale.customer_name ||
                                    "Walk-in Customer"
                                )}
                            </strong>
                        </td>

                        <td>
                            <span class="payment-badge">
                                ${escapeHTML(
                                    sale.payment_method ||
                                    "Cash"
                                )}
                            </span>
                        </td>

                        <td>
                            ${formatDate(
                                sale.created_at
                            )}
                        </td>

                        <td>
                            <strong class="amount">
                                ₹${formatCurrency(
                                    sale.total_amount
                                )}
                            </strong>
                        </td>

                    </tr>
                `;

            })
            .join("");
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
// DASHBOARD ERROR STATE
// ==========================================

function showDashboardError() {

    lowStockList.innerHTML = `
        <div class="empty-state">

            <strong>
                Unable to load dashboard
            </strong>

            <span>
                Please refresh and try again.
            </span>

        </div>
    `;


    expiryList.innerHTML = `
        <div class="empty-state">

            <strong>
                Unable to load dashboard
            </strong>

            <span>
                Please refresh and try again.
            </span>

        </div>
    `;


    recentSalesTable.innerHTML = `
        <tr>
            <td
                colspan="5"
                class="empty-table"
            >
                Unable to load sales data.
            </td>
        </tr>
    `;


    totalMedicines.textContent = "—";
    totalStock.textContent = "—";
    todaySales.textContent = "0.00";
    todayBills.textContent = "—";
}


// ==========================================
// MOBILE SIDEBAR
// ==========================================

function openSidebar() {

    sidebar.classList.add("open");

    sidebarOverlay.classList.add("show");
}


function closeSidebar() {

    sidebar.classList.remove("open");

    sidebarOverlay.classList.remove("show");
}


mobileMenuBtn.addEventListener(
    "click",
    openSidebar
);


sidebarOverlay.addEventListener(
    "click",
    closeSidebar
);


// ==========================================
// CLOSE SIDEBAR WHEN NAVIGATING
// ==========================================

const navItems =
    document.querySelectorAll(".nav-item");

navItems.forEach(item => {

    item.addEventListener(
        "click",
        closeSidebar
    );

});


// ==========================================
// INITIALIZE DASHBOARD
// ==========================================

loadUserInfo();

loadCurrentDate();

loadDashboard();