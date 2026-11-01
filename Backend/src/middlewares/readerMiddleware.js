function allowOwnReader(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            message: "Bạn cần đăng nhập để tiếp tục."
        });
    }

    const maDocGia = req.params.maDocGia;

    // Chỉ cho phép độc giả xem chính tài khoản của mình
    if (
        req.user.loaiTaiKhoan !== "DOCGIA" ||
        req.user.maTaiKhoan !== maDocGia
    ) {
        return res.status(403).json({
            message: "Bạn không có quyền xem thông tin này."
        });
    }

    next();
}

module.exports = {
    allowOwnReader
};