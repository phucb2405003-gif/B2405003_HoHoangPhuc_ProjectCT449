const connectDB = require("../config/database");
const { BORROW_COLLECTION } = require("../models/Borrow");
const { BORROW_DETAIL_COLLECTION } = require("../models/BorrowDetail");
const { BOOK_COLLECTION } = require("../models/Book");
const { USER_COLLECTION } = require("../models/User");
const { generateCode } = require("./codeGeneratorService");
const { withBorrowOperationLock } = require("./borrowOperationLock");
const { changeAvailable, undoAvailableChange } = require("./bookStockService");
const { ObjectId } = require("mongodb");

const STATUSES = {
    PENDING: "Chờ duyệt",
    BORROWED: "Đang mượn",
    RETURNED: "Đã trả",
    REJECTED: "Từ chối",
    CANCELLED: "Hủy"
};
const MAX_BOOKS_PER_BORROW = 5;
const MAX_ACTIVE_BOOKS = 5;
const MAX_PENDING_BORROWS = 3;
const ACTIVE_STATUSES = [STATUSES.PENDING, STATUSES.BORROWED];

function normalizeDetails(details) {
    if (!Array.isArray(details) || details.length === 0) {
        const error = new Error("Phieu muon phai co it nhat mot sach");
        error.statusCode = 400;
        throw error;
    }

    if (details.length > MAX_BOOKS_PER_BORROW) {
        const error = new Error("Moi phieu muon chi duoc toi da 5 sach");
        error.statusCode = 400;
        throw error;
    }

    const seen = new Set();
    return details.map((detail) => {
        if (!detail?.maSach || seen.has(detail.maSach)) {
            const error = new Error("maSach bi thieu hoac trung trong phieu");
            error.statusCode = 400;
            throw error;
        }
        seen.add(detail.maSach);
        return { maSach: detail.maSach, hanTra: detail.hanTra || null };
    });
}

async function getCollection() {
    const db = await connectDB();
    return db.collection(BORROW_COLLECTION);
}

async function findAll() {
    return (await getCollection()).find({}).toArray();
}

async function findOne(maPhieu) {
    return (await getCollection()).findOne({ maPhieu });
}

async function findByMaDocGia(maDocGia) {
    return (await getCollection()).find({ maDocGia }).toArray();
}

function makeRollbackError(message, originalError, rollbackErrors) {
    const error = new Error(message);
    error.cause = originalError;
    error.rollbackErrors = rollbackErrors;
    error.statusCode = 500;
    error.retainBorrowLock = true;
    return error;
}

function stopOnUncertainStockChange(error) {
    if (error?.stockChangeState === "uncertain") {
        error.retainBorrowLock = true;
        throw error;
    }
}

async function reserveBook(bookCollection, maSach, assertOwned) {
    return changeAvailable(bookCollection, maSach, -1, assertOwned);
}

async function restoreStock(bookCollection, maSach, amount = 1, assertOwned) {
    return changeAvailable(bookCollection, maSach, amount, assertOwned);
}

async function create(borrow) {
    const db = await connectDB();
    const borrowCollection = db.collection(BORROW_COLLECTION);
    const detailCollection = db.collection(BORROW_DETAIL_COLLECTION);
    const bookCollection = db.collection(BOOK_COLLECTION);
    const details = normalizeDetails(borrow.borrowDetails || borrow.detaiMuon);
    const direct = borrow.mode === "direct";

    if (!borrow.maDocGia || (direct && !borrow.maNhanVien)) {
        const error = new Error("Thieu thong tin nguoi muon");
        error.statusCode = 400;
        throw error;
    }

    return withBorrowOperationLock(db, async (assertOwned) => {
        if (direct) {
            const reader = await db.collection(USER_COLLECTION).findOne({
                maDocGia: borrow.maDocGia
            });
            if (!reader) {
                const error = new Error("Khong tim thay doc gia");
                error.statusCode = 400;
                throw error;
            }
        } else {
            const readerBorrows = await borrowCollection.find(
                { maDocGia: borrow.maDocGia },
                { projection: { maPhieu: 1 } }
            ).toArray();
            const borrowIds = readerBorrows.map((item) => item.maPhieu);
            const activeDetails = borrowIds.length
                ? await detailCollection.find({
                    maPhieu: { $in: borrowIds },
                    trangThai: { $in: ACTIVE_STATUSES }
                }).toArray()
                : [];

            const duplicate = activeDetails.find((item) =>
                details.some((detail) => detail.maSach === item.maSach)
            );
            if (duplicate) {
                const error = new Error(
                    duplicate.trangThai === STATUSES.PENDING
                        ? `Ban da dang ky sach ${duplicate.maSach} trong phieu ${duplicate.maPhieu} va dang cho duyet`
                        : `Ban dang muon sach ${duplicate.maSach} trong phieu ${duplicate.maPhieu}`
                );
                error.statusCode = 400;
                throw error;
            }

            const activeBookCount = activeDetails.length;
            if (activeBookCount + details.length > MAX_ACTIVE_BOOKS) {
                const error = new Error(
                    `Vuot gioi han ${MAX_ACTIVE_BOOKS} sach dang cho duyet hoac dang muon`
                );
                error.statusCode = 400;
                throw error;
            }

            const pendingBorrowIds = new Set(
                activeDetails
                    .filter((item) => item.trangThai === STATUSES.PENDING)
                    .map((item) => item.maPhieu)
            );
            if (pendingBorrowIds.size >= MAX_PENDING_BORROWS) {
                const error = new Error(
                    `Moi doc gia chi duoc co toi da ${MAX_PENDING_BORROWS} phieu cho duyet`
                );
                error.statusCode = 400;
                throw error;
            }
        }

        const reserved = [];
        let maPhieu;
        let borrowInsertAttempted = false;
        const borrowId = new ObjectId();
        const detailIds = details.map(() => new ObjectId());
        try {
            maPhieu = await generateCode("PM");
            const existingBorrow = await borrowCollection.findOne({ maPhieu });
            const existingDetails = await detailCollection.findOne({ maPhieu });
            if (existingBorrow || existingDetails) {
                const error = new Error(`Ma phieu ${maPhieu} da ton tai`);
                error.statusCode = 409;
                throw error;
            }

            for (const detail of details) {
                const receipt = await reserveBook(bookCollection, detail.maSach, assertOwned);
                reserved.push(receipt);
            }

            const record = {
                _id: borrowId,
                maPhieu,
                maDocGia: borrow.maDocGia,
                maNhanVien: direct ? borrow.maNhanVien : null,
                soLuong: details.length,
                ngayYeuCau: direct ? null : new Date(),
                ngayMuon: direct ? new Date() : null
            };
            await assertOwned();
            borrowInsertAttempted = true;
            const borrowInsert = await borrowCollection.insertOne(record);
            if (!borrowInsert.acknowledged) {
                throw new Error("MongoDB khong xac nhan da tao phieu muon");
            }

            const detailRecords = details.map((detail, index) => ({
                _id: detailIds[index],
                maPhieu,
                maSach: detail.maSach,
                hanTra: detail.hanTra,
                ngayTra: null,
                trangThai: direct ? STATUSES.BORROWED : STATUSES.PENDING
            }));
            await assertOwned();
            const detailInsert = await detailCollection.insertMany(detailRecords);
            if (detailInsert.insertedCount !== detailRecords.length) {
                throw new Error("MongoDB khong xac nhan da tao day du chi tiet phieu");
            }
            return await findOne(maPhieu);
        } catch (error) {
            stopOnUncertainStockChange(error);
            const rollbackErrors = [];
            if (maPhieu) {
                try {
                    await assertOwned();
                    await detailCollection.deleteMany({ _id: { $in: detailIds } });
                    const remaining = await detailCollection.countDocuments({
                        _id: { $in: detailIds }
                    });
                    if (remaining !== 0) {
                        throw new Error("Mot so chi tiet vua tao van con sau rollback");
                    }
                } catch (rollbackError) {
                    rollbackErrors.push(rollbackError);
                }
            }
            if (borrowInsertAttempted && rollbackErrors.length === 0) {
                try {
                    await assertOwned();
                    await borrowCollection.deleteOne({ _id: borrowId });
                    if (await borrowCollection.findOne({ _id: borrowId })) {
                        throw new Error("Phieu vua tao van con sau rollback");
                    }
                } catch (rollbackError) {
                    rollbackErrors.push(rollbackError);
                }
            }
            for (const receipt of rollbackErrors.length ? [] : reserved.reverse()) {
                try {
                    await undoAvailableChange(bookCollection, receipt, assertOwned);
                } catch (rollbackError) {
                    rollbackErrors.push(rollbackError);
                    break;
                }
            }
            if (rollbackErrors.length) {
                throw makeRollbackError(
                    "Tao phieu that bai va rollback khong hoan tat; can kiem tra du lieu",
                    error,
                    rollbackErrors
                );
            }
            throw error;
        }
    });
}

async function changeStatus(maPhieu, nextStatus, maNhanVien, lyDoTuChoi) {
    const db = await connectDB();
    const borrowCollection = db.collection(BORROW_COLLECTION);
    const detailCollection = db.collection(BORROW_DETAIL_COLLECTION);
    const bookCollection = db.collection(BOOK_COLLECTION);

    return withBorrowOperationLock(db, async (assertOwned) => {
        const borrow = await borrowCollection.findOne({ maPhieu });
        if (!borrow) return { notFound: true };

        const pendingDetails = await detailCollection.find({
            maPhieu,
            trangThai: STATUSES.PENDING
        }).toArray();
        if (!pendingDetails.length) return { invalidStatus: true };
        if (![STATUSES.BORROWED, STATUSES.REJECTED, STATUSES.CANCELLED].includes(nextStatus)) {
            return { invalidStatus: true };
        }

        const detailIds = pendingDetails.map((detail) => detail._id);
        const stockReceipts = [];
        const approvedAt = new Date();
        let stateUpdateAttempted = false;
        let parentUpdateAttempted = false;
        try {
            if (nextStatus !== STATUSES.BORROWED) {
                for (const detail of pendingDetails) {
                    stockReceipts.push(
                        await restoreStock(bookCollection, detail.maSach, 1, assertOwned)
                    );
                }
            }

            await assertOwned();
            stateUpdateAttempted = true;
            const changed = await detailCollection.updateMany(
                {
                    _id: { $in: detailIds },
                    maPhieu,
                    trangThai: STATUSES.PENDING
                },
                { $set: { trangThai: nextStatus } }
            );
            if (changed.modifiedCount !== pendingDetails.length) {
                throw new Error("So chi tiet duoc cap nhat khong khop du lieu da doc");
            }

            if (nextStatus === STATUSES.BORROWED) {
                await assertOwned();
                parentUpdateAttempted = true;
                const parentUpdate = await borrowCollection.updateOne(
                    { _id: borrow._id, maPhieu },
                    { $set: { maNhanVien, ngayMuon: approvedAt } }
                );
                if (parentUpdate.matchedCount !== 1) {
                    throw new Error("Khong the cap nhat thong tin phieu muon");
                }
            } else if (lyDoTuChoi) {
                await assertOwned();
                parentUpdateAttempted = true;
                const parentUpdate = await borrowCollection.updateOne(
                    { _id: borrow._id, maPhieu },
                    { $set: { lyDoTuChoi } }
                );
                if (parentUpdate.matchedCount !== 1) {
                    throw new Error("Khong the luu ly do tu choi");
                }
            }
        } catch (error) {
            stopOnUncertainStockChange(error);
            const rollbackErrors = [];

            if (stateUpdateAttempted) {
                try {
                    await assertOwned();
                    await detailCollection.updateMany(
                        {
                            _id: { $in: detailIds },
                            maPhieu,
                            trangThai: nextStatus
                        },
                        { $set: { trangThai: STATUSES.PENDING } }
                    );
                    const changedRemain = await detailCollection.countDocuments({
                        _id: { $in: detailIds },
                        maPhieu,
                        trangThai: nextStatus
                    });
                    if (changedRemain !== 0) {
                        throw new Error("Mot so chi tiet khong the khoi phuc ve cho duyet");
                    }
                } catch (rollbackError) {
                    rollbackErrors.push(rollbackError);
                }
            }

            if (parentUpdateAttempted && rollbackErrors.length === 0) {
                try {
                    await assertOwned();
                    if (nextStatus === STATUSES.BORROWED) {
                        const set = {};
                        const unset = {};
                        for (const field of ["maNhanVien", "ngayMuon"]) {
                            if (Object.prototype.hasOwnProperty.call(borrow, field)) {
                                set[field] = borrow[field];
                            } else {
                                unset[field] = "";
                            }
                        }
                        const filter = {
                            _id: borrow._id,
                            maPhieu,
                            maNhanVien,
                            ngayMuon: approvedAt
                        };
                        const update = {};
                        if (Object.keys(set).length) update.$set = set;
                        if (Object.keys(unset).length) update.$unset = unset;
                        const result = await borrowCollection.updateOne(filter, update);
                        if (result.matchedCount !== 1) {
                            throw new Error("Thong tin phieu da thay doi, khong the rollback an toan");
                        }
                    } else if (lyDoTuChoi) {
                        const set = {};
                        const unset = {};
                        if (Object.prototype.hasOwnProperty.call(borrow, "lyDoTuChoi")) {
                            set.lyDoTuChoi = borrow.lyDoTuChoi;
                        } else {
                            unset.lyDoTuChoi = "";
                        }
                        const restoredReason = await borrowCollection.updateOne(
                            { _id: borrow._id, maPhieu, lyDoTuChoi },
                            { ...(Object.keys(set).length ? { $set: set } : {}),
                                ...(Object.keys(unset).length ? { $unset: unset } : {}) }
                        );
                        if (restoredReason.matchedCount !== 1) {
                            const currentBorrow = await borrowCollection.findOne({ _id: borrow._id });
                            if (currentBorrow?.lyDoTuChoi !== borrow.lyDoTuChoi) {
                                throw new Error("Khong the khoi phuc ly do tu choi");
                            }
                        }
                    }
                } catch (rollbackError) {
                    rollbackErrors.push(rollbackError);
                }
            }

            for (const receipt of rollbackErrors.length ? [] : stockReceipts.reverse()) {
                try {
                    await undoAvailableChange(bookCollection, receipt, assertOwned);
                } catch (rollbackError) {
                    rollbackErrors.push(rollbackError);
                    break;
                }
            }
            if (rollbackErrors.length) {
                throw makeRollbackError(
                    "Cap nhat trang thai that bai va rollback khong hoan tat",
                    error,
                    rollbackErrors
                );
            }
            throw error;
        }

        return { borrow: await findOne(maPhieu) };
    });
}

async function returnBook(maPhieu, maSach) {
    const db = await connectDB();
    const borrowCollection = db.collection(BORROW_COLLECTION);
    const detailCollection = db.collection(BORROW_DETAIL_COLLECTION);
    const bookCollection = db.collection(BOOK_COLLECTION);

    return withBorrowOperationLock(db, async (assertOwned) => {
        const borrow = await borrowCollection.findOne({ maPhieu });
        if (!borrow) return { notFound: true };
        const detail = await detailCollection.findOne({ maPhieu, maSach });
        if (!detail) return { detailNotFound: true };
        if (detail.trangThai !== STATUSES.BORROWED) return { invalidStatus: true };

        const ngayTra = new Date();
        await assertOwned();
        try {
            const update = await detailCollection.updateOne(
                { _id: detail._id, maPhieu, maSach, trangThai: STATUSES.BORROWED },
                { $set: { trangThai: STATUSES.RETURNED, ngayTra } }
            );
            if (update.modifiedCount !== 1) return { invalidStatus: true };
        } catch (error) {
            let current;
            try {
                current = await detailCollection.findOne({ _id: detail._id });
            } catch (readError) {
                const uncertainError = makeRollbackError(
                    "Khong xac dinh duoc trang thai tra sach; can doi soat",
                    error,
                    [readError]
                );
                throw uncertainError;
            }
            const writeWasApplied =
                current?.trangThai === STATUSES.RETURNED &&
                current.ngayTra instanceof Date &&
                current.ngayTra.getTime() === ngayTra.getTime();
            if (!writeWasApplied && current?.trangThai === STATUSES.BORROWED) {
                throw error;
            }
            if (!writeWasApplied) {
                throw makeRollbackError(
                    "Khong xac dinh duoc trang thai tra sach; can doi soat",
                    error,
                    [new Error("Chi tiet phieu khong con o trang thai cu hoac moi")]
                );
            }
        }

        try {
            await restoreStock(bookCollection, maSach, 1, assertOwned);
        } catch (error) {
            if (error.stockChangeState === "uncertain") {
                error.message = `Khong the xac nhan hoan kho sach ${maSach}; chi tiet da duoc danh dau da tra, can doi soat`;
                throw error;
            }
            try {
                await assertOwned();
                const rollback = await detailCollection.updateOne(
                    { _id: detail._id, maPhieu, maSach, trangThai: STATUSES.RETURNED, ngayTra },
                    { $set: { trangThai: STATUSES.BORROWED, ngayTra: null } }
                );
                if (rollback.modifiedCount !== 1) {
                    throw new Error("Khong the khoi phuc trang thai sach dang muon");
                }
            } catch (rollbackError) {
                throw makeRollbackError("Tra sach that bai va khong the khoi phuc trang thai chi tiet", error, [rollbackError]);
            }
            throw error;
        }

        return {
            borrow: await findOne(maPhieu),
            detail: await detailCollection.findOne({ maPhieu, maSach })
        };
    });
}

async function deletePendingBorrow(maPhieu, requester) {
    const db = await connectDB();
    const borrowCollection = db.collection(BORROW_COLLECTION);
    const detailCollection = db.collection(BORROW_DETAIL_COLLECTION);
    const bookCollection = db.collection(BOOK_COLLECTION);

    return withBorrowOperationLock(db, async (assertOwned) => {
        const borrow = await borrowCollection.findOne({ maPhieu });
        if (!borrow) return { notFound: true };

        if (requester?.loaiTaiKhoan !== "DOCGIA") return { forbidden: true };
        const readerId = requester.maDocGia || requester.maTaiKhoan;
        if (!readerId || borrow.maDocGia !== readerId) return { forbidden: true };
        if (borrow.maNhanVien || !borrow.ngayYeuCau) return { invalidStatus: true };

        const details = await detailCollection.find({ maPhieu }).toArray();
        if (!details.length || details.some((detail) => detail.trangThai !== STATUSES.PENDING)) {
            return { invalidStatus: true };
        }

        const restored = [];
        let parentDeleteAttempted = false;
        try {
            for (const detail of details) {
                const receipt = await restoreStock(bookCollection, detail.maSach, 1, assertOwned);
                restored.push(receipt);
            }
            await assertOwned();
            const deleteDetails = await detailCollection.deleteMany({
                maPhieu,
                trangThai: STATUSES.PENDING
            });
            if (deleteDetails.deletedCount !== details.length) {
                throw new Error("Khong the xoa day du chi tiet phieu muon");
            }
            await assertOwned();
            parentDeleteAttempted = true;
            const deleteBorrow = await borrowCollection.deleteOne({
                _id: borrow._id,
                maPhieu
            });
            if (deleteBorrow.deletedCount !== 1) {
                throw new Error("Khong the xoa phieu muon");
            }
            if (await borrowCollection.findOne({ _id: borrow._id })) {
                throw new Error("Phieu muon van con sau thao tac xoa");
            }
            return { deleted: true };
        } catch (error) {
            stopOnUncertainStockChange(error);
            let currentBorrow;
            try {
                currentBorrow = await borrowCollection.findOne({ _id: borrow._id, maPhieu });
            } catch (readError) {
                throw makeRollbackError(
                    "Khong xac dinh duoc ket qua xoa phieu; can doi soat du lieu",
                    error,
                    [readError]
                );
            }
            if (!currentBorrow && parentDeleteAttempted) {
                // Parent deletion is the final write. Its absence confirms the whole
                // standalone sequence reached its successful end despite an error reply.
                return { deleted: true };
            }

            const rollbackErrors = [];
            try {
                await assertOwned();
                const present = await detailCollection.find(
                    { maPhieu },
                    { projection: { _id: 1 } }
                ).toArray();
                const presentIds = new Set(present.map((item) => String(item._id)));
                const missing = details.filter((item) => !presentIds.has(String(item._id)));
                if (missing.length) {
                    const restoredDetails = await detailCollection.insertMany(missing);
                    if (restoredDetails.insertedCount !== missing.length) {
                        throw new Error("Khong the khoi phuc day du chi tiet phieu");
                    }
                }
                const remainingDetails = await detailCollection.countDocuments({ maPhieu });
                if (remainingDetails !== details.length) {
                    throw new Error("Khong the khoi phuc day du chi tiet phieu");
                }
            } catch (rollbackError) {
                rollbackErrors.push(rollbackError);
            }
            for (const receipt of rollbackErrors.length ? [] : restored.reverse()) {
                try {
                    await undoAvailableChange(bookCollection, receipt, assertOwned);
                } catch (rollbackError) {
                    rollbackErrors.push(rollbackError);
                    break;
                }
            }
            if (rollbackErrors.length) {
                throw makeRollbackError("Xoa phieu that bai va rollback khong hoan tat", error, rollbackErrors);
            }
            throw error;
        }
    });
}

module.exports = {
    findAll,
    findOne,
    findByMaDocGia,
    create,
    changeStatus,
    returnBook,
    deletePendingBorrow,
    STATUSES
};
