const connectDB = require("../config/database");
const { BORROW_COLLECTION } = require("../models/Borrow");

// Lấy collection borrowings
async function getCollection() {
    const db = await connectDB();
    return db.collection(BORROW_COLLECTION);
}

// Lấy toàn bộ phiếu mượn
async function findAll() {
    const collection = await getCollection();

    return await collection.find({}).toArray();
}

// Lấy 1 phiếu mượn theo mã phiếu
async function findOne(maPhieu) {
    const collection = await getCollection();

    return await collection.findOne({
        maPhieu: maPhieu
    });
}

// Tạo phiếu mượn mới
async function create(borrow) {
    const collection = await getCollection();

    const result = await collection.insertOne(borrow);

    return await collection.findOne({
        _id: result.insertedId
    });
}

// Cập nhật phiếu mượn theo mã phiếu
async function update(maPhieu, borrow) {
    const collection = await getCollection();

    await collection.updateOne(
        { maPhieu: maPhieu },
        { $set: borrow }
    );

    return await findOne(maPhieu);
}

// Xóa phiếu mượn theo mã phiếu
async function remove(maPhieu) {
    const collection = await getCollection();

    return await collection.deleteOne({
        maPhieu: maPhieu
    });
}

module.exports = {
    findAll,
    findOne,
    create,
    update,
    remove
};