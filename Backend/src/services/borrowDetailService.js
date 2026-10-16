const connectDB = require("../config/database");
const { BORROW_DETAIL_COLLECTION } = require("../models/BorrowDetail");
const { BORROW_COLLECTION } = require("../models/Borrow");
const { BOOK_COLLECTION } = require("../models/Book");
const { withBorrowOperationLock } = require("./borrowOperationLock");
const { changeAvailable, undoAvailableChange } = require("./bookStockService");
const { isDeepStrictEqual } = require("node:util");

const PENDING = "Chờ duyệt";
const DETAIL_ROLLBACK_FIELDS = ["_id", "maPhieu", "maSach", "trangThai", "hanTra", "ngayTra"];
const BORROW_ROLLBACK_FIELDS = [
    "_id", "maPhieu", "maDocGia", "maNhanVien", "soLuong", "ngayYeuCau", "ngayMuon"
];

function matchesFields(actual, expected, fields) {
    return fields.every((field) => {
        const actualHasField = Object.prototype.hasOwnProperty.call(actual, field);
        const expectedHasField = Object.prototype.hasOwnProperty.call(expected, field);
        return actualHasField === expectedHasField &&
            (!expectedHasField || isDeepStrictEqual(actual[field], expected[field]));
    });
}

async function findVerifiedRecord(collection, snapshot, fields, assertOwned) {
    await assertOwned();
    const current = await collection.findOne({ _id: snapshot._id });
    if (current && !matchesFields(current, snapshot, fields)) {
        throw new Error("Ban ghi sau rollback khong khop du lieu ban dau; can doi soat");
    }
    return current;
}

async function restoreDetail(collection, detail, assertOwned) {
    let insertError;
    try {
        await assertOwned();
        const result = await collection.insertOne(detail);
        if (!result?.acknowledged) {
            throw new Error("MongoDB khong xac nhan khoi phuc chi tiet phieu");
        }
    } catch (error) {
        insertError = error;
    }

    let current;
    try {
        current = await findVerifiedRecord(collection, detail, DETAIL_ROLLBACK_FIELDS, assertOwned);
    } catch (verifyError) {
        if (insertError) verifyError.cause = insertError;
        throw verifyError;
    }
    if (current) return;
    if (!insertError) {
        throw new Error("Chi tiet vua chen khong xac minh duoc sau khi MongoDB bao thanh cong; can doi soat");
    }

    // Retry only after a read confirms the original _id is absent. The stable _id
    // also makes a duplicate-key response safe to resolve through the same check.
    let retryError;
    try {
        await assertOwned();
        const result = await collection.insertOne(detail);
        if (!result?.acknowledged) {
            throw new Error("MongoDB khong xac nhan thu lai khoi phuc chi tiet phieu");
        }
    } catch (error) {
        retryError = error;
    }

    try {
        current = await findVerifiedRecord(collection, detail, DETAIL_ROLLBACK_FIELDS, assertOwned);
    } catch (verifyError) {
        verifyError.cause = retryError || insertError;
        throw verifyError;
    }
    if (current) return;

    const error = new Error("Khong the xac nhan khoi phuc chi tiet phieu; can doi soat");
    error.cause = retryError || insertError;
    throw error;
}

async function getCollection() {
    const db = await connectDB();
    return db.collection(BORROW_DETAIL_COLLECTION);
}

async function findAll() {
    return (await getCollection()).find({}).toArray();
}

async function findByMaPhieu(maPhieu) {
    return (await getCollection()).find({ maPhieu }).toArray();
}

function rollbackError(originalError, rollbackErrors) {
    const error = new Error("Xoa sach that bai va rollback khong hoan tat; can doi soat du lieu");
    error.statusCode = 503;
    error.cause = originalError;
    error.rollbackErrors = rollbackErrors;
    error.retainBorrowLock = true;
    return error;
}

async function remove(maPhieu, maSach, requester) {
    const db = await connectDB();
    const borrowCollection = db.collection(BORROW_COLLECTION);
    const detailCollection = db.collection(BORROW_DETAIL_COLLECTION);
    const bookCollection = db.collection(BOOK_COLLECTION);

    return withBorrowOperationLock(db, async (assertOwned) => {
        const borrow = await borrowCollection.findOne({ maPhieu });
        if (!borrow) return { notFound: true };

        if (requester?.loaiTaiKhoan === "DOCGIA") {
            const readerId = requester.maDocGia || requester.maTaiKhoan;
            if (!readerId || borrow.maDocGia !== readerId) return { forbidden: true };

            const allDetails = await detailCollection.find({ maPhieu }).toArray();
            if (!allDetails.length || allDetails.some((item) => item.trangThai !== PENDING)) {
                return { invalidStatus: true };
            }
        }

        const detail = await detailCollection.findOne({ maPhieu, maSach });
        if (!detail) return { detailNotFound: true };
        if (detail.trangThai !== PENDING) return { invalidStatus: true };

        const totalDetails = await detailCollection.countDocuments({ maPhieu });
        const book = await bookCollection.findOne({ maSach });
        if (!book) {
            const error = new Error(`Khong tim thay sach ${maSach}`);
            error.statusCode = 404;
            throw error;
        }
        const receipt = await changeAvailable(bookCollection, maSach, 1, assertOwned);
        let detailDeleteAttempted = false;
        let quantityUpdateAttempted = false;
        let quantityChanged = false;
        let borrowDeleteAttempted = false;

        try {
            await assertOwned();
            detailDeleteAttempted = true;
            const removeResult = await detailCollection.deleteOne({
                _id: detail._id,
                maPhieu,
                maSach,
                trangThai: PENDING
            });
            if (removeResult.deletedCount !== 1) {
                throw new Error("Chi tiet phieu da thay doi; vui long thu lai");
            }

            await assertOwned();
            quantityUpdateAttempted = true;
            const borrowUpdate = await borrowCollection.updateOne(
                { _id: borrow._id, maPhieu, soLuong: { $gt: 0 } },
                { $inc: { soLuong: -1 } }
            );
            if (borrowUpdate.modifiedCount !== 1) {
                throw new Error("So luong sach tren phieu khong hop le");
            }
            quantityChanged = true;

            if (totalDetails === 1) {
                await assertOwned();
                borrowDeleteAttempted = true;
                const deleteResult = await borrowCollection.deleteOne({ _id: borrow._id, maPhieu });
                if (deleteResult.deletedCount !== 1) {
                    throw new Error("Khong the xoa phieu rong");
                }
            }

            return {
                detail: { maPhieu, maSach, trangThai: PENDING },
                tenSach: book.tenSach || maSach,
                borrowDeleted: totalDetails === 1
            };
        } catch (error) {
            const rollbackErrors = [];
            let parentExists = true;

            if (borrowDeleteAttempted) {
                try {
                    parentExists = Boolean(await borrowCollection.findOne({ _id: borrow._id }));
                    if (!parentExists) {
                        await assertOwned();
                        const restoredBorrow = await borrowCollection.insertOne(borrow);
                        if (!restoredBorrow.acknowledged) throw new Error("Khong the khoi phuc phieu muon");
                        parentExists = true;
                    }
                } catch (rollbackError) {
                    rollbackErrors.push(rollbackError);
                }
            }

            if (rollbackErrors.length === 0 && quantityChanged && parentExists) {
                try {
                    await assertOwned();
                    const currentBorrow = await borrowCollection.findOne({ _id: borrow._id });
                    if (currentBorrow?.soLuong === borrow.soLuong - 1) {
                        const restoreQuantity = await borrowCollection.updateOne(
                            { _id: borrow._id, maPhieu, soLuong: borrow.soLuong - 1 },
                            { $set: { soLuong: borrow.soLuong } }
                        );
                        if (restoreQuantity.matchedCount !== 1) {
                            throw new Error("So luong phieu da thay doi, khong the rollback an toan");
                        }
                    } else if (currentBorrow?.soLuong !== borrow.soLuong) {
                        throw new Error("Khong xac dinh duoc soLuong de rollback an toan");
                    }
                } catch (rollbackError) {
                    rollbackErrors.push(rollbackError);
                }
            } else if (rollbackErrors.length === 0 && quantityUpdateAttempted && parentExists) {
                try {
                    const currentBorrow = await borrowCollection.findOne({ _id: borrow._id });
                    if (currentBorrow?.soLuong === borrow.soLuong - 1) {
                        await assertOwned();
                        const restoreQuantity = await borrowCollection.updateOne(
                            { _id: borrow._id, maPhieu, soLuong: borrow.soLuong - 1 },
                            { $set: { soLuong: borrow.soLuong } }
                        );
                        if (restoreQuantity.matchedCount !== 1) {
                            throw new Error("Khong the khoi phuc soLuong cua phieu");
                        }
                    } else if (currentBorrow?.soLuong !== borrow.soLuong) {
                        throw new Error("Khong xac dinh duoc soLuong de rollback an toan");
                    }
                } catch (rollbackError) {
                    rollbackErrors.push(rollbackError);
                }
            }

            if (rollbackErrors.length === 0 && detailDeleteAttempted) {
                try {
                    const currentDetail = await findVerifiedRecord(
                        detailCollection,
                        detail,
                        DETAIL_ROLLBACK_FIELDS,
                        assertOwned
                    );
                    if (!currentDetail) {
                        await restoreDetail(detailCollection, detail, assertOwned);
                    }
                } catch (rollbackError) {
                    rollbackErrors.push(rollbackError);
                }
            }

            if (rollbackErrors.length === 0) {
                try {
                    const currentBorrow = await findVerifiedRecord(
                        borrowCollection,
                        borrow,
                        BORROW_ROLLBACK_FIELDS,
                        assertOwned
                    );
                    if (!currentBorrow) {
                        throw new Error("Khong tim thay phieu sau rollback; can doi soat");
                    }
                    const currentDetail = await findVerifiedRecord(
                        detailCollection,
                        detail,
                        DETAIL_ROLLBACK_FIELDS,
                        assertOwned
                    );
                    if (!currentDetail) {
                        throw new Error("Khong tim thay chi tiet sau rollback; can doi soat");
                    }
                    await undoAvailableChange(bookCollection, receipt, assertOwned);
                } catch (rollbackError) {
                    rollbackErrors.push(rollbackError);
                }
            }

            if (rollbackErrors.length) throw rollbackError(error, rollbackErrors);
            throw error;
        }
    });
}

module.exports = { findAll, findByMaPhieu, remove };
