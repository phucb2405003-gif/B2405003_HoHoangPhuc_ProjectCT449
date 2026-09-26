const userService = require("../services/userService");

// Lấy tất cả người dùng
async function findAll(req, res) {
    try {
        const users = await userService.findAll();

        res.json(users); // Trả danh sách người dùng
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi lấy danh sách người dùng",
            error: error.message,
        });
    }
}

// Lấy một người dùng theo ID
async function findOne(req, res) {
    try {
        const user = await userService.findOne(req.params.maDocGia);

        if (!user) {
            return res.status(404).json({
                message: "Không tìm thấy người dùng",
            });
        }

        res.json(user); // Trả thông tin người dùng
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi lấy thông tin người dùng",
            error: error.message,
        });
    }
}

// Thêm người dùng
async function create(req, res) {
    try {
        const user = await userService.create(req.body);

        res.status(201).json(user); // 201 = tạo thành công
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi thêm người dùng",
            error: error.message,
        });
    }
}

// Cập nhật người dùng
async function update(req, res) {
    try {
        const user = await userService.update(
            req.params.maDocGia,
            req.body
        );

        res.json(user); // Trả dữ liệu sau khi cập nhật
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi cập nhật người dùng",
            error: error.message,
        });
    }
}

// Xóa người dùng
async function remove(req, res) {
    try {
        const result = await userService.remove(req.params.maDocGia);

        if (result.deletedCount === 0) {
            return res.status(404).json({
                message: "Không tìm thấy người dùng",
            });
        }

        res.json({
            message: "Xóa người dùng thành công",
        });
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi xóa người dùng",
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