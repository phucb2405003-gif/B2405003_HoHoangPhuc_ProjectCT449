const connectDB = require("../config/database");
const { EMPLOYEE_COLLECTION } = require("../models/Employee");
const { generateCode } = require("./codeGeneratorService");
const { getUpdateFields } = require("./updatePayload");

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
    let employeeToInsert;
    try {
        employeeToInsert = getUpdateFields(employee, {
            hoTenNV: "string",
            diaChi: "string",
            soDienThoai: "string",
            chucVu: "string",
        });
    } catch (validationError) {
        if (validationError.code !== "INVALID_UPDATE") throw validationError;

        const error = new Error("Du lieu tao nhan vien khong hop le");
        error.code = "INVALID_CREATE";
        throw error;
    }

    const collection = await getCollection();
    const maNhanVien = await generateCode("NV");
    employeeToInsert.maNhanVien = maNhanVien;

    const result = await collection.insertOne(employeeToInsert);

    return await collection.findOne({
        _id: result.insertedId
    });
}

// Cập nhật nhân viên
async function update(maNhanVien, employee) {
    const employeeToUpdate = getUpdateFields(employee, {
        hoTenNV: "string",
        diaChi: "string",
        soDienThoai: "string",
    });
    const collection = await getCollection();

    if (!(await collection.findOne({ maNhanVien }))) {
        const error = new Error("Khong tim thay nhan vien");
        error.code = "NOT_FOUND";
        throw error;
    }

    const result = await collection.updateOne(
        {
            maNhanVien: maNhanVien
        },
        {
            $set: employeeToUpdate
        }
    );

    if (result.matchedCount === 0) {
        const error = new Error("Khong tim thay nhan vien");
        error.code = "NOT_FOUND";
        throw error;
    }

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
