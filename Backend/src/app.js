const express = require("express");
const cors = require("cors");

const bookRoutes = require("./routes/bookRoutes"); // Route quản lý sách
const userRoutes = require("./routes/userRoutes");
const publisherRoutes = require("./routes/publisherRoutes"); // Route nhà xuất bản
const borrowRoutes = require("./routes/borrowRoutes"); // Route mượn sách
const borrowDetailRoutes = require("./routes/borrowDetailRoutes"); // Route chi tiết mượn
const employeeRoutes = require("./routes/employeeRoutes");
const accountRoutes = require("./routes/accountRoutes");
const authRoutes = require("./routes/authRoutes");

const { authenticateToken } = require("./middlewares/authMiddleware");
const { allowRoles } = require("./middlewares/roleMiddleware");

const app = express();

app.use(cors());
app.use(express.json());

// Route chính
app.get("/", (req, res) => {
    res.json({ message: "Chao mung toi Web dang ky muon sach" });
});

// API sách
app.use("/api/books", bookRoutes); // Các API bắt đầu bằng /api/books

app.use("/api/users", userRoutes);

app.use("/api/publishers", publisherRoutes); // API nhà xuất bản

app.use("/api/borrows", borrowRoutes); // API mượn sách

app.use("/api/borrow-details", borrowDetailRoutes); // API chi tiết mượn

app.use("/api/employees", employeeRoutes);

app.use("/api/accounts", accountRoutes);

app.use("/api/auth", authRoutes);

app.get("/api/auth/me", authenticateToken, (req, res) => {
    res.json({
        message: "Xac thuc thanh cong",
        user: req.user
    });
});

app.get(
    "/api/auth/test-manager",
    authenticateToken,
    allowRoles("Quản lý"),
    (req, res) => {
        res.json({
            message: "Ban co quyen Quan ly",
            user: req.user
        });
    }
);

module.exports = app;
