function allowRoles(...allowedRoles) {
    return (req, res, next) => {
        // Kiểm tra đã đăng nhập chưa
        if (!req.user) {
            return res.status(401).json({
                message: "Bạn cần đăng nhập để tiếp tục."
            });
        }

        // Kiểm tra chức vụ có được phép không
        if (!allowedRoles.includes(req.user.chucVu)) {
            return res.status(403).json({
                message: "Bạn không có quyền thực hiện thao tác này."
            });
        }

        next();
    };
}

module.exports = {
    allowRoles
};