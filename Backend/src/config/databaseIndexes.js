const { ACCOUNT_COLLECTION } = require("../models/Account");
const { USER_COLLECTION } = require("../models/User");
const { EMPLOYEE_COLLECTION } = require("../models/Employee");
const { BOOK_COLLECTION } = require("../models/Book");
const { PUBLISHER_COLLECTION } = require("../models/Publisher");
const { BORROW_COLLECTION } = require("../models/Borrow");

const UNIQUE_INDEXES = [
    { collection: ACCOUNT_COLLECTION, field: "maTaiKhoan" },
    { collection: ACCOUNT_COLLECTION, field: "tenDangNhap" },
    { collection: USER_COLLECTION, field: "maDocGia" },
    { collection: EMPLOYEE_COLLECTION, field: "maNhanVien" },
    { collection: BOOK_COLLECTION, field: "maSach" },
    { collection: PUBLISHER_COLLECTION, field: "maNXB" },
    { collection: BORROW_COLLECTION, field: "maPhieu" },
];

function hasExactKey(index, field) {
    const entries = Object.entries(index.key || {});
    return entries.length === 1 && entries[0][0] === field && entries[0][1] === 1;
}

function isFullUniqueIndex(index) {
    const simpleCollation = !index.collation || index.collation.locale === "simple";
    return index.unique === true &&
        !index.sparse &&
        !index.partialFilterExpression &&
        simpleCollation;
}

async function ensureIndexes(db) {
    for (const { collection: collectionName, field } of UNIQUE_INDEXES) {
        const collection = db.collection(collectionName);
        let indexes;
        try {
            indexes = await collection.listIndexes().toArray();
        } catch (cause) {
            const error = new Error(
                `Could not inspect MongoDB indexes for ${collectionName}.${field}`
            );
            error.code = "UNIQUE_INDEX_INSPECTION_FAILED";
            error.cause = cause;
            throw error;
        }
        const existing = indexes.find((index) => hasExactKey(index, field));

        if (existing) {
            if (!isFullUniqueIndex(existing)) {
                const error = new Error(
                    `MongoDB index for ${collectionName}.${field} exists with incompatible options`
                );
                error.code = "UNIQUE_INDEX_CONFIGURATION_CONFLICT";
                throw error;
            }
            continue;
        }

        let duplicates;
        try {
            duplicates = await collection.aggregate([
                { $group: { _id: `$${field}`, count: { $sum: 1 } } },
                { $match: { count: { $gt: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 20 },
            ]).toArray();
        } catch (cause) {
            const error = new Error(
                `Could not inspect data for MongoDB unique index ${collectionName}.${field}`
            );
            error.code = "UNIQUE_INDEX_INSPECTION_FAILED";
            error.cause = cause;
            throw error;
        }
        if (duplicates.length) {
            const conflicts = duplicates.map(({ _id, count }) => ({ value: _id ?? null, count }));
            const error = new Error(
                `Duplicate data prevents MongoDB unique index creation for ${collectionName}.${field}: ${JSON.stringify(conflicts)}`
            );
            error.code = "UNIQUE_INDEX_DATA_CONFLICT";
            throw error;
        }

        const indexName = `uq_${field}`;
        try {
            await collection.createIndex({ [field]: 1 }, { unique: true, name: indexName });
        } catch (cause) {
            const error = new Error(
                `Could not create MongoDB unique index for ${collectionName}.${field}`
            );
            error.code = "UNIQUE_INDEX_CREATION_FAILED";
            error.cause = cause;
            throw error;
        }

        let createdIndexes;
        try {
            createdIndexes = await collection.listIndexes().toArray();
        } catch (cause) {
            const error = new Error(
                `Could not verify MongoDB unique index for ${collectionName}.${field}`
            );
            error.code = "UNIQUE_INDEX_VERIFICATION_FAILED";
            error.cause = cause;
            throw error;
        }
        const created = createdIndexes.find((index) => hasExactKey(index, field));
        if (!created || !isFullUniqueIndex(created)) {
            const error = new Error(
                `MongoDB unique index verification failed for ${collectionName}.${field}`
            );
            error.code = "UNIQUE_INDEX_VERIFICATION_FAILED";
            throw error;
        }
    }
}

module.exports = { UNIQUE_INDEXES, ensureIndexes };
