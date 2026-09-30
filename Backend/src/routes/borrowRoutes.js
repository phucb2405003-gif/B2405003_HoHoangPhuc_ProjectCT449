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

// QL + Thủ thư xem chi tiết sách trong phiếu
router.get(
    "/:maPhieu/borrow-details",
    authenticateToken,
    (req, res, next) => {
        // QL và Thủ thư được xem
        if (
            req.user.chucVu === "Quản lý" ||
            req.user.chucVu === "Thủ thư"
        ) {
            return next();
        }

        // Độc giả chỉ được xem phiếu của mình
        return allowOwnBorrow(req, res, next);
    },
    borrowDetailController.findByMaPhieu
);

// QL + Thủ thư xem phiếu, Độc giả chỉ xem phiếu của mình
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

// Chỉ QL + Thủ thư được tạo
router.post(
    "/",
    authenticateToken,
    allowRoles("Quản lý", "Thủ thư"),
    borrowController.create
);

// Chỉ QL + Thủ thư được cập nhật
router.put(
    "/:maPhieu",
    authenticateToken,
    allowRoles("Quản lý", "Thủ thư"),
    borrowController.update
);

// Chỉ QL + Thủ thư được xóa
router.delete(
    "/:maPhieu",
    authenticateToken,
    allowRoles("Quản lý", "Thủ thư"),
    borrowController.remove
);

module.exports = router;