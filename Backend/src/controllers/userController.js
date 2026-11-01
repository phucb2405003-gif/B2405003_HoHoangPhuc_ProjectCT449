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
                    ? "Đã tạo hồ sơ độc giả nhưng chưa xác nhận được việc tạo tài khoản. Vui lòng thử lại sau."
                    : "Đã tạo hồ sơ độc giả nhưng chưa tạo được tài khoản. Vui lòng tạo tài khoản cho mã hồ sơ này.",
                profileCreated: true,
                accountCreated: false,
                maDocGia: error.profileCode,
            });
        }
        if (error.code === "INVALID_UPDATE") {
            return res.status(400).json({ message: "Dữ liệu gửi lên chưa hợp lệ. Vui lòng kiểm tra lại." });
        }
        if (error.code === "CODE_SEQUENCE_EXHAUSTED") {
            return res.status(409).json({ message: error.publicMessage });
        }
        if (error.code === "PROFILE_CODE_ALREADY_EXISTS") {
            return res.status(409).json({ message: "Mã độc giả đã tồn tại. Vui lòng thử lại." });
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
            return res.status(400).json({ message: "Thông tin cập nhật chưa hợp lệ. Vui lòng kiểm tra lại." });
        }
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({ message: "Không tìm thấy độc giả." });
        }

        res.status(500).json({
            message: "Lỗi khi cập nhật người dùng",
        });
    }
}

async function updateReaderStatus(req, res) {
    if (
        req.body === null ||
        typeof req.body !== "object" ||
        Array.isArray(req.body) ||
        Object.getPrototypeOf(req.body) !== Object.prototype ||
        Object.keys(req.body).some((field) => !["trangThai", "lyDoHanChe"].includes(field)) ||
        !Object.hasOwn(req.body, "trangThai")
    ) {
        return res.status(400).json({ message: "Trạng thái độc giả không hợp lệ." });
    }
    try {
        const user = await userService.updateReaderStatus(req.params.maDocGia, req.body?.trangThai, req.body?.lyDoHanChe);
        return res.json(user);
    } catch (error) {
        if (error.code === "INVALID_UPDATE") {
            return res.status(400).json({ message: "Trạng thái độc giả không hợp lệ." });
        }
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({ message: "Không tìm thấy độc giả." });
        }
        return res.status(500).json({ message: "Không thể cập nhật trạng thái độc giả. Vui lòng thử lại sau." });
    }
}

// Độc giả tự cập nhật hồ sơ dựa trên danh tính do authenticateToken xác minh
async function updateMe(req, res) {
    if (!req.user) {
        return res.status(401).json({ message: "Bạn cần đăng nhập để tiếp tục." });
    }
    if (req.user.loaiTaiKhoan !== "DOCGIA") {
        return res.status(403).json({ message: "Bạn không có quyền thực hiện thao tác này." });
    }

    try {
        const user = await userService.update(req.user.maTaiKhoan, req.body);
        const responseUser = Object.fromEntries(
            ["maDocGia", "hoLot", "ten", "ngaySinh", "phai", "diaChi", "dienThoai", "trangThai", "lyDoHanChe"]
                .filter((field) => Object.hasOwn(user, field))
                .map((field) => [field, user[field]])
        );
        return res.json(responseUser);
    } catch (error) {
        if (error.code === "INVALID_UPDATE") {
            return res.status(400).json({ message: "Thông tin cập nhật chưa hợp lệ. Vui lòng kiểm tra lại." });
        }
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({ message: "Không tìm thấy độc giả." });
        }

        return res.status(500).json({ message: "Không thể cập nhật thông tin cá nhân. Vui lòng thử lại sau." });
    }
}

module.exports = {
    findAll,
    findOne,
    create,
    update,
    updateReaderStatus,
    updateMe,
};
