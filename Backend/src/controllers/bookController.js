const bookService = require("../services/bookService");

// Lấy tất cả sách
async function findAll(req, res) {
    try {
        const books = await bookService.findAll();

        res.json(books); // Trả danh sách sách về client
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi lấy danh sách sách",
            error: error.message,
        });
    }
}

// Lấy một sách theo ID
async function findOne(req, res) {
    try {
        const book = await bookService.findOne(req.params.maSach);

        if (!book) {
            return res.status(404).json({
                message: "Không tìm thấy sách",
            });
        }

        res.json(book); // Trả thông tin sách
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi lấy thông tin sách",
            error: error.message,
        });
    }
}

// Thêm sách
async function create(req, res) {
    try {
        const book = await bookService.create(req.body);

        res.status(201).json(book); // 201 = tạo dữ liệu thành công
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi thêm sách",
            error: error.message,
        });
    }
}

// Cập nhật sách
async function update(req, res) {
    try {
        const book = await bookService.update(
            req.params.maSach,
            req.body
        );

        res.json(book); // Trả sách sau khi cập nhật
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi cập nhật sách",
            error: error.message,
        });
    }
}

// Xóa sách
async function remove(req, res) {
    try {
        const result = await bookService.remove(req.params.maSach);

        if (result.deletedCount === 0) {
            return res.status(404).json({
                message: "Không tìm thấy sách",
            });
        }

        res.json({
            message: "Xóa sách thành công",
        });
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi xóa sách",
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