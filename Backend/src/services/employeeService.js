const connectDB = require("../config/database");
const { EMPLOYEE_COLLECTION } = require("../models/Employee");
const { generateCode } = require("./codeGeneratorService");
const { getUpdateFields, validateCreateFields } = require("./updatePayload");
const accountService = require("./accountService");

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
        employeeToInsert = validateCreateFields(employee, {
            hoTenNV: "string",
            diaChi: "string",
            soDienThoai: "string",
            chucVu: "string",
        }, ["hoTenNV", "chucVu"]);
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

    const createdEmployee = await collection.findOne({
        _id: result.insertedId
    });

    try {
        const { account, initialPassword } = await accountService.createGeneratedForProfile(maNhanVien);
        return {
            ...createdEmployee,
            accountCreation: {
                created: true,
                maTaiKhoan: account.maTaiKhoan,
                tenDangNhap: account.tenDangNhap,
                initialPassword,
            },
        };
    } catch (cause) {
        const error = new Error("Da tao ho so nhan vien nhung chua tao duoc tai khoan");
        error.code = "PROFILE_ACCOUNT_PARTIAL";
        error.profileCode = maNhanVien;
        error.profileType = "employee";
        error.profile = createdEmployee;
        error.cause = cause;
        throw error;
    }
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

module.exports = {
    findAll,
    findOne,
    create,
    update
};
