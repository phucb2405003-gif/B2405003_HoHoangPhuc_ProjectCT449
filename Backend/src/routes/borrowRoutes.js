const express = require("express");
const borrowController = require("../controllers/borrowController");

const router = express.Router();

// GET /api/borrows → lấy tất cả phiếu mượn
router.get("/", borrowController.findAll);

// GET /api/borrows/:id → lấy một phiếu mượn
router.get("/:id", borrowController.findOne);

// POST /api/borrows → tạo phiếu mượn
router.post("/", borrowController.create);

// PUT /api/borrows/:id → cập nhật phiếu mượn
router.put("/:id", borrowController.update);

// DELETE /api/borrows/:id → xóa phiếu mượn
router.delete("/:id", borrowController.remove);

module.exports = router;