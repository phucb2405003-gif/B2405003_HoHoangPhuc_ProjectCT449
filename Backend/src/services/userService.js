const connectDB = require("../config/database");
const { USER_COLLECTION } = require("../models/User");
const { generateCode } = require("./codeGeneratorService");
const { getUpdateFields, validateCreateFields } = require("./updatePayload");

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
    }, ["phai"]);
    const collection = await getCollection();
    const maDocGia = await generateCode("DG");
    userToCreate.maDocGia = maDocGia;

    const result = await collection.insertOne(userToCreate);

    return await collection.findOne({
        _id: result.insertedId,
    });
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

// Xóa theo mã độc giả
async function remove(maDocGia) {
    const collection = await getCollection();

    return await collection.deleteOne({
        maDocGia: maDocGia,
    });
}

module.exports = {
    findAll,
    findOne,
    create,
    update,
    remove,
};
