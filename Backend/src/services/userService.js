const connectDB = require("../config/database");
const { USER_COLLECTION } = require("../models/User");
const { generateCode } = require("./codeGeneratorService");
const { getUpdateFields, validateCreateFields } = require("./updatePayload");
const accountService = require("./accountService");
const { isMongoDuplicateKey } = require("./mongoDuplicateError");

// Lấy collection độc giả
async function getCollection() {
    const db = await connectDB();
    return db.collection(USER_COLLECTION);
}

// Lấy tất cả độc giả
async function findAll() {
    const collection = await getCollection();

    return await collection.find({}).toArray();
}

// Tìm theo mã độc giả
async function findOne(maDocGia) {
    const collection = await getCollection();

    return await collection.findOne({
        maDocGia: maDocGia,
    });
}

// Thêm độc giả
async function create(user) {
    const userToCreate = validateCreateFields(user, {
        hoLot: "string",
        ten: "string",
        ngaySinh: "date",
        phai: "gender",
        diaChi: "string",
        dienThoai: "string",
    }, ["hoLot", "ten", "phai"]);
    const collection = await getCollection();
    const maDocGia = await generateCode("DG");
    userToCreate.maDocGia = maDocGia;

    let result;
    try {
        result = await collection.insertOne(userToCreate);
    } catch (error) {
        if (!isMongoDuplicateKey(error)) throw error;
        const duplicateError = new Error("Ma doc gia da ton tai");
        duplicateError.code = "PROFILE_CODE_ALREADY_EXISTS";
        throw duplicateError;
    }

    const createdUser = await collection.findOne({
        _id: result.insertedId,
    });

    try {
        const { account, initialPassword } = await accountService.createGeneratedForProfile(maDocGia);
        return {
            ...createdUser,
            accountCreation: {
                created: true,
                maTaiKhoan: account.maTaiKhoan,
                tenDangNhap: account.tenDangNhap,
                initialPassword,
            },
        };
    } catch (cause) {
        const error = new Error("Da tao ho so doc gia nhung chua tao duoc tai khoan");
        error.code = "PROFILE_ACCOUNT_PARTIAL";
        error.profileCode = maDocGia;
        error.profileType = "reader";
        error.profile = createdUser;
        error.cause = cause;
        throw error;
    }
}

// Cập nhật theo mã độc giả
async function update(maDocGia, user) {
    const userToUpdate = getUpdateFields(user, {
        hoLot: "string",
        ten: "string",
        ngaySinh: "date",
        phai: "gender",
        diaChi: "string",
        dienThoai: "string",
    });
    const collection = await getCollection();

    if (!(await collection.findOne({ maDocGia }))) {
        const error = new Error("Khong tim thay doc gia");
        error.code = "NOT_FOUND";
        throw error;
    }

    const result = await collection.updateOne(
        { maDocGia: maDocGia },
        { $set: userToUpdate }
    );

    if (result.matchedCount === 0) {
        const error = new Error("Khong tim thay doc gia");
        error.code = "NOT_FOUND";
        throw error;
    }

    return await findOne(maDocGia);
}

module.exports = {
    findAll,
    findOne,
    create,
    update,
};
