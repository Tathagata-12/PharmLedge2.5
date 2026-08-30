requireAuth();

// ==========================================
// DOM ELEMENTS
// ==========================================

const medicineTableBody = document.getElementById("medicineTableBody");
const medicineCount = document.getElementById("medicineCount");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");

const medicineModal = document.getElementById("medicineModal");
const medicineForm = document.getElementById("medicineForm");
const modalTitle = document.getElementById("modalTitle");
const saveMedicineBtn = document.getElementById("saveMedicineBtn");

const medicineId = document.getElementById("medicineId");
const medicineName = document.getElementById("medicineName");
const medicineCategory = document.getElementById("medicineCategory");
const manufacturer = document.getElementById("manufacturer");
const vendorId = document.getElementById("vendorId");
const purchasePrice = document.getElementById("purchasePrice");
const sellingPrice = document.getElementById("sellingPrice");
const lowStockThreshold = document.getElementById("lowStockThreshold");
const description = document.getElementById("description");

// ==========================================
// DATA
// ==========================================

let medicines = [];
let vendors = [];

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
        medicineTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="loading-state">
                    Loading medicines...
                </td>
            </tr>
        `;

        const response = await getMedicines();

        if (Array.isArray(response)) {
            medicines = response;
        } else {
            medicines = response?.medicines || [];
        }

        buildCategories();
        renderMedicines();

    } catch (error) {
        console.error("Medicine loading error:", error);

        medicineTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-table">
                    Unable to load medicines.
                </td>
            </tr>
        `;

        medicineCount.textContent = "Unable to load medicines.";
    }
}

// ==========================================
// LOAD VENDORS
// ==========================================

async function loadVendors() {
    try {
        const response = await getVendors();

        if (Array.isArray(response)) {
            vendors = response;
        } else {
            vendors = response?.vendors || [];
        }

        vendorId.innerHTML = `
            <option value="">No vendor</option>
        `;

        vendors.forEach(function (vendor) {
            const option = document.createElement("option");

            option.value = vendor.id;
            option.textContent = vendor.name;

            vendorId.appendChild(option);
        });

    } catch (error) {
        console.error("Vendor loading error:", error);

        vendorId.innerHTML = `
            <option value="">No vendor</option>
        `;
    }
}

// ==========================================
// BUILD CATEGORIES
// ==========================================

function buildCategories() {
    const categories = [
        ...new Set(
            medicines
                .map(function (medicine) {
                    return medicine.category;
                })
                .filter(Boolean)
        )
    ].sort();

    categoryFilter.innerHTML = `
        <option value="">All Categories</option>
    `;

    categories.forEach(function (category) {
        const option = document.createElement("option");

        option.value = category;
        option.textContent = category;

        categoryFilter.appendChild(option);
    });
}

// ==========================================
// FILTER MEDICINES
// ==========================================

function getFilteredMedicines() {
    const search = searchInput.value.trim().toLowerCase();
    const category = categoryFilter.value;

    return medicines.filter(function (medicine) {

        const name = medicine.name
            ? String(medicine.name).toLowerCase()
            : "";

        const manufacturerName = medicine.manufacturer
            ? String(medicine.manufacturer).toLowerCase()
            : "";

        const medicineCategoryValue = medicine.category
            ? String(medicine.category)
            : "";

        const matchesSearch =
            !search ||
            name.includes(search) ||
            manufacturerName.includes(search);

        const matchesCategory =
            !category ||
            medicineCategoryValue === category;

        return matchesSearch && matchesCategory;
    });
}

// ==========================================
// RENDER MEDICINES
// ==========================================

function renderMedicines() {
    const filtered = getFilteredMedicines();

    medicineCount.textContent =
        `${filtered.length} medicine${filtered.length === 1 ? "" : "s"}`;

    if (filtered.length === 0) {
        medicineTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-table">
                    <div class="empty-state">
                        <div class="empty-icon">
                            💊
                        </div>

                        <strong>
                            No medicines found
                        </strong>

                        <span>
                            Add a medicine or change your search.
                        </span>
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    medicineTableBody.innerHTML = filtered
        .map(function (medicine) {

            const stock = Number(
                medicine.total_stock ??
                medicine.totalStock ??
                medicine.stock ??
                0
            );

            const threshold = Number(
                medicine.low_stock_threshold ??
                medicine.lowStockThreshold ??
                10
            );

            let status = "In Stock";
            let statusClass = "success";

            if (stock <= 0) {
                status = "Out of Stock";
                statusClass = "danger";
            } else if (stock <= threshold) {
                status = "Low Stock";
                statusClass = "warning";
            }

            const medicineSellingPrice =
                medicine.selling_price ??
                medicine.sellingPrice ??
                0;

            return `
                <tr>

                    <td>
                        <div class="medicine-name-cell">

                            <div class="medicine-mini-icon">
                                💊
                            </div>

                            <div>
                                <strong>
                                    ${escapeHTML(medicine.name)}
                                </strong>

                                <span>
                                    ID #${medicine.id}
                                </span>
                            </div>

                        </div>
                    </td>

                    <td>
                        ${escapeHTML(medicine.category || "—")}
                    </td>

                    <td>
                        ${escapeHTML(medicine.manufacturer || "—")}
                    </td>

                    <td>
                        <strong>
                            ₹${formatCurrency(medicineSellingPrice)}
                        </strong>
                    </td>

                    <td>
                        <strong>
                            ${stock}
                        </strong>
                    </td>

                    <td>
                        <span class="status-badge ${statusClass}">
                            ${status}
                        </span>
                    </td>

                    <td>
                        <div class="action-buttons">

                            <button
                                class="table-action edit"
                                onclick="editMedicine(${medicine.id})"
                                title="Edit"
                                type="button"
                            >
                                ✎
                            </button>

                            <button
                                class="table-action delete"
                                onclick="deleteMedicineConfirm(${medicine.id})"
                                title="Delete"
                                type="button"
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
// OPEN ADD MODAL
// ==========================================

function openAddModal() {
    medicineForm.reset();

    medicineId.value = "";
    lowStockThreshold.value = 10;

    modalTitle.textContent = "Add Medicine";
    saveMedicineBtn.textContent = "Save Medicine";

    medicineModal.classList.add("show");
    document.body.classList.add("modal-open");
}

// ==========================================
// CLOSE MODAL
// ==========================================

function closeModal() {
    medicineModal.classList.remove("show");
    document.body.classList.remove("modal-open");
}

// ==========================================
// EDIT MEDICINE
// ==========================================

window.editMedicine = function (id) {

    const medicine = medicines.find(function (item) {
        return Number(item.id) === Number(id);
    });

    if (!medicine) {
        return;
    }

    medicineId.value = medicine.id;

    medicineName.value =
        medicine.name || "";

    medicineCategory.value =
        medicine.category || "";

    manufacturer.value =
        medicine.manufacturer || "";

    vendorId.value =
        medicine.vendor_id ??
        medicine.vendorId ??
        "";

    purchasePrice.value =
        medicine.purchase_price ??
        medicine.purchasePrice ??
        0;

    sellingPrice.value =
        medicine.selling_price ??
        medicine.sellingPrice ??
        0;

    lowStockThreshold.value =
        medicine.low_stock_threshold ??
        medicine.lowStockThreshold ??
        10;

    description.value =
        medicine.description || "";

    modalTitle.textContent = "Edit Medicine";
    saveMedicineBtn.textContent = "Update Medicine";

    medicineModal.classList.add("show");
    document.body.classList.add("modal-open");
};

// ==========================================
// SAVE MEDICINE
// ==========================================

medicineForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        const id = medicineId.value;

        const data = {
            name: medicineName.value.trim(),

            category:
                medicineCategory.value.trim(),

            manufacturer:
                manufacturer.value.trim(),

            vendor_id:
                vendorId.value
                    ? Number(vendorId.value)
                    : null,

            purchase_price:
                Number(purchasePrice.value || 0),

            selling_price:
                Number(sellingPrice.value || 0),

            low_stock_threshold:
                Number(lowStockThreshold.value || 10),

            description:
                description.value.trim()
        };

        if (!data.name) {
            showMessage(
                "Medicine name is required.",
                "error"
            );

            return;
        }

        saveMedicineBtn.disabled = true;

        saveMedicineBtn.textContent =
            id ? "Updating..." : "Saving...";

        try {

            if (id) {

                await updateMedicine(id, data);

                showMessage(
                    "Medicine updated successfully.",
                    "success"
                );

            } else {

                await createMedicine(data);

                showMessage(
                    "Medicine added successfully.",
                    "success"
                );
            }

            closeModal();

            await loadMedicines();

        } catch (error) {

            console.error(
                "Save medicine error:",
                error
            );

            showMessage(
                error.message ||
                "Unable to save medicine.",
                "error"
            );

        } finally {

            saveMedicineBtn.disabled = false;

            saveMedicineBtn.textContent =
                id
                    ? "Update Medicine"
                    : "Save Medicine";
        }
    }
);

// ==========================================
// DELETE MEDICINE
// ==========================================

window.deleteMedicineConfirm = async function (id) {

    const medicine = medicines.find(function (item) {
        return Number(item.id) === Number(id);
    });

    if (!medicine) {
        return;
    }

    const confirmed = confirm(
        `Delete "${medicine.name}"?\n\nThis may also remove its batches.`
    );

    if (!confirmed) {
        return;
    }

    try {

        await deleteMedicine(id);

        showMessage(
            "Medicine deleted successfully.",
            "success"
        );

        await loadMedicines();

    } catch (error) {

        console.error(
            "Delete medicine error:",
            error
        );

        showMessage(
            error.message ||
            "Unable to delete medicine.",
            "error"
        );
    }
};

// ==========================================
// SHOW MESSAGE
// ==========================================

function showMessage(message, type) {

    const element =
        document.getElementById("pageMessage");

    if (!element) {
        return;
    }

    element.textContent = message;

    element.className =
        `auth-message ${type}`;

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
    renderMedicines
);

// ==========================================
// CATEGORY FILTER
// ==========================================

categoryFilter.addEventListener(
    "change",
    renderMedicines
);

// ==========================================
// ADD MEDICINE BUTTON
// ==========================================

document
    .getElementById("addMedicineBtn")
    .addEventListener(
        "click",
        openAddModal
    );

// ==========================================
// CLOSE MODAL BUTTON
// ==========================================

document
    .getElementById("closeModalBtn")
    .addEventListener(
        "click",
        closeModal
    );

// ==========================================
// CANCEL BUTTON
// ==========================================

document
    .getElementById("cancelModalBtn")
    .addEventListener(
        "click",
        closeModal
    );

// ==========================================
// CLOSE MODAL OUTSIDE
// ==========================================

medicineModal.addEventListener(
    "click",
    function (event) {

        if (event.target === medicineModal) {
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
loadVendors();
loadMedicines();