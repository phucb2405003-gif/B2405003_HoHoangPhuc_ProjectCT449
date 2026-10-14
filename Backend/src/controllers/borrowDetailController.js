const borrowDetailService = require("../services/borrowDetailService");

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
                "Khong the lay chi tiet phieu muon"
        });
    }
}

// Lấy danh sách sách trong một phiếu
async function findByMaPhieu(req, res) {
    try {
        const { maPhieu } = req.params;

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
                "Khong the lay sach trong phieu muon"
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
                    "Khong tim thay phieu muon"
            });
        }

        if (result.detailNotFound) {
            return res.status(404).json({
                message:
                    "Khong tim thay sach trong phieu muon"
            });
        }

        if (result.invalidStatus) {
            return res.status(403).json({
                message:
                    "Chi duoc xoa sach khi phieu dang cho duyet"
            });
        }

        res.json({
            message:
                "Xoa sach khoi phieu muon thanh cong",
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
                ? (error.publicMessage || error.message || "Khong the xoa sach khoi phieu muon")
                : (error.publicMessage || "Khong the xoa sach khoi phieu muon")
        });
    }
}

module.exports = {
    findAll,
    findByMaPhieu,
    remove
};
