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
                "Khong the lay chi tiet phieu muon"
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
                message: "Khong tim thay phieu muon"
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

        if (result.expired) {
            return res.status(400).json({ message: "Phieu muon da het han" });
        }

        if (result.invalidStatus) {
            return res.status(403).json({
                message:
                    "Chi duoc xoa sach khi phieu dang chon sach hoac cho duyet"
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
                ? (error.publicMessage || error.message || "Khong the xoa sach khoi phieu muon")
                : (error.publicMessage || "Khong the xoa sach khoi phieu muon")
        });
    }
}

async function add(req, res) {
    try {
        if (!Array.isArray(req.body?.borrowDetails)) return res.status(400).json({ message: "borrowDetails phai la danh sach sach can them" });
        const result = await borrowService.addBooks(req.params.maPhieu, req.body.borrowDetails, req.user);
        if (result.forbidden) return res.status(403).json({ message: "Ban khong co quyen them sach vao phieu muon nay" });
        if (result.notFound) return res.status(404).json({ message: "Khong tim thay phieu muon" });
        if (result.invalidStatus || result.expired) return res.status(400).json({ message: "Chi duoc them sach vao phieu dang chon sach chua het han" });
        return res.status(201).json({ message: "Them sach vao phieu muon thanh cong", borrow: result.borrow, details: result.details });
    } catch (error) {
        const statusCode = Number.isInteger(error.statusCode) && error.statusCode >= 400 && error.statusCode <= 599 ? error.statusCode : 500;
        return res.status(statusCode).json({ message: statusCode < 500 ? (error.publicMessage || error.message) : (error.publicMessage || "Khong the them sach vao phieu muon") });
    }
}

module.exports = {
    findAll,
    findByMaPhieu,
    add,
    remove
};
