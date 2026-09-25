const { ObjectId } = require("mongodb");
const connectDB = require("../config/database");
const { BOOK_COLLECTION } = require("../models/Book");

// Lấy collection sách từ MongoDB
async function getCollection() {
    const db = await connectDB();
    return db.collection(BOOK_COLLECTION);
}

// Lấy tất cả sách
async function findAll() {
    const collection = await getCollection();

    return await collection.find({}).toArray();
}

// Lấy một sách theo MongoDB _id
async function findOne(id) {
    const collection = await getCollection();

    return await collection.findOne({
        _id: new ObjectId(id),
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

// Cập nhật sách
async function update(id, book) {
    const collection = await getCollection();

    await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: book }
    );

    return await findOne(id);
}

// Xóa sách
async function remove(id) {
    const collection = await getCollection();

    return await collection.deleteOne({
        _id: new ObjectId(id),
    });
}

module.exports = {
    findAll,
    findOne,
    create,
    update,
    remove,
};