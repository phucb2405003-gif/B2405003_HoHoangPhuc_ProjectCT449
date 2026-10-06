const { ObjectId } = require("mongodb");
const connectDB = require("../config/database");
const { PUBLISHER_COLLECTION } = require("../models/Publisher");
const { generateCode } = require("./codeGeneratorService");

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

function normalizeWhitespace(value) {
    return value.trim().replace(/\s+/g, " ");
}

function duplicateNameError() {
    const error = new Error("Ten nha xuat ban da ton tai");
    error.code = "DUPLICATE_NAME";
    return error;
}

// Thêm nhà xuất bản
async function create(publisher) {
    const collection = await getCollection();
    const normalizedPublisher = {
        ...publisher,
        tenNXB: normalizeWhitespace(publisher.tenNXB),
    };
    const escapedName = normalizedPublisher.tenNXB.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
    const whitespaceFlexibleName = escapedName.replace(/ /g, "\\s+");

    const existingPublisher = await collection.findOne({
        tenNXB: {
            $regex: `^\\s*${whitespaceFlexibleName}\\s*$`,
            $options: "i",
        },
    });

    if (existingPublisher) {
        throw duplicateNameError();
    }

    const maNXB = await generateCode("NXB");
    const publisherToInsert = {
        ...normalizedPublisher,
        maNXB,
    };
    const result = await collection.insertOne(publisherToInsert);

    return await collection.findOne({
        _id: result.insertedId,
    });
}

// Cập nhật nhà xuất bản
async function update(maNXB, publisher) {
    const collection = await getCollection();
    const publisherToUpdate = { ...publisher };
    delete publisherToUpdate.maNXB;

    if (publisherToUpdate.tenNXB !== undefined) {
        publisherToUpdate.tenNXB = normalizeWhitespace(
            publisherToUpdate.tenNXB
        );

        const escapedName = publisherToUpdate.tenNXB.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );
        const whitespaceFlexibleName = escapedName.replace(/ /g, "\\s+");
        const existingPublisher = await collection.findOne({
            maNXB: { $ne: maNXB },
            tenNXB: {
                $regex: `^\\s*${whitespaceFlexibleName}\\s*$`,
                $options: "i",
            },
        });

        if (existingPublisher) {
            throw duplicateNameError();
        }
    }

    await collection.updateOne(
        { maNXB: maNXB },
        { $set: publisherToUpdate }
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
