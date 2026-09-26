const connectDB = require("../config/database");
const { EMPLOYEE_COLLECTION } = require("../models/Employee");

async function getCollection() {
    const db = await connectDB();
    return db.collection(EMPLOYEE_COLLECTION);
}

// Lấy tất cả nhân viên
async function findAll() {
    const collection = await getCollection();

    return await collection.find({}).toArray();
}

// Lấy nhân viên theo mã
async function findOne(maNhanVien) {
    const collection = await getCollection();

    return await collection.findOne({
        maNhanVien: maNhanVien
    });
}

// Thêm nhân viên
async function create(employee) {
    const collection = await getCollection();

    const result = await collection.insertOne(employee);

    return await collection.findOne({
        _id: result.insertedId
    });
}

// Cập nhật nhân viên
async function update(maNhanVien, employee) {
    const collection = await getCollection();

    await collection.updateOne(
        {
            maNhanVien: maNhanVien
        },
        {
            $set: employee
        }
    );

    return await findOne(maNhanVien);
}

// Xóa nhân viên
async function remove(maNhanVien) {
    const collection = await getCollection();

    return await collection.deleteOne({
        maNhanVien: maNhanVien
    });
}

module.exports = {
    findAll,
    findOne,
    create,
    update,
    remove
};