const express = require("express");
const employeeController = require("../controllers/employeeController");
const { authenticateToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

function allowEmployeeSelf(req, res, next) {
    if (req.user?.loaiTaiKhoan !== "NHANVIEN") {
        return res.status(403).json({ message: "Ban khong co quyen thuc hien chuc nang nay" });
    }
    return next();
}

router.get(
    "/me",
    authenticateToken,
    allowEmployeeSelf,
    employeeController.getMe
);

router.put(
    "/me",
    authenticateToken,
    allowEmployeeSelf,
    employeeController.updateMe
);

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

module.exports = router;
