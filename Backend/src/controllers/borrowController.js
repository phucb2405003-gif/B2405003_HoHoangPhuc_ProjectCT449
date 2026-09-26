const borrowService = require("../services/borrowService");

// Lấy tất cả phiếu mượn
async function findAll(req, res) {
    try {
        const borrows = await borrowService.findAll();

        res.json(borrows); // Trả danh sách phiếu mượn
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi lấy danh sách phiếu mượn",
            error: error.message,
        });
    }
}

// Lấy một phiếu mượn theo ID
async function findOne(req, res) {
    try {
        const borrow = await borrowService.findOne(req.params.id);

        if (!borrow) {
            return res.status(404).json({
                message: "Không tìm thấy phiếu mượn",
            });
        }

        res.json(borrow); // Trả thông tin phiếu mượn
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi lấy thông tin phiếu mượn",
            error: error.message,
        });
    }
}

// Tạo phiếu mượn
async function create(req, res) {
    try {
        const borrow = await borrowService.create(req.body);

        res.status(201).json(borrow); // 201 = tạo thành công
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi tạo phiếu mượn",
            error: error.message,
        });
    }
}

// Cập nhật phiếu mượn
async function update(req, res) {
    try {
        const borrow = await borrowService.update(
            req.params.id,
            req.body
        );

        res.json(borrow); // Trả phiếu mượn sau khi cập nhật
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi cập nhật phiếu mượn",
            error: error.message,
        });
    }
}

// Xóa phiếu mượn
async function remove(req, res) {
    try {
        const result = await borrowService.remove(req.params.id);

        if (result.deletedCount === 0) {
            return res.status(404).json({
                message: "Không tìm thấy phiếu mượn",
            });
        }

        res.json({
            message: "Xóa phiếu mượn thành công",
        });
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi xóa phiếu mượn",
            error: error.message,
        });
    }
}

module.exports = {
    findAll,
    findOne,
    create,
    update,
    remove,
};