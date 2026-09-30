const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
    // Lấy token từ Header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            message: "Chua dang nhap"
        });
    }

    // Dạng: Bearer <token>
    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "Token khong hop le"
        });
    }

    try {
        // Kiểm tra token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Lưu thông tin người đăng nhập vào request
        req.user = decoded;

        next();
    } catch (error) {
        return res.status(401).json({
            message: "Token khong hop le hoac da het han"
        });
    }
}

module.exports = {
    authenticateToken
};