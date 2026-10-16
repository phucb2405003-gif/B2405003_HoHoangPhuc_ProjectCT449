const connectDB = require("../config/database");
const { BORROW_DETAIL_COLLECTION } = require("../models/BorrowDetail");
const { BORROW_COLLECTION } = require("../models/Borrow");
const { BOOK_COLLECTION } = require("../models/Book");
const { withBorrowOperationLock } = require("./borrowOperationLock");
const { changeAvailable, undoAvailableChange } = require("./bookStockService");
const { isDeepStrictEqual } = require("node:util");

const CANCELLED = "Hủy";

const PENDING = "Chờ duyệt";
const DETAIL_ROLLBACK_FIELDS = ["_id", "maPhieu", "maSach", "trangThai", "hanTra", "ngayTra"];
const BORROW_ROLLBACK_FIELDS = [
    "_id", "maPhieu", "maDocGia", "maNhanVien", "soLuong", "ngayYeuCau", "ngayMuon", "trangThai"
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
        if (Object.prototype.hasOwnProperty.call(borrow, "trangThai") && borrow.trangThai !== PENDING) {
            return { invalidStatus: true };
        }

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
        let parentUpdateAttempted = false;
        const parentFields = totalDetails === 1
            ? { soLuong: 0, trangThai: CANCELLED }
            : { soLuong: borrow.soLuong - 1 };
        const originalStatusFilter = Object.prototype.hasOwnProperty.call(borrow, "trangThai")
            ? { trangThai: borrow.trangThai }
            : { trangThai: { $exists: false } };

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
            parentUpdateAttempted = true;
            const borrowUpdate = await borrowCollection.updateOne(
                { _id: borrow._id, maPhieu, soLuong: borrow.soLuong, ...originalStatusFilter },
                { $set: parentFields }
            );
            if (borrowUpdate.modifiedCount !== 1) {
                throw new Error("Phieu muon da thay doi; khong the cap nhat so luong sach");
            }

            return {
                detail: { maPhieu, maSach, trangThai: PENDING },
                tenSach: book.tenSach || maSach,
                borrowCancelled: totalDetails === 1
            };
        } catch (error) {
            const rollbackErrors = [];
            if (parentUpdateAttempted) {
                try {
                    const currentBorrow = await borrowCollection.findOne({ _id: borrow._id, maPhieu });
                    if (!currentBorrow) {
                        throw new Error("Khong tim thay phieu de rollback so luong va trang thai");
                    }
                    const isOriginal = matchesFields(currentBorrow, borrow, ["soLuong", "trangThai"]);
                    if (!isOriginal) {
                        const expectedBorrow = { ...borrow, ...parentFields };
                        if (!matchesFields(currentBorrow, expectedBorrow, ["soLuong", "trangThai"])) {
                            throw new Error("Du lieu phieu da thay doi ngoai thao tac; khong the rollback an toan");
                        }

                        const restore = { $set: { soLuong: borrow.soLuong } };
                        const expectedStatusFilter = {};
                        if (Object.prototype.hasOwnProperty.call(borrow, "trangThai")) {
                            restore.$set.trangThai = borrow.trangThai;
                            expectedStatusFilter.trangThai = parentFields.trangThai ?? borrow.trangThai;
                        } else {
                            restore.$unset = { trangThai: "" };
                            expectedStatusFilter.trangThai = parentFields.trangThai
                                ? parentFields.trangThai
                                : { $exists: false };
                        }

                        await assertOwned();
                        const restoredBorrow = await borrowCollection.updateOne(
                            {
                                _id: borrow._id,
                                maPhieu,
                                soLuong: parentFields.soLuong,
                                ...expectedStatusFilter
                            },
                            restore
                        );
                        if (restoredBorrow.matchedCount !== 1) {
                            throw new Error("Khong the khoi phuc soLuong va trang thai phieu");
                        }
                    }
                    const verifiedBorrow = await findVerifiedRecord(
                        borrowCollection,
                        borrow,
                        BORROW_ROLLBACK_FIELDS,
                        assertOwned
                    );
                    if (!verifiedBorrow) throw new Error("Khong xac minh duoc phieu sau rollback");
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
