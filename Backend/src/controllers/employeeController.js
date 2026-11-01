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
            message: "Không thể tải danh sách nhân viên. Vui lòng thử lại sau."
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
                message: "Không tìm thấy nhân viên."
            });
        }

        res.json(employee);
    } catch (error) {
        console.error("Loi tim nhan vien:", error);

        res.status(500).json({
            message: "Không thể tải thông tin nhân viên. Vui lòng thử lại sau."
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
                    ? "Đã tạo hồ sơ nhân viên nhưng chưa xác nhận được việc tạo tài khoản. Vui lòng thử lại sau."
                    : "Đã tạo hồ sơ nhân viên nhưng chưa tạo được tài khoản. Vui lòng tạo tài khoản cho mã hồ sơ này.",
                profileCreated: true,
                accountCreated: false,
                maNhanVien: error.profileCode,
            });
        }
        if (error.code === "INVALID_CREATE") {
            return res.status(400).json({ message: "Thông tin nhân viên chưa hợp lệ. Vui lòng kiểm tra lại." });
        }
        if (error.code === "CODE_SEQUENCE_EXHAUSTED") {
            return res.status(409).json({ message: error.publicMessage });
        }
        if (error.code === "PROFILE_CODE_ALREADY_EXISTS") {
            return res.status(409).json({ message: "Mã nhân viên đã tồn tại. Vui lòng thử lại." });
        }
        console.error("Loi tao nhan vien:", error);

        res.status(500).json({
            message: "Không thể thêm nhân viên. Vui lòng thử lại sau."
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
                message: "Không tìm thấy nhân viên."
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
                message: "Thông tin cập nhật chưa hợp lệ. Vui lòng kiểm tra lại."
            });
        }
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({
                message: "Không tìm thấy nhân viên."
            });
        }

        console.error("Loi cap nhat nhan vien:", error);

        res.status(500).json({
            message: "Không thể cập nhật thông tin nhân viên. Vui lòng thử lại sau."
        });
    }
}

function publicEmployeeProfile(employee) {
    return {
        maNhanVien: employee.maNhanVien,
        hoTenNV: employee.hoTenNV,
        chucVu: employee.chucVu,
        diaChi: employee.diaChi,
        soDienThoai: employee.soDienThoai,
    };
}

function authenticatedEmployeeCode(req, res) {
    if (req.user?.loaiTaiKhoan !== "NHANVIEN" || typeof req.user.maTaiKhoan !== "string") {
        res.status(403).json({ message: "Bạn không có quyền thực hiện thao tác này." });
        return null;
    }
    return req.user.maTaiKhoan;
}

async function getMe(req, res) {
    const maNhanVien = authenticatedEmployeeCode(req, res);
    if (!maNhanVien) return;

    try {
        const employee = await employeeService.findOne(maNhanVien);
        if (!employee) return res.status(404).json({ message: "Không tìm thấy nhân viên." });
        return res.json(publicEmployeeProfile(employee));
    } catch (error) {
        console.error("Loi lay ho so nhan vien dang dang nhap:", error);
        return res.status(500).json({ message: "Không thể tải hồ sơ nhân viên. Vui lòng thử lại sau." });
    }
}

async function updateMe(req, res) {
    const maNhanVien = authenticatedEmployeeCode(req, res);
    if (!maNhanVien) return;

    try {
        const employee = await employeeService.updateMyProfile(maNhanVien, req.body);
        return res.json(publicEmployeeProfile(employee));
    } catch (error) {
        if (error.code === "INVALID_UPDATE") {
            return res.status(400).json({ message: "Thông tin cập nhật chưa hợp lệ. Vui lòng kiểm tra lại." });
        }
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({ message: "Không tìm thấy nhân viên." });
        }

        console.error("Loi cap nhat ho so nhan vien dang dang nhap:", error);
        return res.status(500).json({ message: "Không thể cập nhật hồ sơ nhân viên. Vui lòng thử lại sau." });
    }
}

module.exports = {
    findAll,
    findOne,
    create,
    update,
    getMe,
    updateMe
};
