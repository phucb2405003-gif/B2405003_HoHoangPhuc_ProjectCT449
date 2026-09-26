const express = require("express");
const cors = require("cors");

const bookRoutes = require("./routes/bookRoutes"); // Route quản lý sách
const userRoutes = require("./routes/userRoutes");
const publisherRoutes = require("./routes/publisherRoutes"); // Route nhà xuất bản

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

module.exports = app;