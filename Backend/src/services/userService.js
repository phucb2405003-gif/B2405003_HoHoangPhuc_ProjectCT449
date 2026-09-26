const connectDB = require("../config/database");
const { USER_COLLECTION } = require("../models/User");

// Lấy collection độc giả
async function getCollection() {
    const db = await connectDB();
    return db.collection(USER_COLLECTION);
}

// Lấy tất cả độc giả
async function findAll() {
    const collection = await getCollection();

    return await collection.find({}).toArray();
}

// Tìm theo mã độc giả
async function findOne(maDocGia) {
    const collection = await getCollection();

    return await collection.findOne({
        maDocGia: maDocGia,
    });
}

// Thêm độc giả
async function create(user) {
    const collection = await getCollection();

    const result = await collection.insertOne(user);

    return await collection.findOne({
        _id: result.insertedId,
    });
}

// Cập nhật theo mã độc giả
async function update(maDocGia, user) {
    const collection = await getCollection();

    await collection.updateOne(
        { maDocGia: maDocGia },
        { $set: user }
    );

    return await findOne(maDocGia);
}

// Xóa theo mã độc giả
async function remove(maDocGia) {
    const collection = await getCollection();

    return await collection.deleteOne({
        maDocGia: maDocGia,
    });
}

module.exports = {
    findAll,
    findOne,
    create,
    update,
    remove,
};