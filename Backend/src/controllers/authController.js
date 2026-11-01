const authService = require("../services/authService");

async function login(req, res) {
    try {
        const tenDangNhap = req.body?.tenDangNhap;
        const password = req.body?.password;

        // Kiểm tra dữ liệu đầu vào
        if (
            typeof tenDangNhap !== "string" ||
            tenDangNhap.trim().length === 0 ||
            typeof password !== "string" ||
            password.length === 0
        ) {
            return res.status(400).json({
                message: "Vui lòng nhập tên đăng nhập và mật khẩu."
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
            message: "Đã xảy ra lỗi máy chủ. Vui lòng thử lại sau."
        });
    }
}

module.exports = {
    login
};
