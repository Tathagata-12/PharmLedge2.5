// ==========================================
// SAVE LOGIN SESSION
// ==========================================

function saveAuth(token, user = null) {

    localStorage.setItem(
        "pharmledge_token",
        token
    );

    if (user) {
        localStorage.setItem(
            "pharmledge_user",
            JSON.stringify(user)
        );
    }
}


// ==========================================
// GET LOGGED-IN USER
// ==========================================

function getCurrentUser() {

    const user = localStorage.getItem(
        "pharmledge_user"
    );

    return user ? JSON.parse(user) : null;
}


// ==========================================
// CHECK AUTHENTICATION
// ==========================================

function isLoggedIn() {

    return !!localStorage.getItem(
        "pharmledge_token"
    );
}


// ==========================================
// LOGOUT
// ==========================================

function logout() {

    localStorage.removeItem(
        "pharmledge_token"
    );

    localStorage.removeItem(
        "pharmledge_user"
    );

    window.location.href = "login.html";
}


// ==========================================
// PROTECT PAGE
// ==========================================

function requireAuth() {

    if (!isLoggedIn()) {
        window.location.href = "login.html";
    }
}


// ==========================================
// REDIRECT IF ALREADY LOGGED IN
// ==========================================

function redirectIfLoggedIn() {

    if (isLoggedIn()) {
        window.location.href = "dashboard.html";
    }
}