const API_BASE_URL = "https://pharmledge2-5.onrender.com/api";


// ==========================================
// AUTH TOKEN
// ==========================================

function getToken() {
    return localStorage.getItem("pharmledge_token");
}


// ==========================================
// COMMON API REQUEST
// ==========================================

async function apiRequest(endpoint, options = {}) {

    const token = getToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    try {

        const response = await fetch(
            `${API_BASE_URL}${endpoint}`,
            {
                ...options,
                headers
            }
        );

        // ==========================================
        // NO CONTENT RESPONSE
        // ==========================================

        if (response.status === 204) {
            return null;
        }


        // ==========================================
        // READ JSON RESPONSE
        // ==========================================

        let data;

        try {

            data = await response.json();

        } catch (jsonError) {

            data = {};

        }


        // ==========================================
        // HANDLE API ERROR
        // ==========================================

        if (!response.ok) {

            throw new Error(
                data.message ||
                `Request failed with status ${response.status}`
            );

        }


        return data;


    } catch (error) {

        console.error(
            "API Error:",
            error
        );

        throw error;
    }
}


// ==========================================
// AUTH
// ==========================================

async function login(email, password) {

    return await apiRequest(
        "/auth/login",
        {
            method: "POST",

            body: JSON.stringify({
                email,
                password
            })
        }
    );
}


async function register(
    name,
    email,
    password
) {

    return await apiRequest(
        "/auth/register",
        {
            method: "POST",

            body: JSON.stringify({
                name,
                email,
                password
            })
        }
    );
}


// ==========================================
// MEDICINES
// ==========================================

async function getMedicines() {

    return await apiRequest(
        "/medicines"
    );
}


async function getMedicine(id) {

    return await apiRequest(
        `/medicines/${id}`
    );
}


async function createMedicine(data) {

    return await apiRequest(
        "/medicines",
        {
            method: "POST",

            body: JSON.stringify(data)
        }
    );
}


async function updateMedicine(
    id,
    data
) {

    return await apiRequest(
        `/medicines/${id}`,
        {
            method: "PUT",

            body: JSON.stringify(data)
        }
    );
}


async function deleteMedicine(id) {

    return await apiRequest(
        `/medicines/${id}`,
        {
            method: "DELETE"
        }
    );
}


// ==========================================
// BATCHES / STOCK
// ==========================================

async function getBatches() {

    return await apiRequest(
        "/batches"
    );
}


async function createBatch(data) {

    return await apiRequest(
        "/batches",
        {
            method: "POST",

            body: JSON.stringify(data)
        }
    );
}


async function updateBatch(
    id,
    data
) {

    return await apiRequest(
        `/batches/${id}`,
        {
            method: "PUT",

            body: JSON.stringify(data)
        }
    );
}


async function deleteBatch(id) {

    return await apiRequest(
        `/batches/${id}`,
        {
            method: "DELETE"
        }
    );
}


// ==========================================
// BILLING BATCHES
// ==========================================

async function getMedicineBatches(
    medicineId
) {

    return await apiRequest(
        `/billing/medicines/${medicineId}/batches`
    );
}


// ==========================================
// VENDORS
// ==========================================

async function getVendors() {

    return await apiRequest(
        "/vendors"
    );
}


async function getVendor(id) {

    return await apiRequest(
        `/vendors/${id}`
    );
}


async function createVendor(data) {

    return await apiRequest(
        "/vendors",
        {
            method: "POST",

            body: JSON.stringify(data)
        }
    );
}


async function updateVendor(
    id,
    data
) {

    return await apiRequest(
        `/vendors/${id}`,
        {
            method: "PUT",

            body: JSON.stringify(data)
        }
    );
}


async function deleteVendor(id) {

    return await apiRequest(
        `/vendors/${id}`,
        {
            method: "DELETE"
        }
    );
}


// ==========================================
// VENDOR LEDGER
// ==========================================

// GET COMPLETE VENDOR LEDGER
// GET /api/ledger/vendor/:vendorId

async function getVendorLedger(
    vendorId
) {

    return await apiRequest(
        `/ledger/vendor/${vendorId}`
    );
}


// ==========================================
// GET VENDOR BALANCE
// GET /api/ledger/vendor/:vendorId/balance
// ==========================================

async function getVendorBalance(
    vendorId
) {

    return await apiRequest(
        `/ledger/vendor/${vendorId}/balance`
    );
}


// ==========================================
// ADD PAYMENT TO VENDOR
// POST /api/ledger/vendor/:vendorId/payment
// ==========================================

async function addVendorPayment(
    vendorId,
    data
) {

    return await apiRequest(
        `/ledger/vendor/${vendorId}/payment`,
        {
            method: "POST",

            body: JSON.stringify(data)
        }
    );
}


// ==========================================
// SALES / BILLING
// ==========================================

async function createSale(data) {

    return await apiRequest(
        "/sales",
        {
            method: "POST",

            body: JSON.stringify(data)
        }
    );
}


async function getSales() {

    return await apiRequest(
        "/sales"
    );
}


async function getSale(id) {

    return await apiRequest(
        `/sales/${id}`
    );
}


// ==========================================
// BILLING MEDICINES
// ==========================================

async function getBillingMedicines() {

    return await apiRequest(
        "/billing/medicines"
    );
}


// ==========================================
// DASHBOARD
// ==========================================

async function getDashboard() {

    return await apiRequest(
        "/dashboard"
    );
}