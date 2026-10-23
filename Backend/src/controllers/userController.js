const userService = require("../services/userService");
const accountService = require("../services/accountService");

// Lấy tất cả người dùng
async function findAll(req, res) {
    try {
        const users = await userService.findAll();

        res.json(users); // Trả danh sách người dùng
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi lấy danh sách người dùng",
        });
    }
}

// Lấy một người dùng theo ID
async function findOne(req, res) {
    try {
        const user = await userService.findOne(req.params.maDocGia);

        if (!user) {
            return res.status(404).json({
                message: "Không tìm thấy người dùng",
            });
        }

        res.json(user); // Trả thông tin người dùng
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi lấy thông tin người dùng",
        });
    }
}

// Thêm người dùng
async function create(req, res) {
    try {
        const user = await userService.create(req.body);

        res.status(201).json(user); // 201 = tạo thành công
    } catch (error) {
        if (error.code === "PROFILE_ACCOUNT_PARTIAL") {
            const causeCode = error.cause?.code;
            const lockFailure = accountService.ACCOUNT_CREATION_LOCK_ERROR_CODES.has(causeCode);
            const duplicateFailure = ["DUPLICATE_USERNAME", "ACCOUNT_ALREADY_EXISTS"].includes(causeCode);
            console.error("Tao tai khoan doc gia that bai sau khi da tao ho so:", {
                code: causeCode,
                maDocGia: error.profileCode,
            });
            return res.status(lockFailure ? 503 : duplicateFailure ? 409 : 500).json({
                message: lockFailure
                    ? "Da tao ho so doc gia nhung he thong chua xac nhan duoc viec tao tai khoan; vui long thu lai sau"
                    : "Da tao ho so doc gia nhung chua tao duoc tai khoan; hay tao tai khoan cho ma ho so nay",
                profileCreated: true,
                accountCreated: false,
                maDocGia: error.profileCode,
            });
        }
        if (error.code === "INVALID_UPDATE") {
            return res.status(400).json({ message: "Du lieu khong hop le" });
        }
        res.status(500).json({
            message: "Lỗi khi thêm người dùng",
        });
    }
}

// Cập nhật người dùng
async function update(req, res) {
    try {
        const user = await userService.update(
            req.params.maDocGia,
            req.body
        );

        res.json(user); // Trả dữ liệu sau khi cập nhật
    } catch (error) {
        if (error.code === "INVALID_UPDATE") {
            return res.status(400).json({ message: "Du lieu cap nhat khong hop le" });
        }
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({ message: "Khong tim thay doc gia" });
        }

        res.status(500).json({
            message: "Lỗi khi cập nhật người dùng",
        });
    }
}

module.exports = {
    findAll,
    findOne,
    create,
    update,
};
