const express = require("express");
const borrowController = require("../controllers/borrowController");
const borrowDetailController = require("../controllers/borrowDetailController");
const { authenticateToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");
const { allowOwnBorrow } = require("../middlewares/borrowReaderMiddleware");

const router = express.Router();

// QL + Thủ thư xem tất cả phiếu
router.get(
    "/",
    authenticateToken,
    allowRoles("Quản lý", "Thủ thư"),
    borrowController.findAll
);

// Xem chi tiết sách trong phiếu
router.get(
    "/:maPhieu/borrow-details",
    authenticateToken,
    (req, res, next) => {
        if (
            req.user.chucVu === "Quản lý" ||
            req.user.chucVu === "Thủ thư"
        ) {
            return next();
        }

        return allowOwnBorrow(req, res, next);
    },
    borrowDetailController.findByMaPhieu
);

// Xem một phiếu
router.get(
    "/:maPhieu",
    authenticateToken,
    (req, res, next) => {
        if (
            req.user.chucVu === "Quản lý" ||
            req.user.chucVu === "Thủ thư"
        ) {
            return next();
        }

        return allowOwnBorrow(req, res, next);
    },
    borrowController.findOne
);

// Độc giả tạo yêu cầu mượn
router.post(
    "/",
    authenticateToken,
    borrowController.create
);

// Duyệt yêu cầu
router.put(
    "/:maPhieu/approve",
    authenticateToken,
    allowRoles("Quản lý", "Thủ thư"),
    borrowController.approve
);

// Từ chối yêu cầu
router.put(
    "/:maPhieu/reject",
    authenticateToken,
    allowRoles("Quản lý", "Thủ thư"),
    borrowController.reject
);

// Xác nhận trả sách
router.put(
    "/:maPhieu/return",
    authenticateToken,
    allowRoles("Quản lý", "Thủ thư"),
    borrowController.returnBook
);

// Cập nhật phiếu - QL + Thủ thư
router.put(
    "/:maPhieu",
    authenticateToken,
    allowRoles("Quản lý", "Thủ thư"),
    borrowController.update
);

// Xóa phiếu - QL + Thủ thư
router.delete(
    "/:maPhieu",
    authenticateToken,
    allowRoles("Quản lý", "Thủ thư"),
    borrowController.remove
);

module.exports = router;