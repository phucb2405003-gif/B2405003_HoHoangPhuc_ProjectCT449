const { ObjectId } = require("mongodb");
const connectDB = require("../config/database");
const { USER_COLLECTION } = require("../models/User");

// Lấy collection users từ MongoDB
async function getCollection() {
    const db = await connectDB();
    return db.collection(USER_COLLECTION);
}

// Lấy tất cả người dùng
async function findAll() {
    const collection = await getCollection();

    return await collection.find({}).toArray();
}

// Lấy một người dùng theo _id
async function findOne(id) {
    const collection = await getCollection();

    return await collection.findOne({
        _id: new ObjectId(id),
    });
}

// Thêm người dùng
async function create(user) {
    const collection = await getCollection();

    const result = await collection.insertOne(user);

    return await collection.findOne({
        _id: result.insertedId,
    });
}

// Cập nhật người dùng
async function update(id, user) {
    const collection = await getCollection();

    await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: user }
    );

    return await findOne(id);
}

// Xóa người dùng
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