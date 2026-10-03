const connectDB = require("../config/database");
const { BOOK_COLLECTION } = require("../models/Book");

// Lấy collection sách
async function getCollection() {
    const db = await connectDB();
    return db.collection(BOOK_COLLECTION);
}

// Lấy tất cả sách
async function findAll() {
    const collection = await getCollection();

    return await collection.find({}).toArray();
}

// Lấy sách theo mã sách
async function findOne(maSach) {
    const collection = await getCollection();

    return await collection.findOne({
        maSach: maSach, // Tìm bằng mã sách
    });
}

function normalizeWhitespace(value) {
    return value.trim().replace(/\s+/g, " ");
}

function duplicateNameError() {
    const error = new Error("Ten sach da ton tai");
    error.code = "DUPLICATE_NAME";
    return error;
}

// Thêm sách
async function create(book) {
    const collection = await getCollection();
    const normalizedBook = {
        ...book,
        tenSach: normalizeWhitespace(book.tenSach),
        tacGia: normalizeWhitespace(book.tacGia),
    };
    const toWhitespaceFlexiblePattern = (value) =>
        value
            .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            .replace(/ /g, "\\s+");

    const existingBook = await collection.findOne({
        tenSach: {
            $regex: `^\\s*${toWhitespaceFlexiblePattern(normalizedBook.tenSach)}\\s*$`,
            $options: "i",
        },
        tacGia: {
            $regex: `^\\s*${toWhitespaceFlexiblePattern(normalizedBook.tacGia)}\\s*$`,
            $options: "i",
        },
        maNXB: normalizedBook.maNXB,
    });

    if (existingBook) {
        throw duplicateNameError();
    }

    const bookToInsert = {
        ...normalizedBook,
        soQuyenConLai: normalizedBook.soQuyen,
    };

    const result = await collection.insertOne(bookToInsert);

    return await collection.findOne({
        _id: result.insertedId,
    });
}

// Cập nhật theo mã sách
async function update(maSach, book) {
    const collection = await getCollection();

    // Tồn kho chỉ thay đổi qua nghiệp vụ mượn và trả.
    delete book.soQuyenConLai;

    await collection.updateOne(
        { maSach: maSach }, // Không dùng _id
        { $set: book }
    );

    return await findOne(maSach);
}

// Xóa theo mã sách
async function remove(maSach) {
    const collection = await getCollection();

    return await collection.deleteOne({
        maSach: maSach, // Xóa bằng mã sách
    });
}

module.exports = {
    findAll,
    findOne,
    create,
    update,
    remove,
};
