const express = require("express");
const publisherController = require("../controllers/publisherController");
const { authenticateToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

// Xem danh sách nhà xuất bản
router.get(
    "/",
    authenticateToken,
    allowRoles("Quản lý", "Thủ thư"),
    publisherController.findAll
);

// Xem một nhà xuất bản
router.get(
    "/:maNXB",
    authenticateToken,
    allowRoles("Quản lý", "Thủ thư"),
    publisherController.findOne
);

// Thêm nhà xuất bản
router.post(
    "/",
    authenticateToken,
    allowRoles("Quản lý"),
    publisherController.create
);

// Sửa nhà xuất bản
router.put(
    "/:maNXB",
    authenticateToken,
    allowRoles("Quản lý"),
    publisherController.update
);

// Xóa nhà xuất bản
router.delete(
    "/:maNXB",
    authenticateToken,
    allowRoles("Quản lý"),
    publisherController.remove
);

module.exports = router;