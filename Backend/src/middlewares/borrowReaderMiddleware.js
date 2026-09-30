const connectDB = require("../config/database");
const { BORROW_COLLECTION } = require("../models/Borrow");

async function allowOwnBorrow(req, res, next) {
    try {
        if (!req.user) {
            return res.status(401).json({
                message: "Chua dang nhap"
            });
        }

        // Chỉ áp dụng cho độc giả
        if (req.user.loaiTaiKhoan !== "DOCGIA") {
            return next();
        }

        const { maPhieu } = req.params;

        const db = await connectDB();

        const borrow = await db
            .collection(BORROW_COLLECTION)
            .findOne({
                maPhieu: maPhieu
            });

        if (!borrow) {
            return res.status(404).json({
                message: "Khong tim thay phieu muon"
            });
        }

        // Độc giả chỉ được xem phiếu của mình
        if (borrow.maDocGia !== req.user.maTaiKhoan) {
            return res.status(403).json({
                message: "Ban khong co quyen xem phieu muon nay"
            });
        }

        next();
    } catch (error) {
        console.error("Loi kiem tra quyen phieu muon:", error);

        res.status(500).json({
            message: "Loi server"
        });
    }
}

module.exports = {
    allowOwnBorrow
};