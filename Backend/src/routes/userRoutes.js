const express = require("express");
const userController = require("../controllers/userController");

const router = express.Router();

// GET /api/users → lấy tất cả người dùng
router.get("/", userController.findAll);

// GET /api/users/:id → lấy một người dùng
router.get("/:id", userController.findOne);

// POST /api/users → thêm người dùng
router.post("/", userController.create);

// PUT /api/users/:id → cập nhật người dùng
router.put("/:id", userController.update);

// DELETE /api/users/:id → xóa người dùng
router.delete("/:id", userController.remove);

module.exports = router;