const express = require("express");
const userController = require("../controllers/userController");
const { authenticateToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");
const { allowOwnReader } = require("../middlewares/readerMiddleware");

const router = express.Router();

// Quản lý xem tất cả độc giả
router.get(
    "/",
    authenticateToken,
    allowRoles("Quản lý", "Thủ thư"),
    userController.findAll
);

// Quản lý + Thủ thư xem chi tiết độc giả
router.get(
    "/:maDocGia",
    authenticateToken,
    (req, res, next) => {
        // Quản lý và Thủ thư được xem
        if (
            req.user.chucVu === "Quản lý" ||
            req.user.chucVu === "Thủ thư"
        ) {
            return next();
        }

        // Độc giả chỉ được xem chính mình
        return allowOwnReader(req, res, next);
    },
    userController.findOne
);

// Chỉ Quản lý được thêm
router.post(
    "/",
    authenticateToken,
    allowRoles("Quản lý"),
    userController.create
);

// Chỉ Quản lý được sửa
router.put(
    "/:maDocGia",
    authenticateToken,
    allowRoles("Quản lý"),
    userController.update
);

// Chỉ Quản lý được xóa
router.delete(
    "/:maDocGia",
    authenticateToken,
    allowRoles("Quản lý"),
    userController.remove
);

module.exports = router;