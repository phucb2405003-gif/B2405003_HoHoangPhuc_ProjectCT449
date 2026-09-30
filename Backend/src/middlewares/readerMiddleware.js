function allowOwnReader(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            message: "Chua dang nhap"
        });
    }

    const maDocGia = req.params.maDocGia;

    // Chỉ cho phép độc giả xem chính tài khoản của mình
    if (
        req.user.loaiTaiKhoan !== "DOCGIA" ||
        req.user.maTaiKhoan !== maDocGia
    ) {
        return res.status(403).json({
            message: "Ban khong co quyen xem thong tin nay"
        });
    }

    next();
}

module.exports = {
    allowOwnReader
};