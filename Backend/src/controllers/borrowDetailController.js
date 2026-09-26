const borrowDetailService = require("../services/borrowDetailService");

// Lấy tất cả chi tiết mượn
async function findAll(req, res) {
    try {
        const borrowDetails = await borrowDetailService.findAll();

        res.json(borrowDetails); // Trả danh sách chi tiết mượn
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi lấy danh sách chi tiết mượn",
            error: error.message,
        });
    }
}

// Lấy một chi tiết mượn theo ID
async function findOne(req, res) {
    try {
        const borrowDetail = await borrowDetailService.findOne(
            req.params.id
        );

        if (!borrowDetail) {
            return res.status(404).json({
                message: "Không tìm thấy chi tiết mượn",
            });
        }

        res.json(borrowDetail); // Trả thông tin chi tiết mượn
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi lấy chi tiết mượn",
            error: error.message,
        });
    }
}

// Thêm chi tiết mượn
async function create(req, res) {
    try {
        const borrowDetail = await borrowDetailService.create(req.body);

        res.status(201).json(borrowDetail); // 201 = tạo thành công
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi thêm chi tiết mượn",
            error: error.message,
        });
    }
}

// Cập nhật chi tiết mượn
async function update(req, res) {
    try {
        const borrowDetail = await borrowDetailService.update(
            req.params.id,
            req.body
        );

        res.json(borrowDetail); // Trả dữ liệu sau khi cập nhật
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi cập nhật chi tiết mượn",
            error: error.message,
        });
    }
}

// Xóa chi tiết mượn
async function remove(req, res) {
    try {
        const result = await borrowDetailService.remove(
            req.params.id
        );

        if (result.deletedCount === 0) {
            return res.status(404).json({
                message: "Không tìm thấy chi tiết mượn",
            });
        }

        res.json({
            message: "Xóa chi tiết mượn thành công",
        });
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi xóa chi tiết mượn",
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