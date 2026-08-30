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

    vendorTableBody.innerHTML = `
        <tr>
            <td
                colspan="5"
                class="loading-state">
                Loading vendors...
            </td>
        </tr>
    `;

    try {

        const response =
            await getVendors();


        /*
         * Controller response:
         *
         * {
         *     count: number,
         *     vendors: [...]
         * }
         */

        vendors =
            Array.isArray(response)
                ? response
                : response.vendors || [];


        renderVendors(vendors);

    } catch (error) {

        console.error(
            "Vendor loading error:",
            error
        );


        vendorTableBody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="empty-table">
                    Unable to load vendors.
                </td>
            </tr>
        `;


        vendorCount.textContent =
            "Unable to load vendors";


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


        vendorCount.textContent =
            "0 vendors";

        return;
    }


    vendorCount.textContent =
        `${vendorList.length} vendor${
            vendorList.length === 1
                ? ""
                : "s"
        }`;


    vendorTableBody.innerHTML =
        vendorList.map(function (vendor) {

            return `
                <tr>

                    <td>
                        <strong>
                            ${escapeHTML(
                                vendor.name
                            )}
                        </strong>
                    </td>


                    <td>
                        ${escapeHTML(
                            vendor.contact || "-"
                        )}
                    </td>


                    <td>
                        ${escapeHTML(
                            vendor.email || "-"
                        )}
                    </td>


                    <td>
                        ${escapeHTML(
                            vendor.address || "-"
                        )}
                    </td>


                    <td>

                        <div class="table-actions">

                            <button
                                type="button"
                                class="table-action edit"
                                onclick="editVendor(${vendor.id})"
                                title="Edit">

                                ✏️

                            </button>


                            <button
                                type="button"
                                class="table-action delete"
                                onclick="deleteVendor(${vendor.id})"
                                title="Delete">

                                🗑️

                            </button>

                        </div>

                    </td>

                </tr>
            `;

        }).join("");
}


// ==========================================
// SEARCH VENDORS
// ==========================================

function searchVendors() {

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
// OPEN ADD MODAL
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
// OPEN EDIT MODAL
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
// CLOSE MODAL
// ==========================================

function closeVendorModal() {

    vendorModal.classList.remove("show");

    vendorForm.reset();

    vendorId.value = "";
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


    saveVendorBtn.disabled = true;

    saveVendorBtn.textContent =
        vendorId.value
            ? "Updating..."
            : "Saving...";


    try {

        let response;


        // ==================================
        // UPDATE
        // ==================================

        if (vendorId.value) {

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


    } finally {

        saveVendorBtn.disabled = false;

        saveVendorBtn.textContent =
            vendorId.value
                ? "Update Vendor"
                : "Save Vendor";
    }
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

            const response =
                await deleteVendor(id);


            showMessage(
                response.message ||
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

addVendorBtn.addEventListener(
    "click",
    openAddVendorModal
);


// ==========================================
// CLOSE MODAL
// ==========================================

closeVendorModalBtn.addEventListener(
    "click",
    closeVendorModal
);


cancelVendorModalBtn.addEventListener(
    "click",
    closeVendorModal
);


// ==========================================
// CLICK OUTSIDE MODAL
// ==========================================

vendorModal.addEventListener(
    "click",
    function (event) {

        if (event.target === vendorModal) {

            closeVendorModal();
        }
    }
);


// ==========================================
// FORM SUBMIT
// ==========================================

vendorForm.addEventListener(
    "submit",
    saveVendor
);


// ==========================================
// SEARCH
// ==========================================

vendorSearchInput.addEventListener(
    "input",
    searchVendors
);


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


// ==========================================
// INITIALIZE
// ==========================================

loadUser();

loadVendors();