const express = require("express");
const borrowController = require("../controllers/borrowController");
const borrowDetailController = require("../controllers/borrowDetailController");
const { authenticateToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

// Xem tất cả phiếu mượn
router.get(
    "/",
    authenticateToken,
    allowRoles("Quản lý", "Thủ thư"),
    borrowController.findAll
);

// Xem chi tiết các sách trong một phiếu
router.get(
    "/:maPhieu/borrow-details",
    authenticateToken,
    allowRoles("Quản lý", "Thủ thư"),
    borrowDetailController.findByMaPhieu
);

// Xem một phiếu
router.get(
    "/:maPhieu",
    authenticateToken,
    allowRoles("Quản lý", "Thủ thư"),
    borrowController.findOne
);

// Tạo phiếu mượn
router.post(
    "/",
    authenticateToken,
    allowRoles("Quản lý", "Thủ thư"),
    borrowController.create
);

// Cập nhật phiếu mượn
router.put(
    "/:maPhieu",
    authenticateToken,
    allowRoles("Quản lý", "Thủ thư"),
    borrowController.update
);

// Xóa phiếu - chỉ Quản lý
router.delete(
    "/:maPhieu",
    authenticateToken,
    allowRoles("Quản lý", "Thủ thư"),
    borrowController.remove
);

module.exports = router;