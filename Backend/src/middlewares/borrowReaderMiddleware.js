const connectDB = require("../config/database");
const { BORROW_COLLECTION } = require("../models/Borrow");

function allowReaderOrManager(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            message: "Bạn cần đăng nhập để tiếp tục."
        });
    }

    if (
        req.user.loaiTaiKhoan === "DOCGIA" ||
        req.user.chucVu === "Quản lý"
    ) {
        return next();
    }

    return res.status(403).json({
        message: "Bạn không có quyền xóa sách khỏi phiếu mượn."
    });
}

async function allowOwnBorrow(req, res, next) {
    try {
        if (!req.user) {
            return res.status(401).json({
                message: "Bạn cần đăng nhập để tiếp tục."
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
                message: "Không tìm thấy phiếu mượn."
            });
        }

        // Độc giả chỉ được xem phiếu của mình
        if (borrow.maDocGia !== req.user.maTaiKhoan) {
            return res.status(403).json({
                message: "Bạn không có quyền xem phiếu mượn này."
            });
        }

        next();
    } catch (error) {
        console.error("Loi kiem tra quyen phieu muon:", error);

        res.status(500).json({
            message: "Đã xảy ra lỗi máy chủ. Vui lòng thử lại sau."
        });
    }
}

module.exports = {
    allowOwnBorrow,
    allowReaderOrManager
};
