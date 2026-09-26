const borrowService = require("../services/borrowService");

// GET /api/borrows
// Lấy toàn bộ phiếu mượn
async function findAll(req, res) {
    try {
        const borrows = await borrowService.findAll();

        res.json(borrows);
    } catch (error) {
        console.error("Loi lay danh sach phieu muon:", error);

        res.status(500).json({
            message: "Khong the lay danh sach phieu muon"
        });
    }
}

// GET /api/borrows/:maPhieu
// Lấy 1 phiếu mượn theo mã phiếu
async function findOne(req, res) {
    try {
        const { maPhieu } = req.params;

        const borrow = await borrowService.findOne(maPhieu);

        if (!borrow) {
            return res.status(404).json({
                message: "Khong tim thay phieu muon"
            });
        }

        res.json(borrow);
    } catch (error) {
        console.error("Loi tim phieu muon:", error);

        res.status(500).json({
            message: "Khong the tim phieu muon"
        });
    }
}

// POST /api/borrows
// Tạo phiếu mượn mới
async function create(req, res) {
    try {
        const borrow = req.body;

        const newBorrow = await borrowService.create(borrow);

        res.status(201).json(newBorrow);
    } catch (error) {
        console.error("Loi tao phieu muon:", error);

        res.status(500).json({
            message: "Khong the tao phieu muon"
        });
    }
}

// PUT /api/borrows/:maPhieu
// Cập nhật phiếu mượn theo mã phiếu
async function update(req, res) {
    try {
        const { maPhieu } = req.params;
        const borrow = req.body;

        const oldBorrow = await borrowService.findOne(maPhieu);

        if (!oldBorrow) {
            return res.status(404).json({
                message: "Khong tim thay phieu muon"
            });
        }

        const updatedBorrow = await borrowService.update(
            maPhieu,
            borrow
        );

        res.json(updatedBorrow);
    } catch (error) {
        console.error("Loi cap nhat phieu muon:", error);

        res.status(500).json({
            message: "Khong the cap nhat phieu muon"
        });
    }
}

// DELETE /api/borrows/:maPhieu
// Xóa phiếu mượn theo mã phiếu
async function remove(req, res) {
    try {
        const { maPhieu } = req.params;

        const oldBorrow = await borrowService.findOne(maPhieu);

        if (!oldBorrow) {
            return res.status(404).json({
                message: "Khong tim thay phieu muon"
            });
        }

        await borrowService.remove(maPhieu);

        res.json({
            message: "Xoa phieu muon thanh cong"
        });
    } catch (error) {
        console.error("Loi xoa phieu muon:", error);

        res.status(500).json({
            message: "Khong the xoa phieu muon"
        });
    }
}

module.exports = {
    findAll,
    findOne,
    create,
    update,
    remove
};