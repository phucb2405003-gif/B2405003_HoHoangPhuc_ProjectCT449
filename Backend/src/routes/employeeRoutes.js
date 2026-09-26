const express = require("express");
const employeeController = require("../controllers/employeeController");

const router = express.Router();

// Lấy tất cả nhân viên
router.get("/", employeeController.findAll);

// Lấy nhân viên theo mã
router.get("/:maNhanVien", employeeController.findOne);

// Thêm nhân viên
router.post("/", employeeController.create);

// Cập nhật nhân viên
router.put("/:maNhanVien", employeeController.update);

// Xóa nhân viên
router.delete("/:maNhanVien", employeeController.remove);

module.exports = router;