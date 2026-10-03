const express = require("express");
const employeeController = require("../controllers/employeeController");
const { authenticateToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get(
    "/",
    authenticateToken,
    allowRoles("Quản lý"),
    employeeController.findAll
);

router.get(
    "/:maNhanVien",
    authenticateToken,
    allowRoles("Quản lý"),
    employeeController.findOne
);

router.post(
    "/",
    authenticateToken,
    allowRoles("Quản lý"),
    employeeController.create
);

router.put(
    "/:maNhanVien",
    authenticateToken,
    allowRoles("Quản lý"),
    employeeController.update
);

router.delete(
    "/:maNhanVien",
    authenticateToken,
    allowRoles("Quản lý"),
    employeeController.remove
);

module.exports = router;
