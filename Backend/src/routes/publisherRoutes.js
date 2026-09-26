const express = require("express");
const publisherController = require("../controllers/publisherController");

const router = express.Router();

// GET /api/publishers → lấy tất cả nhà xuất bản
router.get("/", publisherController.findAll);

// GET /api/publishers/:id → lấy một nhà xuất bản
router.get("/:id", publisherController.findOne);

// POST /api/publishers → thêm nhà xuất bản
router.post("/", publisherController.create);

// PUT /api/publishers/:id → cập nhật nhà xuất bản
router.put("/:id", publisherController.update);

// DELETE /api/publishers/:id → xóa nhà xuất bản
router.delete("/:id", publisherController.remove);

module.exports = router;