const employeeService = require("../services/employeeService");

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