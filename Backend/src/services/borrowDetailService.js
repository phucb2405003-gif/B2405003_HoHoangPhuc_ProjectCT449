const { ObjectId } = require("mongodb");
const connectDB = require("../config/database");
const {
    BORROW_DETAIL_COLLECTION,
} = require("../models/BorrowDetail");

// Lấy collection chi tiết mượn sách
async function getCollection() {
    const db = await connectDB();
    return db.collection(BORROW_DETAIL_COLLECTION);
}

// Lấy tất cả chi tiết mượn
async function findAll() {
    const collection = await getCollection();

    return await collection.find({}).toArray();
}

// Lấy một chi tiết theo ID
async function findOne(id) {
    const collection = await getCollection();

    return await collection.findOne({
        _id: new ObjectId(id),
    });
}

// Thêm chi tiết mượn
async function create(borrowDetail) {
    const collection = await getCollection();

    const result = await collection.insertOne(borrowDetail);

    return await collection.findOne({
        _id: result.insertedId,
    });
}

// Cập nhật chi tiết mượn
async function update(id, borrowDetail) {
    const collection = await getCollection();

    await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: borrowDetail }
    );

    return await findOne(id);
}

// Xóa chi tiết mượn
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