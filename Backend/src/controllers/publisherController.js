const publisherService = require("../services/publisherService");

// Lấy tất cả nhà xuất bản
async function findAll(req, res) {
    try {
        const publishers = await publisherService.findAll();

        res.json(publishers); // Trả danh sách nhà xuất bản
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi lấy danh sách nhà xuất bản",
            error: error.message,
        });
    }
}

// Lấy một nhà xuất bản theo ID
async function findOne(req, res) {
    try {
        const publisher = await publisherService.findOne(req.params.id);

        if (!publisher) {
            return res.status(404).json({
                message: "Không tìm thấy nhà xuất bản",
            });
        }

        res.json(publisher); // Trả thông tin nhà xuất bản
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi lấy thông tin nhà xuất bản",
            error: error.message,
        });
    }
}

// Thêm nhà xuất bản
async function create(req, res) {
    try {
        const publisher = await publisherService.create(req.body);

        res.status(201).json(publisher); // 201 = tạo thành công
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi thêm nhà xuất bản",
            error: error.message,
        });
    }
}

// Cập nhật nhà xuất bản
async function update(req, res) {
    try {
        const publisher = await publisherService.update(
            req.params.id,
            req.body
        );

        res.json(publisher); // Trả dữ liệu sau khi cập nhật
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi cập nhật nhà xuất bản",
            error: error.message,
        });
    }
}

// Xóa nhà xuất bản
async function remove(req, res) {
    try {
        const result = await publisherService.remove(req.params.id);

        if (result.deletedCount === 0) {
            return res.status(404).json({
                message: "Không tìm thấy nhà xuất bản",
            });
        }

        res.json({
            message: "Xóa nhà xuất bản thành công",
        });
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi xóa nhà xuất bản",
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