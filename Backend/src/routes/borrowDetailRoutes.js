const express = require("express");
const borrowDetailController = require("../controllers/borrowDetailController");

const router = express.Router();

// Lấy tất cả chi tiết
router.get("/", borrowDetailController.findAll);

// Thêm chi tiết
router.post("/", borrowDetailController.create);

// Cập nhật theo mã phiếu + mã sách
router.put(
    "/:maPhieu/:maSach",
    borrowDetailController.update
);

// Xóa theo mã phiếu + mã sách
router.delete(
    "/:maPhieu/:maSach",
    borrowDetailController.remove
);

module.exports = router;