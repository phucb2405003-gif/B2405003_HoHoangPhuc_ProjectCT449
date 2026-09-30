const express = require("express");
const borrowDetailController = require("../controllers/borrowDetailController");
const { authenticateToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

// Xem tất cả chi tiết phiếu mượn
router.get(
    "/",
    authenticateToken,
    allowRoles("Quản lý", "Thủ thư"),
    borrowDetailController.findAll
);

// Xem chi tiết sách trong một phiếu
router.get(
    "/:maPhieu",
    authenticateToken,
    allowRoles("Quản lý", "Thủ thư"),
    borrowDetailController.findByMaPhieu
);

// Thêm sách vào phiếu
router.post(
    "/",
    authenticateToken,
    allowRoles("Quản lý", "Thủ thư"),
    borrowDetailController.create
);

// Cập nhật chi tiết phiếu
router.put(
    "/:maPhieu/:maSach",
    authenticateToken,
    allowRoles("Quản lý", "Thủ thư"),
    borrowDetailController.update
);

// Xóa sách khỏi phiếu
router.delete(
    "/:maPhieu/:maSach",
    authenticateToken,
    allowRoles("Quản lý", "Thủ thư"),
    borrowDetailController.remove
);

module.exports = router;