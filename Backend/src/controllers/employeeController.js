const employeeService = require("../services/employeeService");
const accountService = require("../services/accountService");

// Lấy tất cả nhân viên
async function findAll(req, res) {
    try {
        const employees = await employeeService.findAll();

        res.json(employees);
    } catch (error) {
        console.error("Loi lay danh sach nhan vien:", error);

        res.status(500).json({
            message: "Khong the lay danh sach nhan vien"
        });
    }
}

// Lấy một nhân viên
async function findOne(req, res) {
    try {
        const { maNhanVien } = req.params;

        const employee =
            await employeeService.findOne(maNhanVien);

        if (!employee) {
            return res.status(404).json({
                message: "Khong tim thay nhan vien"
            });
        }

        res.json(employee);
    } catch (error) {
        console.error("Loi tim nhan vien:", error);

        res.status(500).json({
            message: "Khong the tim nhan vien"
        });
    }
}

// Thêm nhân viên
async function create(req, res) {
    try {
        const employee = req.body;

        const newEmployee =
            await employeeService.create(employee);

        res.status(201).json(newEmployee);
    } catch (error) {
        if (error.code === "PROFILE_ACCOUNT_PARTIAL") {
            const causeCode = error.cause?.code;
            const lockFailure = accountService.ACCOUNT_CREATION_LOCK_ERROR_CODES.has(causeCode);
            const duplicateFailure = ["DUPLICATE_USERNAME", "ACCOUNT_ALREADY_EXISTS"].includes(causeCode);
            console.error("Tao tai khoan nhan vien that bai sau khi da tao ho so:", {
                code: causeCode,
                maNhanVien: error.profileCode,
            });
            return res.status(lockFailure ? 503 : duplicateFailure ? 409 : 500).json({
                message: lockFailure
                    ? "Da tao ho so nhan vien nhung he thong chua xac nhan duoc viec tao tai khoan; vui long thu lai sau"
                    : "Da tao ho so nhan vien nhung chua tao duoc tai khoan; hay tao tai khoan cho ma ho so nay",
                profileCreated: true,
                accountCreated: false,
                maNhanVien: error.profileCode,
            });
        }
        if (error.code === "INVALID_CREATE") {
            return res.status(400).json({ message: "Du lieu tao nhan vien khong hop le" });
        }
        console.error("Loi tao nhan vien:", error);

        res.status(500).json({
            message: "Khong the tao nhan vien"
        });
    }
}

// Cập nhật nhân viên
async function update(req, res) {
    try {
        const { maNhanVien } = req.params;
        const employee = req.body;

        const oldEmployee =
            await employeeService.findOne(maNhanVien);

        if (!oldEmployee) {
            return res.status(404).json({
                message: "Khong tim thay nhan vien"
            });
        }

        const updatedEmployee =
            await employeeService.update(
                maNhanVien,
                employee
            );

        res.json(updatedEmployee);
    } catch (error) {
        if (error.code === "INVALID_UPDATE") {
            return res.status(400).json({
                message: "Du lieu cap nhat khong hop le"
            });
        }
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({
                message: "Khong tim thay nhan vien"
            });
        }

        console.error("Loi cap nhat nhan vien:", error);

        res.status(500).json({
            message: "Khong the cap nhat nhan vien"
        });
    }
}

// Xóa nhân viên
async function remove(req, res) {
    try {
        const { maNhanVien } = req.params;

        const oldEmployee =
            await employeeService.findOne(maNhanVien);

        if (!oldEmployee) {
            return res.status(404).json({
                message: "Khong tim thay nhan vien"
            });
        }

        await employeeService.remove(maNhanVien);

        res.json({
            message: "Xoa nhan vien thanh cong"
        });
    } catch (error) {
        console.error("Loi xoa nhan vien:", error);

        res.status(500).json({
            message: "Khong the xoa nhan vien"
        });
    }
}

module.exports = {
    findAll,
    findOne,
    create,
    update,
    remove
};
