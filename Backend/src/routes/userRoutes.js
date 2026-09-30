const express = require("express");
const userController = require("../controllers/userController");
const { authenticateToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

// Xem danh sách độc giả
router.get(
    "/",
    authenticateToken,
    allowRoles("Quản lý", "Thủ thư"),
    userController.findAll
);

// Xem một độc giả
router.get(
    "/:maDocGia",
    authenticateToken,
    allowRoles("Quản lý", "Thủ thư"),
    userController.findOne
);

// Thêm độc giả
router.post(
    "/",
    authenticateToken,
    allowRoles("Quản lý"),
    userController.create
);

// Sửa độc giả
router.put(
    "/:maDocGia",
    authenticateToken,
    allowRoles("Quản lý"),
    userController.update
);

// Xóa độc giả
router.delete(
    "/:maDocGia",
    authenticateToken,
    allowRoles("Quản lý"),
    userController.remove
);

module.exports = router;