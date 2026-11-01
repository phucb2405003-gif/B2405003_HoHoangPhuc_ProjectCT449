const accountService = require("../services/accountService");

// Lấy tất cả tài khoản
async function findAll(req, res) {
    try {
        const accounts = await accountService.findAll();

        res.json(accounts);
    } catch (error) {
        console.error("Loi lay danh sach tai khoan:", error);

        res.status(500).json({
            message: "Đã xảy ra lỗi máy chủ. Vui lòng thử lại sau."
        });
    }
}

// Lấy một tài khoản theo mã
async function findOne(req, res) {
    try {
        const { maTaiKhoan } = req.params;

        const account = await accountService.findOne(maTaiKhoan);

        if (!account) {
            return res.status(404).json({
                message: "Không tìm thấy tài khoản."
            });
        }

        res.json(account);
    } catch (error) {
        console.error("Loi tim tai khoan:", error);

        res.status(500).json({
            message: "Đã xảy ra lỗi máy chủ. Vui lòng thử lại sau."
        });
    }
}

// Tạo tài khoản
async function create(req, res) {
    try {
        const body = req.body;
        if (
            body !== null &&
            typeof body === "object" &&
            !Array.isArray(body) &&
            Object.keys(body).length === 1 &&
            Object.hasOwn(body, "maTaiKhoan")
        ) {
            const { account, initialPassword } = await accountService.createGeneratedForProfile(body.maTaiKhoan);
            return res.status(201).json({ ...account, initialPassword });
        }

        const account = accountService.validateCreatePayload(req.body);

        const existingAccount = await accountService.findOne(
            account.maTaiKhoan
        );

        if (existingAccount) {
            return res.status(409).json({
                message: "Mã tài khoản đã tồn tại."
            });
        }

        const newAccount = await accountService.create(account);

        res.status(201).json(newAccount);
    } catch (error) {
        if (accountService.ACCOUNT_CREATION_LOCK_ERROR_CODES.has(error.code)) {
            return res.status(503).json({
                message: "Hệ thống đang xử lý tạo tài khoản. Vui lòng thử lại sau.",
            });
        }
        if (error.code === "INVALID_UPDATE") {
            return res.status(400).json({ message: "Thông tin tài khoản chưa hợp lệ. Vui lòng kiểm tra lại." });
        }
        if (error.code === "INVALID_PASSWORD") {
            return res.status(400).json({
                message: error.message
            });
        }

        if (error.code === "LINKED_ENTITY_NOT_FOUND") {
            return res.status(400).json({
                message: error.message
            });
        }

        if (error.code === "DUPLICATE_USERNAME") {
            return res.status(409).json({
                message: "Tên đăng nhập đã tồn tại."
            });
        }

        if (error.code === "ACCOUNT_ALREADY_EXISTS") {
            return res.status(409).json({
                message: "Hồ sơ này đã có tài khoản."
            });
        }

        console.error("Loi tao tai khoan:", error);

        res.status(500).json({
            message: "Đã xảy ra lỗi máy chủ. Vui lòng thử lại sau."
        });
    }
}

// Cập nhật tài khoản
async function update(req, res) {
    try {
        const { maTaiKhoan } = req.params;
        const account = req.body;

        if (account && typeof account === "object" && Object.hasOwn(account, "password")) {
            accountService.validateNewPassword(account.password);
        }

        const existingAccount = await accountService.findOne(
            maTaiKhoan
        );

        if (!existingAccount) {
            return res.status(404).json({
                message: "Không tìm thấy tài khoản."
            });
        }

        const updatedAccount = await accountService.update(
            maTaiKhoan,
            account
        );

        res.json(updatedAccount);
    } catch (error) {
        if (error.code === "INVALID_UPDATE") {
            return res.status(400).json({
                message: "Thông tin cập nhật chưa hợp lệ. Vui lòng kiểm tra lại."
            });
        }

        if (error.code === "NOT_FOUND") {
            return res.status(404).json({
                message: "Không tìm thấy tài khoản."
            });
        }

        if (error.code === "INVALID_PASSWORD") {
            return res.status(400).json({
                message: error.message
            });
        }

        if (error.code === "DUPLICATE_USERNAME") {
            return res.status(409).json({
                message: "Tên đăng nhập đã tồn tại."
            });
        }

        console.error("Loi cap nhat tai khoan:", error);

        res.status(500).json({
            message: "Đã xảy ra lỗi máy chủ. Vui lòng thử lại sau."
        });
    }
}

async function changeOwnPassword(req, res) {
    try {
        const body = req.body;
        if (
            body === null ||
            typeof body !== "object" ||
            Array.isArray(body) ||
            typeof body.currentPassword !== "string" ||
            body.currentPassword.length === 0 ||
            typeof body.newPassword !== "string"
        ) {
            return res.status(400).json({ message: "Thông tin đổi mật khẩu chưa hợp lệ. Vui lòng kiểm tra lại." });
        }

        await accountService.changeOwnPassword(
            req.user.maTaiKhoan,
            body.currentPassword,
            body.newPassword
        );

        return res.json({ message: "Đổi mật khẩu thành công." });
    } catch (error) {
        if (error.code === "INVALID_PASSWORD") {
            return res.status(400).json({ message: error.message });
        }
        if (error.code === "INVALID_CURRENT_PASSWORD") {
            return res.status(400).json({ message: "Mật khẩu hiện tại không chính xác." });
        }
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({ message: "Không tìm thấy tài khoản." });
        }

        console.error("Loi doi mat khau tai khoan:", error);
        return res.status(500).json({ message: "Đã xảy ra lỗi máy chủ. Vui lòng thử lại sau." });
    }
}

module.exports = {
    findAll,
    findOne,
    create,
    update,
    changeOwnPassword
};
