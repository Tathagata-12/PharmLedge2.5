requireAuth();

// ==========================================
// DOM ELEMENTS
// ==========================================

const stockTableBody = document.getElementById("stockTableBody");
const batchCount = document.getElementById("batchCount");
const stockSearchInput = document.getElementById("stockSearchInput");
const stockStatusFilter = document.getElementById("stockStatusFilter");

const batchModal = document.getElementById("batchModal");
const batchForm = document.getElementById("batchForm");
const batchModalTitle = document.getElementById("batchModalTitle");
const saveBatchBtn = document.getElementById("saveBatchBtn");

const batchMedicine = document.getElementById("batchMedicine");
const batchNumber = document.getElementById("batchNumber");
const batchQuantity = document.getElementById("batchQuantity");
const batchPurchasePrice = document.getElementById("batchPurchasePrice");
const batchSellingPrice = document.getElementById("batchSellingPrice");
const manufacturingDate = document.getElementById("manufacturingDate");
const expiryDate = document.getElementById("expiryDate");

// ==========================================
// DATA
// ==========================================

let batches = [];
let medicines = [];

// ==========================================
// LOAD USER
// ==========================================

function loadUser() {
    const user = getCurrentUser();

    if (!user) {
        return;
    }

    const name = user.name || "User";
    const email = user.email || "";

    const sidebarUserName = document.getElementById("sidebarUserName");
    const sidebarUserEmail = document.getElementById("sidebarUserEmail");
    const topUserName = document.getElementById("topUserName");
    const userAvatar = document.getElementById("userAvatar");
    const topUserAvatar = document.getElementById("topUserAvatar");

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
// LOAD MEDICINES
// ==========================================

async function loadMedicines() {
    try {
        const response = await getMedicines();

        medicines = Array.isArray(response)
            ? response
            : response?.medicines || [];

        batchMedicine.innerHTML = `
            <option value="">Select medicine</option>
        `;

        medicines.forEach(function (medicine) {
            const option = document.createElement("option");

            option.value = medicine.id;
            option.textContent = medicine.name;

            batchMedicine.appendChild(option);
        });
    } catch (error) {
        console.error("Medicine loading error:", error);

        batchMedicine.innerHTML = `
            <option value="">Unable to load medicines</option>
        `;
    }
}

// ==========================================
// LOAD BATCHES
// ==========================================

async function loadBatches() {
    try {
        stockTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="loading-state">
                    Loading stock...
                </td>
            </tr>
        `;

        const response = await getBatches();

        batches = Array.isArray(response)
            ? response
            : response?.batches || [];

        renderBatches();
    } catch (error) {
        console.error("Batch loading error:", error);

        stockTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-table">
                    Unable to load stock.
                </td>
            </tr>
        `;

        batchCount.textContent = "Unable to load stock.";
    }
}

// ==========================================
// GET MEDICINE NAME
// ==========================================

function getMedicineName(medicineId) {
    const medicine = medicines.find(function (item) {
        return Number(item.id) === Number(medicineId);
    });

    return medicine
        ? medicine.name
        : "Unknown Medicine";
}

// ==========================================
// PARSE DATE
// ==========================================

function parseDateOnly(value) {
    if (!value) {
        return null;
    }

    const dateString = String(value).substring(0, 10);
    const parts = dateString.split("-");

    if (parts.length !== 3) {
        return null;
    }

    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);

    const date = new Date(year, month - 1, day);

    if (isNaN(date.getTime())) {
        return null;
    }

    return date;
}

// ==========================================
// GET TODAY'S DATE
// ==========================================

function getTodayDateOnly() {
    const today = new Date();

    return new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
    );
}

// ==========================================
// GET BATCH STATUS
// ==========================================

function getBatchStatus(batch) {
    const quantity = Number(batch.quantity || 0);

    const threshold = Number(
        batch.low_stock_threshold ??
        batch.lowStockThreshold ??
        10
    );

    // OUT OF STOCK
    if (quantity <= 0) {
        return {
            text: "Out of Stock",
            className: "danger"
        };
    }

    // EXPIRY CHECK
    if (batch.expiry_date || batch.expiryDate) {
        const expiry = parseDateOnly(
            batch.expiry_date ?? batch.expiryDate
        );

        const today = getTodayDateOnly();

        if (expiry) {
            // EXPIRED
            if (expiry < today) {
                return {
                    text: "Expired",
                    className: "danger"
                };
            }

            const difference =
                expiry.getTime() - today.getTime();

            const days = Math.ceil(
                difference / (1000 * 60 * 60 * 24)
            );

            // EXPIRING WITHIN 30 DAYS
            if (days <= 30) {
                return {
                    text: "Expiring Soon",
                    className: "warning"
                };
            }
        }
    }

    // LOW STOCK
    if (quantity <= threshold) {
        return {
            text: "Low Stock",
            className: "warning"
        };
    }

    // NORMAL STOCK
    return {
        text: "In Stock",
        className: "success"
    };
}

// ==========================================
// FILTER BATCHES
// ==========================================

function getFilteredBatches() {
    const search = stockSearchInput.value
        .trim()
        .toLowerCase();

    const filter = stockStatusFilter.value;

    return batches.filter(function (batch) {
        const medicineName = String(
            batch.medicine_name ??
            batch.medicineName ??
            getMedicineName(
                batch.medicine_id ?? batch.medicineId
            )
        );

        const batchNumberValue = String(
            batch.batch_number ??
            batch.batchNumber ??
            ""
        );

        const matchesSearch =
            !search ||
            medicineName.toLowerCase().includes(search) ||
            batchNumberValue.toLowerCase().includes(search);

        const status = getBatchStatus(batch);

        let matchesFilter = true;

        if (filter === "in-stock") {
            matchesFilter = status.text === "In Stock";
        }

        if (filter === "low-stock") {
            matchesFilter = status.text === "Low Stock";
        }

        if (filter === "out-of-stock") {
            matchesFilter = status.text === "Out of Stock";
        }

        if (filter === "expired") {
            matchesFilter = status.text === "Expired";
        }

        if (filter === "expiring") {
            matchesFilter = status.text === "Expiring Soon";
        }

        return matchesSearch && matchesFilter;
    });
}

// ==========================================
// RENDER BATCHES
// ==========================================

function renderBatches() {
    const filtered = getFilteredBatches();

    batchCount.textContent =
        filtered.length +
        (filtered.length === 1 ? " batch" : " batches");

    if (!filtered.length) {
        stockTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-table">
                    <div class="empty-state">
                        <div class="empty-icon">📦</div>

                        <strong>
                            No stock batches found
                        </strong>

                        <span>
                            Add a batch or change your search.
                        </span>
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    stockTableBody.innerHTML = filtered
        .map(function (batch) {
            const medicineName =
                batch.medicine_name ??
                batch.medicineName ??
                getMedicineName(
                    batch.medicine_id ?? batch.medicineId
                );

            const status = getBatchStatus(batch);

            const quantity = Number(
                batch.quantity || 0
            );

            const medicineId =
                batch.medicine_id ??
                batch.medicineId ??
                "";

            const batchNo =
                batch.batch_number ??
                batch.batchNumber ??
                "";

            const purchasePrice =
                batch.purchase_price ??
                batch.purchasePrice ??
                0;

            const sellingPrice =
                batch.selling_price ??
                batch.sellingPrice ??
                0;

            const expiry =
                batch.expiry_date ??
                batch.expiryDate ??
                null;

            return `
                <tr>

                    <td>
                        <div class="medicine-name-cell">

                            <div class="medicine-mini-icon">
                                💊
                            </div>

                            <div>
                                <strong>
                                    ${escapeHTML(medicineName)}
                                </strong>

                                <span>
                                    Medicine ID #${medicineId}
                                </span>
                            </div>

                        </div>
                    </td>

                    <td>
                        <strong>
                            ${escapeHTML(batchNo || "—")}
                        </strong>
                    </td>

                    <td>
                        <strong>
                            ${quantity}
                        </strong>
                    </td>

                    <td>
                        ₹${formatCurrency(purchasePrice)}
                    </td>

                    <td>
                        <strong>
                            ₹${formatCurrency(sellingPrice)}
                        </strong>
                    </td>

                    <td>
                        ${formatDate(expiry)}
                    </td>

                    <td>
                        <span class="status-badge ${status.className}">
                            ${status.text}
                        </span>
                    </td>

                    <td>
                        <div class="action-buttons">

                            <button
                                type="button"
                                class="table-action edit"
                                onclick="editBatch(${batch.id})"
                                title="Edit"
                            >
                                ✎
                            </button>

                            <button
                                type="button"
                                class="table-action delete"
                                onclick="deleteBatchConfirm(${batch.id})"
                                title="Delete"
                            >
                                🗑
                            </button>

                        </div>
                    </td>

                </tr>
            `;
        })
        .join("");
}

// ==========================================
// OPEN ADD BATCH MODAL
// ==========================================

function openAddBatchModal() {
    batchForm.reset();

    document.getElementById("batchId").value = "";

    batchQuantity.value = 0;

    batchModalTitle.textContent = "Add Stock Batch";

    saveBatchBtn.textContent = "Save Batch";

    batchModal.classList.add("show");

    document.body.classList.add("modal-open");
}

// ==========================================
// CLOSE BATCH MODAL
// ==========================================

function closeBatchModal() {
    batchModal.classList.remove("show");

    document.body.classList.remove("modal-open");
}

// ==========================================
// EDIT BATCH
// ==========================================

window.editBatch = function (id) {
    const batch = batches.find(function (item) {
        return Number(item.id) === Number(id);
    });

    if (!batch) {
        return;
    }

    document.getElementById("batchId").value = batch.id;

    batchMedicine.value =
        batch.medicine_id ??
        batch.medicineId ??
        "";

    batchNumber.value =
        batch.batch_number ??
        batch.batchNumber ??
        "";

    batchQuantity.value =
        batch.quantity ?? 0;

    batchPurchasePrice.value =
        batch.purchase_price ??
        batch.purchasePrice ??
        0;

    batchSellingPrice.value =
        batch.selling_price ??
        batch.sellingPrice ??
        0;

    manufacturingDate.value =
        formatDateForInput(
            batch.manufacturing_date ??
            batch.manufacturingDate
        );

    expiryDate.value =
        formatDateForInput(
            batch.expiry_date ??
            batch.expiryDate
        );

    batchModalTitle.textContent = "Edit Stock Batch";

    saveBatchBtn.textContent = "Update Batch";

    batchModal.classList.add("show");

    document.body.classList.add("modal-open");
};

// ==========================================
// SAVE BATCH
// ==========================================

batchForm.addEventListener(
    "submit",
    async function (event) {
        event.preventDefault();

        const id =
            document.getElementById("batchId").value;

        const data = {
            medicine_id: Number(batchMedicine.value),

            batch_number: batchNumber.value.trim(),

            quantity: Number(
                batchQuantity.value || 0
            ),

            purchase_price: Number(
                batchPurchasePrice.value || 0
            ),

            selling_price: Number(
                batchSellingPrice.value || 0
            ),

            manufacturing_date:
                manufacturingDate.value || null,

            expiry_date:
                expiryDate.value || null
        };

        // VALIDATION
        if (!data.medicine_id) {
            showMessage(
                "Please select a medicine.",
                "error"
            );
            return;
        }

        if (!data.batch_number) {
            showMessage(
                "Please enter a batch number.",
                "error"
            );
            return;
        }

        if (data.quantity < 0) {
            showMessage(
                "Quantity cannot be negative.",
                "error"
            );
            return;
        }

        if (data.purchase_price < 0) {
            showMessage(
                "Purchase price cannot be negative.",
                "error"
            );
            return;
        }

        if (data.selling_price < 0) {
            showMessage(
                "Selling price cannot be negative.",
                "error"
            );
            return;
        }

        if (
            data.manufacturing_date &&
            data.expiry_date &&
            data.manufacturing_date >
                data.expiry_date
        ) {
            showMessage(
                "Expiry date cannot be before manufacturing date.",
                "error"
            );
            return;
        }

        saveBatchBtn.disabled = true;

        saveBatchBtn.textContent =
            id
                ? "Updating..."
                : "Saving...";

        try {
            if (id) {
                await updateBatch(id, data);

                showMessage(
                    "Batch updated successfully.",
                    "success"
                );
            } else {
                await createBatch(data);

                showMessage(
                    "Batch added successfully.",
                    "success"
                );
            }

            closeBatchModal();

            await loadBatches();

        } catch (error) {
            console.error(
                "Batch save error:",
                error
            );

            showMessage(
                error.message ||
                "Unable to save batch.",
                "error"
            );

        } finally {
            saveBatchBtn.disabled = false;

            saveBatchBtn.textContent =
                id
                    ? "Update Batch"
                    : "Save Batch";
        }
    }
);

// ==========================================
// DELETE BATCH
// ==========================================

window.deleteBatchConfirm = async function (id) {
    const batch = batches.find(function (item) {
        return Number(item.id) === Number(id);
    });

    if (!batch) {
        return;
    }

    const medicineName =
        batch.medicine_name ??
        batch.medicineName ??
        getMedicineName(
            batch.medicine_id ??
            batch.medicineId
        );

    const batchNo =
        batch.batch_number ??
        batch.batchNumber ??
        "";

    const confirmed = confirm(
        `Delete batch ${batchNo} of ${medicineName}?`
    );

    if (!confirmed) {
        return;
    }

    try {
        await deleteBatch(id);

        showMessage(
            "Batch deleted successfully.",
            "success"
        );

        await loadBatches();

    } catch (error) {
        console.error(
            "Batch delete error:",
            error
        );

        showMessage(
            error.message ||
            "Unable to delete batch.",
            "error"
        );
    }
};

// ==========================================
// SHOW MESSAGE
// ==========================================

function showMessage(message, type) {
    const element =
        document.getElementById("stockMessage");

    if (!element) {
        return;
    }

    element.textContent = message;

    element.className =
        "auth-message " + type;

    setTimeout(function () {
        element.className =
            "auth-message hidden";
    }, 3500);
}

// ==========================================
// FORMAT CURRENCY
// ==========================================

function formatCurrency(value) {
    return Number(value || 0).toLocaleString(
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

function formatDate(value) {
    if (!value) {
        return "—";
    }

    const date = parseDateOnly(value);

    if (!date) {
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
// FORMAT DATE FOR INPUT
// ==========================================

function formatDateForInput(value) {
    if (!value) {
        return "";
    }

    const dateString =
        String(value).substring(0, 10);

    if (
        /^\d{4}-\d{2}-\d{2}$/.test(dateString)
    ) {
        return dateString;
    }

    return "";
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

stockSearchInput.addEventListener(
    "input",
    renderBatches
);

// ==========================================
// STATUS FILTER
// ==========================================

stockStatusFilter.addEventListener(
    "change",
    renderBatches
);

// ==========================================
// ADD BATCH BUTTON
// ==========================================

document
    .getElementById("addBatchBtn")
    .addEventListener(
        "click",
        openAddBatchModal
    );

// ==========================================
// CLOSE MODAL BUTTON
// ==========================================

document
    .getElementById("closeBatchModalBtn")
    .addEventListener(
        "click",
        closeBatchModal
    );

// ==========================================
// CANCEL MODAL BUTTON
// ==========================================

document
    .getElementById("cancelBatchModalBtn")
    .addEventListener(
        "click",
        closeBatchModal
    );

// ==========================================
// CLOSE MODAL BY CLICKING OUTSIDE
// ==========================================

batchModal.addEventListener(
    "click",
    function (event) {
        if (event.target === batchModal) {
            closeBatchModal();
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

loadMedicines();

loadBatches();