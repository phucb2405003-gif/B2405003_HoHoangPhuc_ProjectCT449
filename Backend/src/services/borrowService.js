const { ObjectId } = require("mongodb");
const connectDB = require("../config/database");
const { BORROW_COLLECTION } = require("../models/Borrow");

// Lấy collection mượn sách
async function getCollection() {
    const db = await connectDB();
    return db.collection(BORROW_COLLECTION);
}

// Lấy tất cả phiếu mượn
async function findAll() {
    const collection = await getCollection();

    return await collection.find({}).toArray();
}

// Lấy một phiếu mượn theo ID
async function findOne(id) {
    const collection = await getCollection();

    return await collection.findOne({
        _id: new ObjectId(id),
    });
}

// Thêm phiếu mượn
async function create(borrow) {
    const collection = await getCollection();

    const result = await collection.insertOne(borrow);

    return await collection.findOne({
        _id: result.insertedId,
    });
}

// Cập nhật phiếu mượn
async function update(id, borrow) {
    const collection = await getCollection();

    await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: borrow }
    );

    return await findOne(id);
}

// Xóa phiếu mượn
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