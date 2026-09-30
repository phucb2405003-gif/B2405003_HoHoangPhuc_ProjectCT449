const express = require("express");
const accountController = require("../controllers/accountController");
const { authenticateToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get(
    "/",
    authenticateToken,
    allowRoles("Quản trị viên"),
    accountController.findAll
);

router.get(
    "/:maTaiKhoan",
    authenticateToken,
    allowRoles("Quản trị viên"),
    accountController.findOne
);

router.post(
    "/",
    authenticateToken,
    allowRoles("Quản trị viên"),
    accountController.create
);

router.put(
    "/:maTaiKhoan",
    authenticateToken,
    allowRoles("Quản trị viên"),
    accountController.update
);

router.delete(
    "/:maTaiKhoan",
    authenticateToken,
    allowRoles("Quản trị viên"),
    accountController.remove
);

module.exports = router;