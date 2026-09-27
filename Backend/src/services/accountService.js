const connectDB = require("../config/database");
const { ACCOUNT_COLLECTION } = require("../models/Account");

async function getCollection() {
    const db = await connectDB();
    return db.collection(ACCOUNT_COLLECTION);
}

// Lấy tất cả tài khoản
async function findAll() {
    const collection = await getCollection();
    return await collection.find({}).toArray();
}

// Tìm tài khoản theo mã
async function findOne(maTaiKhoan) {
    const collection = await getCollection();

    return await collection.findOne({
        maTaiKhoan: maTaiKhoan
    });
}

// Tạo tài khoản
async function create(account) {
    const collection = await getCollection();

    const result = await collection.insertOne(account);

    return await collection.findOne({
        _id: result.insertedId
    });
}

// Cập nhật tài khoản
async function update(maTaiKhoan, account) {
    const collection = await getCollection();

    await collection.updateOne(
        {
            maTaiKhoan: maTaiKhoan
        },
        {
            $set: account
        }
    );

    return await findOne(maTaiKhoan);
}

// Xóa tài khoản
async function remove(maTaiKhoan) {
    const collection = await getCollection();

    return await collection.deleteOne({
        maTaiKhoan: maTaiKhoan
    });
}

module.exports = {
    findAll,
    findOne,
    create,
    update,
    remove
};