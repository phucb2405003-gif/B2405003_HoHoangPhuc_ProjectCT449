const { ObjectId } = require("mongodb");
const connectDB = require("../config/database");
const { PUBLISHER_COLLECTION } = require("../models/Publisher");
const { BOOK_COLLECTION } = require("../models/Book");
const { generateCode } = require("./codeGeneratorService");
const { withBorrowOperationLock } = require("./borrowOperationLock");
const { getUpdateFields, validateCreateFields } = require("./updatePayload");

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
    const publisherToCreate = validateCreateFields(
        publisher,
        { tenNXB: "string" },
        ["tenNXB"]
    );
    const collection = await getCollection();
    const normalizedPublisher = {
        ...publisherToCreate,
        tenNXB: normalizeWhitespace(publisherToCreate.tenNXB),
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
    const publisherToUpdate = getUpdateFields(publisher, { tenNXB: "string" });
    const collection = await getCollection();

    if (!(await collection.findOne({ maNXB }))) {
        const error = new Error("Khong tim thay nha xuat ban");
        error.code = "NOT_FOUND";
        throw error;
    }

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

    const result = await collection.updateOne(
        { maNXB: maNXB },
        { $set: publisherToUpdate }
    );

    if (result.matchedCount === 0) {
        const error = new Error("Khong tim thay nha xuat ban");
        error.code = "NOT_FOUND";
        throw error;
    }

    return await findOne(maNXB);
}

// Xóa nhà xuất bản
async function remove(maNXB) {
    const db = await connectDB();
    return withBorrowOperationLock(db, async (assertOwned) => {
        const publisherCollection = db.collection(PUBLISHER_COLLECTION);
        const bookCollection = db.collection(BOOK_COLLECTION);

        if (!(await publisherCollection.findOne({ maNXB }))) {
            const error = new Error("Khong tim thay nha xuat ban");
            error.code = "NOT_FOUND";
            throw error;
        }

        if (await bookCollection.findOne({ maNXB })) {
            const error = new Error("Nha xuat ban dang duoc sach su dung");
            error.code = "PUBLISHER_REFERENCED";
            throw error;
        }

        await assertOwned();
        return await publisherCollection.deleteOne({
            maNXB: maNXB,
        });
    });
}

module.exports = {
    findAll,
    findOne,
    create,
    update,
    remove,
};
