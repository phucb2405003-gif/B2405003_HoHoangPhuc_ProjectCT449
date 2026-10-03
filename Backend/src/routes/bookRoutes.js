const express = require("express");
const bookController = require("../controllers/bookController");

const { authenticateToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get(
    "/",
    authenticateToken,
    bookController.findAll
);

router.get(
    "/:maSach",
    authenticateToken,
    bookController.findOne
);

router.post(
    "/",
    authenticateToken,
    allowRoles("Quản lý", "Thủ thư"),
    bookController.create
);

router.put(
    "/:maSach",
    authenticateToken,
    allowRoles("Quản lý", "Thủ thư"),
    bookController.update
);

router.put("/:maSach/add-stock", authenticateToken, allowRoles("Quản lý", "Thủ thư"), bookController.addStock);

router.put(
    "/:maSach/destroy-stock",
    authenticateToken,
    allowRoles("Quản lý", "Thủ thư"),
    bookController.destroyStock
);

router.delete(
    "/:maSach",
    authenticateToken,
    allowRoles("Quản lý", "Thủ thư"),
    bookController.remove
);
module.exports = router;
