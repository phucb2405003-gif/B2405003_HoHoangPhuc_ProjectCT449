const express = require("express");
const bookController = require("../controllers/bookController");

const router = express.Router();

// GET /api/books → lấy tất cả sách
router.get("/", bookController.findAll);

// GET /api/books/:id → lấy 1 sách
router.get("/:id", bookController.findOne);

// POST /api/books → thêm sách
router.post("/", bookController.create);

// PUT /api/books/:id → cập nhật sách
router.put("/:id", bookController.update);

// DELETE /api/books/:id → xóa sách
router.delete("/:id", bookController.remove);

module.exports = router;