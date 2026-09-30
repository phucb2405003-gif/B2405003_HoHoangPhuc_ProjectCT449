function allowRoles(...allowedRoles) {
    return (req, res, next) => {
        // Kiểm tra đã đăng nhập chưa
        if (!req.user) {
            return res.status(401).json({
                message: "Chua dang nhap"
            });
        }

        // Kiểm tra chức vụ có được phép không
        if (!allowedRoles.includes(req.user.chucVu)) {
            return res.status(403).json({
                message: "Ban khong co quyen thuc hien chuc nang nay"
            });
        }

        next();
    };
}

module.exports = {
    allowRoles
};