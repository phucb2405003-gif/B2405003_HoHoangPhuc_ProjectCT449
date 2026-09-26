const express = require("express");
const borrowController = require("../controllers/borrowController");
const borrowDetailController = require("../controllers/borrowDetailController");

const router = express.Router();

// GET /api/borrows
router.get("/", borrowController.findAll);

// GET /api/borrows/:maPhieu/borrow-details
// Xem tất cả sách trong phiếu mượn
router.get(
    "/:maPhieu/borrow-details",
    borrowDetailController.findByMaPhieu
);

// GET /api/borrows/:maPhieu
router.get("/:maPhieu", borrowController.findOne);

// POST /api/borrows
router.post("/", borrowController.create);

// PUT /api/borrows/:maPhieu
router.put("/:maPhieu", borrowController.update);

// DELETE /api/borrows/:maPhieu
router.delete("/:maPhieu", borrowController.remove);

module.exports = router;