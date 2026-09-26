const connectDB = require("../config/database");
const { BORROW_DETAIL_COLLECTION } = require("../models/BorrowDetail");

async function getCollection() {
    const db = await connectDB();
    return db.collection(BORROW_DETAIL_COLLECTION);
}

// Lấy tất cả chi tiết phiếu mượn
async function findAll() {
    const collection = await getCollection();
    return await collection.find({}).toArray();
}

// Lấy các sách trong một phiếu mượn
async function findByMaPhieu(maPhieu) {
    const collection = await getCollection();

    return await collection.find({
        maPhieu: maPhieu
    }).toArray();
}

// Thêm chi tiết phiếu mượn
async function create(borrowDetail) {
    const collection = await getCollection();

    const result = await collection.insertOne(borrowDetail);

    return await collection.findOne({
        _id: result.insertedId
    });
}

// Cập nhật theo mã phiếu + mã sách
async function update(maPhieu, maSach, borrowDetail) {
    const collection = await getCollection();

    await collection.updateOne(
        {
            maPhieu: maPhieu,
            maSach: maSach
        },
        {
            $set: borrowDetail
        }
    );

    return await collection.findOne({
        maPhieu: maPhieu,
        maSach: maSach
    });
}

// Xóa theo mã phiếu + mã sách
async function remove(maPhieu, maSach) {
    const collection = await getCollection();

    return await collection.deleteOne({
        maPhieu: maPhieu,
        maSach: maSach
    });
}

module.exports = {
    findAll,
    findByMaPhieu,
    create,
    update,
    remove
};