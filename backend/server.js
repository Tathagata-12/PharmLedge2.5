const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const medicineRoutes = require("./routes/medicineRoutes");
const batchRoutes = require("./routes/batchRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const salesRoutes = require("./routes/salesRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const billingRoutes = require("./routes/billingRoutes");

const app = express();

const PORT = process.env.PORT || 5050;

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(cors());
app.use(express.json());

// ==========================================
// ROUTES
// ==========================================

app.use("/api/auth", authRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/billing", billingRoutes);

// ==========================================
// TEST API
// ==========================================

app.get("/", (req, res) => {
    res.json({
        message: "PharmLedge API is running 🚀"
    });
});

// ==========================================
// TEST DATABASE CONNECTION
// ==========================================

app.get("/api/db-test", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            message: "PostgreSQL connection successful ✅",
            time: result.rows[0].now
        });

    } catch (error) {
        console.error("Database connection error:", error);

        res.status(500).json({
            message: "Database connection failed ❌"
        });
    }
});

// ==========================================
// 404 HANDLER
// ==========================================

app.use((req, res) => {
    res.status(404).json({
        message: "API endpoint not found"
    });
});

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

app.use((err, req, res, next) => {
    console.error("Server error:", err);

    res.status(err.status || 500).json({
        message: err.message || "Internal server error"
    });
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
    console.log(`PharmLedge server running on port ${PORT}`);
});