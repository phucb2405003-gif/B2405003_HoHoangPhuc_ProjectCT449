const borrowDetailService = require("../services/borrowDetailService");

// Lấy tất cả chi tiết phiếu mượn
async function findAll(req, res) {
    try {
        const borrowDetails = await borrowDetailService.findAll();

        res.json(borrowDetails);
    } catch (error) {
        console.error("Loi lay chi tiet phieu muon:", error);

        res.status(500).json({
            message: "Khong the lay chi tiet phieu muon"
        });
    }
}

// Lấy danh sách sách trong một phiếu mượn
async function findByMaPhieu(req, res) {
    try {
        const { maPhieu } = req.params;

        const borrowDetails =
            await borrowDetailService.findByMaPhieu(maPhieu);

        res.json(borrowDetails);
    } catch (error) {
        console.error("Loi lay sach trong phieu muon:", error);

        res.status(500).json({
            message: "Khong the lay sach trong phieu muon"
        });
    }
}

// Thêm sách vào phiếu mượn
async function create(req, res) {
    try {
        const borrowDetail = req.body;

        const newBorrowDetail =
            await borrowDetailService.create(borrowDetail);

        res.status(201).json(newBorrowDetail);
    } catch (error) {
        console.error("Loi them sach vao phieu muon:", error);

        res.status(500).json({
            message: "Khong the them sach vao phieu muon"
        });
    }
}

// Cập nhật số lượng / thông tin sách
async function update(req, res) {
    try {
        const { maPhieu, maSach } = req.params;
        const borrowDetail = req.body;

        const borrowDetails =
            await borrowDetailService.findByMaPhieu(maPhieu);

        const exists = borrowDetails.some(
            (item) => item.maSach === maSach
        );

        if (!exists) {
            return res.status(404).json({
                message: "Khong tim thay chi tiet phieu muon"
            });
        }

        const updatedBorrowDetail =
            await borrowDetailService.update(
                maPhieu,
                maSach,
                borrowDetail
            );

        res.json(updatedBorrowDetail);
    } catch (error) {
        console.error("Loi cap nhat chi tiet phieu muon:", error);

        res.status(500).json({
            message: "Khong the cap nhat chi tiet phieu muon"
        });
    }
}

// Xóa sách khỏi phiếu mượn
async function remove(req, res) {
    try {
        const { maPhieu, maSach } = req.params;

        const borrowDetails =
            await borrowDetailService.findByMaPhieu(maPhieu);

        const exists = borrowDetails.some(
            (item) => item.maSach === maSach
        );

        if (!exists) {
            return res.status(404).json({
                message: "Khong tim thay chi tiet phieu muon"
            });
        }

        await borrowDetailService.remove(maPhieu, maSach);

        res.json({
            message: "Xoa sach khoi phieu muon thanh cong"
        });
    } catch (error) {
        console.error("Loi xoa sach khoi phieu muon:", error);

        res.status(500).json({
            message: "Khong the xoa sach khoi phieu muon"
        });
    }
}

module.exports = {
    findAll,
    findByMaPhieu,
    create,
    update,
    remove
};