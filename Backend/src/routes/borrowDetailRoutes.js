const express = require("express");
const borrowDetailController = require("../controllers/borrowDetailController");

const router = express.Router();

// GET /api/borrow-details → lấy tất cả chi tiết mượn
router.get("/", borrowDetailController.findAll);

// GET /api/borrow-details/:id → lấy một chi tiết
router.get("/:id", borrowDetailController.findOne);

// POST /api/borrow-details → thêm chi tiết mượn
router.post("/", borrowDetailController.create);

// PUT /api/borrow-details/:id → cập nhật chi tiết
router.put("/:id", borrowDetailController.update);

// DELETE /api/borrow-details/:id → xóa chi tiết
router.delete("/:id", borrowDetailController.remove);

module.exports = router;