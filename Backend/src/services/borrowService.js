const connectDB = require("../config/database");
const { BORROW_COLLECTION } = require("../models/Borrow");

async function getCollection() {
    const db = await connectDB();
    return db.collection(BORROW_COLLECTION);
}

async function findAll() {
    const collection = await getCollection();
    return await collection.find({}).toArray();
}

async function findOne(maPhieu) {
    const collection = await getCollection();

    return await collection.findOne({
        maPhieu: maPhieu
    });
}

async function create(borrow) {
    const collection = await getCollection();

    const result = await collection.insertOne(borrow);

    return await collection.findOne({
        _id: result.insertedId
    });
}

async function update(maPhieu, borrow) {
    const collection = await getCollection();

    await collection.updateOne(
        {
            maPhieu: maPhieu
        },
        {
            $set: borrow
        }
    );

    return await findOne(maPhieu);
}

async function updateStatus(maPhieu, trangThai, maNhanVien = null) {
    const collection = await getCollection();

    const updateData = {
        trangThai: trangThai
    };

    if (maNhanVien) {
        updateData.maNhanVien = maNhanVien;
    }

    await collection.updateOne(
        {
            maPhieu: maPhieu
        },
        {
            $set: updateData
        }
    );

    return await findOne(maPhieu);
}

async function remove(maPhieu) {
    const collection = await getCollection();

    return await collection.deleteOne({
        maPhieu: maPhieu
    });
}

module.exports = {
    findAll,
    findOne,
    create,
    update,
    updateStatus,
    remove
};