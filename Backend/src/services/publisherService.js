const { ObjectId } = require("mongodb");
const connectDB = require("../config/database");
const { PUBLISHER_COLLECTION } = require("../models/Publisher");

// Lấy collection nhà xuất bản
async function getCollection() {
    const db = await connectDB();
    return db.collection(PUBLISHER_COLLECTION);
}

// Lấy tất cả nhà xuất bản
async function findAll() {
    const collection = await getCollection();

    return await collection.find({}).toArray();
}

// Lấy một nhà xuất bản theo ID
async function findOne(maNXB) {
    const collection = await getCollection();

    return await collection.findOne({
        maNXB: maNXB,
    });
}

// Thêm nhà xuất bản
async function create(publisher) {
    const collection = await getCollection();

    const result = await collection.insertOne(publisher);

    return await collection.findOne({
        _id: result.insertedId,
    });
}

// Cập nhật nhà xuất bản
async function update(maNXB, publisher) {
    const collection = await getCollection();

    await collection.updateOne(
        { maNXB: maNXB },
        { $set: publisher }
    );

    return await findOne(maNXB);
}

// Xóa nhà xuất bản
async function remove(maNXB) {
    const collection = await getCollection();

    return await collection.deleteOne({
        maNXB: maNXB,
    });
}

module.exports = {
    findAll,
    findOne,
    create,
    update,
    remove,
};