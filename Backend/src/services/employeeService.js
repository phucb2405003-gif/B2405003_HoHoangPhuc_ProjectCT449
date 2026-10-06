const connectDB = require("../config/database");
const { EMPLOYEE_COLLECTION } = require("../models/Employee");
const { generateCode } = require("./codeGeneratorService");

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
    const employeeToInsert = {
        ...employee,
    };
    const maNhanVien = await generateCode("NV");
    employeeToInsert.maNhanVien = maNhanVien;

    const result = await collection.insertOne(employeeToInsert);

    return await collection.findOne({
        _id: result.insertedId
    });
}

// Cập nhật nhân viên
async function update(maNhanVien, employee) {
    const collection = await getCollection();
    const employeeToUpdate = { ...employee };
    delete employeeToUpdate.maNhanVien;

    await collection.updateOne(
        {
            maNhanVien: maNhanVien
        },
        {
            $set: employeeToUpdate
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
