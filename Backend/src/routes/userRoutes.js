const express = require("express");
const userController = require("../controllers/userController");
const { authenticateToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");
const { allowOwnReader } = require("../middlewares/readerMiddleware");

const router = express.Router();

function allowReader(req, res, next) {
    if (req.user?.loaiTaiKhoan !== "DOCGIA") {
        return res.status(403).json({
            message: "Ban khong co quyen thuc hien chuc nang nay"
        });
    }
    return next();
}

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

// Độc giả chỉ được cập nhật hồ sơ của tài khoản đang đăng nhập
router.put(
    "/me",
    authenticateToken,
    allowReader,
    userController.updateMe
);

// Chỉ Quản lý được sửa
router.put(
    "/:maDocGia",
    authenticateToken,
    allowRoles("Quản lý"),
    userController.update
);

module.exports = router;
