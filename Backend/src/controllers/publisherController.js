const publisherService = require("../services/publisherService");

// Lấy tất cả nhà xuất bản
async function findAll(req, res) {
    try {
        const publishers = await publisherService.findAll();

        res.json(publishers); // Trả danh sách nhà xuất bản
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi lấy danh sách nhà xuất bản",
        });
    }
}

// Lấy một nhà xuất bản theo ID
async function findOne(req, res) {
    try {
        const publisher = await publisherService.findOne(req.params.maNXB);

        if (!publisher) {
            return res.status(404).json({
                message: "Không tìm thấy nhà xuất bản",
            });
        }

        res.json(publisher); // Trả thông tin nhà xuất bản
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi lấy thông tin nhà xuất bản",
        });
    }
}

// Thêm nhà xuất bản
async function create(req, res) {
    try {
        const publisher = await publisherService.create(req.body);

        res.status(201).json(publisher); // 201 = tạo thành công
    } catch (error) {
        if (error.code === "INVALID_UPDATE") {
            return res.status(400).json({ message: "Dữ liệu gửi lên chưa hợp lệ. Vui lòng kiểm tra lại." });
        }
        if (error.code === "DUPLICATE_NAME") {
            return res.status(409).json({
                message: "Tên nhà xuất bản đã tồn tại",
            });
        }
        if (error.code === "CODE_SEQUENCE_EXHAUSTED") {
            return res.status(409).json({ message: error.publicMessage });
        }
        if (error.code === "PUBLISHER_CODE_ALREADY_EXISTS") {
            return res.status(409).json({ message: "Mã nhà xuất bản đã tồn tại. Vui lòng thử lại." });
        }

        res.status(500).json({
            message: "Lỗi khi thêm nhà xuất bản",
        });
    }
}

// Cập nhật nhà xuất bản
async function update(req, res) {
    try {
        const publisher = await publisherService.update(
            req.params.maNXB,
            req.body
        );

        res.json(publisher); // Trả dữ liệu sau khi cập nhật
    } catch (error) {
        if (error.code === "INVALID_UPDATE") {
            return res.status(400).json({
                message: "Thông tin cập nhật chưa hợp lệ. Vui lòng kiểm tra lại.",
            });
        }

        if (error.code === "NOT_FOUND") {
            return res.status(404).json({
                message: "Không tìm thấy nhà xuất bản.",
            });
        }

        if (error.code === "DUPLICATE_NAME") {
            return res.status(409).json({
                message: "Tên nhà xuất bản đã tồn tại",
            });
        }

        res.status(500).json({
            message: "Lỗi khi cập nhật nhà xuất bản",
        });
    }
}

// Xóa nhà xuất bản
async function remove(req, res) {
    try {
        const result = await publisherService.remove(req.params.maNXB);

        if (result.deletedCount === 0) {
            return res.status(404).json({
                message: "Không tìm thấy nhà xuất bản",
            });
        }

        res.json({
            message: "Xóa nhà xuất bản thành công",
        });
    } catch (error) {
        if (error.statusCode === 503) {
            return res.status(503).json({
                message: "Hệ thống đang xử lý phiếu mượn. Vui lòng thử lại sau."
            });
        }
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({
                message: "Không tìm thấy nhà xuất bản.",
            });
        }

        if (error.code === "PUBLISHER_REFERENCED") {
            return res.status(409).json({
                message: "Không thể xóa nhà xuất bản đang được sách sử dụng.",
            });
        }

        res.status(500).json({
            message: "Lỗi khi xóa nhà xuất bản",
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
