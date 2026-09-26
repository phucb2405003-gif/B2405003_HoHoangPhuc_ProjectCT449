const express = require("express");
const bookController = require("../controllers/bookController");

const router = express.Router();

// GET /api/books
router.get("/", bookController.findAll);

// GET /api/books/:maSach
router.get("/:maSach", bookController.findOne);

// POST /api/books
router.post("/", bookController.create);

// PUT /api/books/:maSach
router.put("/:maSach", bookController.update);

// DELETE /api/books/:maSach
router.delete("/:maSach", bookController.remove);

module.exports = router;