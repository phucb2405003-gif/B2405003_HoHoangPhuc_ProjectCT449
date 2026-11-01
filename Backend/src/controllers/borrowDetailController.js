const borrowDetailService = require("../services/borrowDetailService");
const borrowService = require("../services/borrowService");

// Lấy tất cả chi tiết phiếu mượn
async function findAll(req, res) {
    try {
        const borrowDetails =
            await borrowDetailService.findAll();

        res.json(borrowDetails);
    } catch (error) {
        console.error(
            "Loi lay chi tiet phieu muon:",
            error
        );

        res.status(500).json({
            message:
                "Không thể tải chi tiết phiếu mượn. Vui lòng thử lại sau."
        });
    }
}

// Lấy danh sách sách trong một phiếu
async function findByMaPhieu(req, res) {
    try {
        const { maPhieu } = req.params;

        // Chi tiet co the khong co dong nao; kiem tra phieu cha truoc de
        // phan biet truong hop do voi ma phieu khong ton tai.
        const borrow = await borrowService.findOne(maPhieu);
        if (!borrow) {
            return res.status(404).json({
                message: "Không tìm thấy phiếu mượn."
            });
        }

        const borrowDetails =
            await borrowDetailService.findByMaPhieu(
                maPhieu
            );

        res.json(borrowDetails);
    } catch (error) {
        console.error(
            "Loi lay sach trong phieu muon:",
            error
        );

        res.status(500).json({
            message:
                "Không thể tải danh sách sách trong phiếu mượn. Vui lòng thử lại sau."
        });
    }
}

// Xóa một sách khỏi phiếu trong trường hợp đặc biệt
async function remove(req, res) {
    try {
        const { maPhieu, maSach } = req.params;

        const result =
            await borrowDetailService.remove(
                maPhieu,
                maSach,
                req.user
            );

        if (result.forbidden) {
            return res.status(403).json({
                message:
                    "Ban khong co quyen xoa sach khoi phieu muon nay"
            });
        }

        if (result.notFound) {
            return res.status(404).json({
                message:
                    "Không tìm thấy phiếu mượn."
            });
        }

        if (result.detailNotFound) {
            return res.status(404).json({
                message:
                    "Không tìm thấy sách trong phiếu mượn."
            });
        }

        if (result.expired) {
            return res.status(400).json({ message: "Phiếu mượn đã hết hạn." });
        }

        if (result.invalidStatus) {
            return res.status(403).json({
                message:
                    "Chỉ được xóa sách khi phiếu đang ở trạng thái Đang chọn sách"
            });
        }

        res.json({
            message: `Đã xóa sách "${result.tenSach}" khỏi phiếu mượn ${maPhieu}.`,
            maPhieu,
            tenSach: result.tenSach,
            detail: result.detail
        });
    } catch (error) {
        console.error(
            "Loi xoa sach khoi phieu muon:",
            error
        );

        const statusCode = Number.isInteger(error.statusCode) &&
            error.statusCode >= 400 &&
            error.statusCode <= 599
            ? error.statusCode
            : 500;
        res.status(statusCode).json({
            message: statusCode < 500
                ? (error.publicMessage || error.message || "Không thể xóa sách khỏi phiếu mượn. Vui lòng thử lại sau.")
                : (error.publicMessage || "Không thể xóa sách khỏi phiếu mượn. Vui lòng thử lại sau.")
        });
    }
}

async function add(req, res) {
    try {
        if (!Array.isArray(req.body?.borrowDetails)) return res.status(400).json({ message: "Danh sách sách cần thêm chưa hợp lệ." });
        const result = await borrowService.addBooks(req.params.maPhieu, req.body.borrowDetails, req.user);
        if (result.forbidden) return res.status(403).json({ message: "Bạn không có quyền thêm sách vào phiếu mượn này." });
        if (result.notFound) return res.status(404).json({ message: "Không tìm thấy phiếu mượn." });
        if (result.invalidStatus || result.expired) return res.status(400).json({ message: "Chỉ có thể thêm sách vào phiếu đang chọn sách và chưa hết hạn." });
        return res.status(201).json({ message: "Đã thêm sách vào phiếu mượn thành công.", borrow: result.borrow, details: result.details });
    } catch (error) {
        const statusCode = Number.isInteger(error.statusCode) && error.statusCode >= 400 && error.statusCode <= 599 ? error.statusCode : 500;
        return res.status(statusCode).json({ message: statusCode < 500 ? (error.publicMessage || error.message) : (error.publicMessage || "Không thể thêm sách vào phiếu mượn. Vui lòng thử lại sau.") });
    }
}

module.exports = {
    findAll,
    findByMaPhieu,
    add,
    remove
};
