const accountService = require("../services/accountService");

// Lấy tất cả tài khoản
async function findAll(req, res) {
    try {
        const accounts = await accountService.findAll();

        res.json(accounts);
    } catch (error) {
        console.error("Loi lay danh sach tai khoan:", error);

        res.status(500).json({
            message: "Loi server"
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
                message: "Khong tim thay tai khoan"
            });
        }

        res.json(account);
    } catch (error) {
        console.error("Loi tim tai khoan:", error);

        res.status(500).json({
            message: "Loi server"
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
                message: "Ma tai khoan da ton tai"
            });
        }

        const newAccount = await accountService.create(account);

        res.status(201).json(newAccount);
    } catch (error) {
        if (accountService.ACCOUNT_CREATION_LOCK_ERROR_CODES.has(error.code)) {
            return res.status(503).json({
                message: "He thong dang xu ly tao tai khoan; vui long thu lai sau",
            });
        }
        if (error.code === "INVALID_UPDATE") {
            return res.status(400).json({ message: "Du lieu tao tai khoan khong hop le" });
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
                message: "Ten dang nhap da ton tai"
            });
        }

        if (error.code === "ACCOUNT_ALREADY_EXISTS") {
            return res.status(409).json({
                message: "Tai khoan da ton tai cho ho so nay"
            });
        }

        console.error("Loi tao tai khoan:", error);

        res.status(500).json({
            message: "Loi server"
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
                message: "Khong tim thay tai khoan"
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
                message: "Du lieu cap nhat khong hop le"
            });
        }

        if (error.code === "NOT_FOUND") {
            return res.status(404).json({
                message: "Khong tim thay tai khoan"
            });
        }

        if (error.code === "INVALID_PASSWORD") {
            return res.status(400).json({
                message: error.message
            });
        }

        if (error.code === "DUPLICATE_USERNAME") {
            return res.status(409).json({
                message: "Ten dang nhap da ton tai"
            });
        }

        console.error("Loi cap nhat tai khoan:", error);

        res.status(500).json({
            message: "Loi server"
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
            return res.status(400).json({ message: "Du lieu doi mat khau khong hop le" });
        }

        await accountService.changeOwnPassword(
            req.user.maTaiKhoan,
            body.currentPassword,
            body.newPassword
        );

        return res.json({ message: "Doi mat khau thanh cong" });
    } catch (error) {
        if (error.code === "INVALID_PASSWORD") {
            return res.status(400).json({ message: error.message });
        }
        if (error.code === "INVALID_CURRENT_PASSWORD") {
            return res.status(400).json({ message: "Mat khau hien tai khong dung" });
        }
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({ message: "Khong tim thay tai khoan" });
        }

        console.error("Loi doi mat khau tai khoan:", error);
        return res.status(500).json({ message: "Loi server" });
    }
}

module.exports = {
    findAll,
    findOne,
    create,
    update,
    changeOwnPassword
};
