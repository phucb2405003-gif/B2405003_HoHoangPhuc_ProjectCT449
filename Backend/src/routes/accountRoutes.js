const express = require("express");
const accountController = require("../controllers/accountController");
const { authenticateToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get(
    "/",
    authenticateToken,
    allowRoles("Quản lý"),
    accountController.findAll
);

router.get(
    "/:maTaiKhoan",
    authenticateToken,
    allowRoles("Quản lý"),
    accountController.findOne
);

router.post(
    "/",
    authenticateToken,
    allowRoles("Quản lý"),
    accountController.create
);

router.put(
    "/me/password",
    authenticateToken,
    accountController.changeOwnPassword
);

router.put(
    "/:maTaiKhoan",
    authenticateToken,
    allowRoles("Quản lý"),
    accountController.update
);

module.exports = router;
