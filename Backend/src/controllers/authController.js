const authService = require("../services/authService");

async function login(req, res) {
    try {
        const { tenDangNhap, password } = req.body;

        // Kiểm tra dữ liệu đầu vào
        if (!tenDangNhap || !password) {
            return res.status(400).json({
                message: "Vui long nhap ten dang nhap va mat khau"
            });
        }

        const result = await authService.login(
            tenDangNhap,
            password
        );

        // Đăng nhập thất bại
        if (!result.success) {
            return res.status(401).json({
                message: result.message
            });
        }

        // Đăng nhập thành công
        res.json(result);
    } catch (error) {
        console.error("Loi dang nhap:", error);

        res.status(500).json({
            message: "Loi server"
        });
    }
}

module.exports = {
    login
};