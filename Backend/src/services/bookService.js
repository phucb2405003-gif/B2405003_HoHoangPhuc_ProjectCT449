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

// Thêm sách
async function create(book) {
    const collection = await getCollection();

    const result = await collection.insertOne(book);

    return await collection.findOne({
        _id: result.insertedId,
    });
}

// Cập nhật theo mã sách
async function update(maSach, book) {
    const collection = await getCollection();

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