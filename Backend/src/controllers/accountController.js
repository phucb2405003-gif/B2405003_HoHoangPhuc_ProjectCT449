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
        const account = req.body;

        const existingAccount = await accountService.findOne(
            account.maTaiKhoan
        );

        if (existingAccount) {
            return res.status(400).json({
                message: "Ma tai khoan da ton tai"
            });
        }

        const newAccount = await accountService.create(account);

        res.status(201).json(newAccount);
    } catch (error) {
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

// Xóa tài khoản
async function remove(req, res) {
    try {
        const { maTaiKhoan } = req.params;

        const existingAccount = await accountService.findOne(
            maTaiKhoan
        );

        if (!existingAccount) {
            return res.status(404).json({
                message: "Khong tim thay tai khoan"
            });
        }

        await accountService.remove(maTaiKhoan);

        res.json({
            message: "Xoa tai khoan thanh cong"
        });
    } catch (error) {
        console.error("Loi xoa tai khoan:", error);

        res.status(500).json({
            message: "Loi server"
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
