requireAuth();


// ==========================================
// DOM ELEMENTS
// ==========================================

const vendorTableBody =
    document.getElementById("vendorTableBody");

const vendorCount =
    document.getElementById("vendorCount");

const vendorSearchInput =
    document.getElementById("vendorSearchInput");

const vendorMessage =
    document.getElementById("vendorMessage");

const addVendorBtn =
    document.getElementById("addVendorBtn");

const vendorModal =
    document.getElementById("vendorModal");

const vendorModalTitle =
    document.getElementById("vendorModalTitle");

const closeVendorModalBtn =
    document.getElementById("closeVendorModalBtn");

const cancelVendorModalBtn =
    document.getElementById("cancelVendorModalBtn");

const vendorForm =
    document.getElementById("vendorForm");

const vendorId =
    document.getElementById("vendorId");

const vendorName =
    document.getElementById("vendorName");

const vendorContact =
    document.getElementById("vendorContact");

const vendorEmail =
    document.getElementById("vendorEmail");

const vendorAddress =
    document.getElementById("vendorAddress");

const saveVendorBtn =
    document.getElementById("saveVendorBtn");


// ==========================================
// DATA
// ==========================================

let vendors = [];


// ==========================================
// LOAD USER
// ==========================================

function loadUser() {

    const user = getCurrentUser();

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
// LOAD VENDORS
// ==========================================

async function loadVendors() {

    if (vendorTableBody) {

        vendorTableBody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="loading-state">
                    Loading vendors...
                </td>
            </tr>
        `;
    }

    try {

        const response =
            await getVendors();

        /*
         * Expected response:
         *
         * {
         *     count: number,
         *     vendors: [...]
         * }
         */

        if (Array.isArray(response)) {

            vendors = response;

        } else if (
            response &&
            Array.isArray(response.vendors)
        ) {

            vendors = response.vendors;

        } else {

            vendors = [];
        }

        renderVendors(vendors);

    } catch (error) {

        console.error(
            "Vendor loading error:",
            error
        );

        if (vendorTableBody) {

            vendorTableBody.innerHTML = `
                <tr>
                    <td
                        colspan="5"
                        class="empty-table">
                        Unable to load vendors.
                    </td>
                </tr>
            `;
        }

        if (vendorCount) {

            vendorCount.textContent =
                "Unable to load vendors";
        }

        showMessage(
            error.message ||
            "Unable to load vendors.",
            "error"
        );
    }
}


// ==========================================
// RENDER VENDORS
// ==========================================

function renderVendors(vendorList) {

    if (!vendorTableBody) {
        return;
    }

    if (!vendorList.length) {

        vendorTableBody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="empty-table">

                    <div class="empty-state">

                        <div class="empty-icon">
                            🏢
                        </div>

                        <strong>
                            No vendors found
                        </strong>

                        <span>
                            Add a vendor to get started.
                        </span>

                    </div>

                </td>
            </tr>
        `;

        if (vendorCount) {

            vendorCount.textContent =
                "0 vendors";
        }

        return;
    }


    if (vendorCount) {

        vendorCount.textContent =
            `${vendorList.length} vendor${
                vendorList.length === 1
                    ? ""
                    : "s"
            }`;
    }


    vendorTableBody.innerHTML =
        vendorList.map(function (vendor) {

            return `
                <tr>

                    <!-- VENDOR -->

                    <td>
                        <strong>
                            ${escapeHTML(
                                vendor.name
                            )}
                        </strong>
                    </td>


                    <!-- CONTACT -->

                    <td>
                        ${escapeHTML(
                            vendor.contact || "-"
                        )}
                    </td>


                    <!-- EMAIL -->

                    <td>
                        ${escapeHTML(
                            vendor.email || "-"
                        )}
                    </td>


                    <!-- ADDRESS -->

                    <td>
                        ${escapeHTML(
                            vendor.address || "-"
                        )}
                    </td>


                    <!-- ACTIONS -->

                    <td>

                        <div class="table-actions">


                            <!-- VIEW LEDGER -->

                            <button
                                type="button"
                                class="table-action"
                                onclick="viewVendorLedger(${Number(vendor.id)})"
                                title="View Vendor Ledger">

                                📒

                            </button>


                            <!-- EDIT -->

                            <button
                                type="button"
                                class="table-action edit"
                                onclick="editVendor(${Number(vendor.id)})"
                                title="Edit Vendor">

                                ✏️

                            </button>


                            <!-- DELETE -->

                            <button
                                type="button"
                                class="table-action delete"
                                onclick="deleteVendor(${Number(vendor.id)})"
                                title="Delete Vendor">

                                🗑️

                            </button>


                        </div>

                    </td>

                </tr>
            `;

        }).join("");
}


// ==========================================
// VIEW VENDOR LEDGER
// ==========================================

window.viewVendorLedger =
    function (id) {

        const vendorIdNumber =
            Number(id);

        if (
            !Number.isInteger(vendorIdNumber) ||
            vendorIdNumber <= 0
        ) {

            showMessage(
                "Invalid vendor.",
                "error"
            );

            return;
        }


        /*
         * Open the ledger page.
         *
         * The vendor ID is passed through
         * the URL so ledger.js can read it:
         *
         * ledger.html?vendorId=1
         */

        window.location.href =
            `ledger.html?vendorId=${encodeURIComponent(
                vendorIdNumber
            )}`;
    };


// ==========================================
// SEARCH VENDORS
// ==========================================

function searchVendors() {

    if (!vendorSearchInput) {
        return;
    }

    const searchTerm =
        vendorSearchInput.value
            .trim()
            .toLowerCase();

    if (!searchTerm) {

        renderVendors(vendors);

        return;
    }


    const filteredVendors =
        vendors.filter(function (vendor) {

            const name =
                String(
                    vendor.name || ""
                ).toLowerCase();

            const contact =
                String(
                    vendor.contact || ""
                ).toLowerCase();

            const email =
                String(
                    vendor.email || ""
                ).toLowerCase();

            const address =
                String(
                    vendor.address || ""
                ).toLowerCase();


            return (
                name.includes(searchTerm) ||
                contact.includes(searchTerm) ||
                email.includes(searchTerm) ||
                address.includes(searchTerm)
            );

        });


    renderVendors(filteredVendors);
}


// ==========================================
// OPEN ADD VENDOR MODAL
// ==========================================

function openAddVendorModal() {

    vendorModalTitle.textContent =
        "Add Vendor";

    saveVendorBtn.textContent =
        "Save Vendor";

    vendorForm.reset();

    vendorId.value = "";

    vendorModal.classList.add("show");
}


// ==========================================
// OPEN EDIT VENDOR MODAL
// ==========================================

window.editVendor =
    function (id) {

        const vendor =
            vendors.find(function (item) {

                return Number(item.id) ===
                    Number(id);

            });


        if (!vendor) {

            showMessage(
                "Vendor not found.",
                "error"
            );

            return;
        }


        vendorModalTitle.textContent =
            "Edit Vendor";

        saveVendorBtn.textContent =
            "Update Vendor";


        vendorId.value =
            vendor.id;

        vendorName.value =
            vendor.name || "";

        vendorContact.value =
            vendor.contact || "";

        vendorEmail.value =
            vendor.email || "";

        vendorAddress.value =
            vendor.address || "";


        vendorModal.classList.add("show");
    };


// ==========================================
// CLOSE VENDOR MODAL
// ==========================================

function closeVendorModal() {

    vendorModal.classList.remove("show");

    vendorForm.reset();

    vendorId.value = "";

    saveVendorBtn.textContent =
        "Save Vendor";

    saveVendorBtn.disabled =
        false;
}


// ==========================================
// CREATE / UPDATE VENDOR
// ==========================================

async function saveVendor(event) {

    event.preventDefault();


    const name =
        vendorName.value.trim();

    const contact =
        vendorContact.value.trim();

    const email =
        vendorEmail.value.trim();

    const address =
        vendorAddress.value.trim();


    if (!name) {

        showMessage(
            "Vendor name is required.",
            "error"
        );

        return;
    }


    const vendorData = {

        name: name,

        contact:
            contact || null,

        email:
            email || null,

        address:
            address || null
    };


    const editingVendor =
        Boolean(vendorId.value);


    saveVendorBtn.disabled =
        true;

    saveVendorBtn.textContent =
        editingVendor
            ? "Updating..."
            : "Saving...";


    try {

        let response;


        // ==================================
        // UPDATE
        // ==================================

        if (editingVendor) {

            response =
                await updateVendor(
                    vendorId.value,
                    vendorData
                );


            showMessage(
                response.message ||
                "Vendor updated successfully.",
                "success"
            );
        }


        // ==================================
        // CREATE
        // ==================================

        else {

            response =
                await createVendor(
                    vendorData
                );


            showMessage(
                response.message ||
                "Vendor created successfully.",
                "success"
            );
        }


        closeVendorModal();

        await loadVendors();


    } catch (error) {

        console.error(
            "Vendor save error:",
            error
        );


        showMessage(
            error.message ||
            "Unable to save vendor.",
            "error"
        );


        saveVendorBtn.disabled =
            false;

        saveVendorBtn.textContent =
            editingVendor
                ? "Update Vendor"
                : "Save Vendor";

        return;
    }


    saveVendorBtn.disabled =
        false;

    saveVendorBtn.textContent =
        "Save Vendor";
}


// ==========================================
// DELETE VENDOR
// ==========================================

window.deleteVendor =
    async function (id) {

        const vendor =
            vendors.find(function (item) {

                return Number(item.id) ===
                    Number(id);

            });


        if (!vendor) {

            showMessage(
                "Vendor not found.",
                "error"
            );

            return;
        }


        const confirmed =
            confirm(
                `Are you sure you want to delete "${vendor.name}"?`
            );


        if (!confirmed) {
            return;
        }


        try {

            /*
             * IMPORTANT:
             *
             * The API helper should be named
             * deleteVendor in api.js.
             *
             * We call it through this local
             * reference to avoid recursively
             * calling window.deleteVendor().
             */

            const deleteVendorAPI =
                window.apiDeleteVendor ||
                window.deleteVendorAPI;


            let response;


            if (typeof deleteVendorAPI === "function") {

                response =
                    await deleteVendorAPI(id);

            } else {

                /*
                 * Fallback:
                 * Direct API request.
                 */

                const token =
                    localStorage.getItem("token");


                const fetchResponse =
                    await fetch(
                        `/api/vendors/${encodeURIComponent(id)}`,
                        {
                            method: "DELETE",

                            headers: {
                                "Authorization":
                                    "Bearer " + token,

                                "Content-Type":
                                    "application/json"
                            }
                        }
                    );


                response =
                    await fetchResponse.json();


                if (!fetchResponse.ok) {

                    throw new Error(
                        response.message ||
                        "Unable to delete vendor."
                    );
                }
            }


            showMessage(
                response?.message ||
                "Vendor deleted successfully.",
                "success"
            );


            await loadVendors();


        } catch (error) {

            console.error(
                "Vendor delete error:",
                error
            );


            showMessage(
                error.message ||
                "Unable to delete vendor.",
                "error"
            );
        }
    };


// ==========================================
// SHOW MESSAGE
// ==========================================

function showMessage(message, type) {

    if (!vendorMessage) {
        return;
    }

    vendorMessage.textContent =
        message;

    vendorMessage.className =
        `auth-message ${type}`;


    setTimeout(function () {

        vendorMessage.className =
            "auth-message hidden";

    }, 3500);
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
// ADD VENDOR BUTTON
// ==========================================

if (addVendorBtn) {

    addVendorBtn.addEventListener(
        "click",
        openAddVendorModal
    );
}


// ==========================================
// CLOSE MODAL
// ==========================================

if (closeVendorModalBtn) {

    closeVendorModalBtn.addEventListener(
        "click",
        closeVendorModal
    );
}


if (cancelVendorModalBtn) {

    cancelVendorModalBtn.addEventListener(
        "click",
        closeVendorModal
    );
}


// ==========================================
// CLICK OUTSIDE MODAL
// ==========================================

if (vendorModal) {

    vendorModal.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                vendorModal
            ) {

                closeVendorModal();
            }
        }
    );
}


// ==========================================
// FORM SUBMIT
// ==========================================

if (vendorForm) {

    vendorForm.addEventListener(
        "submit",
        saveVendor
    );
}


// ==========================================
// SEARCH
// ==========================================

if (vendorSearchInput) {

    vendorSearchInput.addEventListener(
        "input",
        searchVendors
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

loadVendors();