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
const BORROW_STATUSES = {
    PENDING: "Chờ duyệt",
    APPROVED: "Đã duyệt",
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
        if (
            typeof detail?.maSach !== "string" ||
            detail.maSach.trim().length === 0 ||
            seen.has(detail.maSach)
        ) {
            const error = new Error("maSach bi thieu hoac trung trong phieu");
            error.statusCode = 400;
            throw error;
        }
        seen.add(detail.maSach);
        return { maSach: detail.maSach, hanTra: detail.hanTra || null };
    });
}

function addOneCalendarMonth(date) {
    const source = new Date(date);
    const year = source.getUTCFullYear();
    const month = source.getUTCMonth();
    const day = source.getUTCDate();
    const targetMonthStart = new Date(Date.UTC(year, month + 1, 1));
    const lastDay = new Date(Date.UTC(
        targetMonthStart.getUTCFullYear(),
        targetMonthStart.getUTCMonth() + 1,
        0
    )).getUTCDate();
    targetMonthStart.setUTCDate(Math.min(day, lastDay));
    targetMonthStart.setUTCHours(
        source.getUTCHours(),
        source.getUTCMinutes(),
        source.getUTCSeconds(),
        source.getUTCMilliseconds()
    );
    return targetMonthStart;
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

async function getBorrowStatus(borrow, detailCollection) {
    if (Object.prototype.hasOwnProperty.call(borrow, "trangThai")) return borrow.trangThai;

    // Legacy parent records have no status. Infer only unambiguous states from
    // their detail rows; leave mixed or empty histories non-actionable.
    const details = await detailCollection.find({ maPhieu: borrow.maPhieu }).toArray();
    if (!details.length) return null;
    const statuses = new Set(details.map((detail) => detail.trangThai));
    if (statuses.size === 1 && statuses.has(STATUSES.PENDING)) return BORROW_STATUSES.PENDING;
    if (statuses.size === 1 && statuses.has(STATUSES.REJECTED)) return BORROW_STATUSES.REJECTED;
    if (statuses.size === 1 && statuses.has(STATUSES.CANCELLED)) return BORROW_STATUSES.CANCELLED;
    if (details.every((detail) => [STATUSES.BORROWED, STATUSES.RETURNED].includes(detail.trangThai))) {
        return BORROW_STATUSES.APPROVED;
    }
    return null;
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
    const details = normalizeDetails(borrow.borrowDetails || borrow.detaiMuon);
    const direct = borrow.mode === "direct";

    if (
        typeof borrow.maDocGia !== "string" ||
        borrow.maDocGia.trim().length === 0 ||
        (direct && (typeof borrow.maNhanVien !== "string" || borrow.maNhanVien.trim().length === 0))
    ) {
        const error = new Error("Thieu thong tin nguoi muon");
        error.statusCode = 400;
        throw error;
    }

    const db = await connectDB();
    const borrowCollection = db.collection(BORROW_COLLECTION);
    const detailCollection = db.collection(BORROW_DETAIL_COLLECTION);
    const bookCollection = db.collection(BOOK_COLLECTION);

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

            const ngayMuon = direct ? new Date() : null;
            const record = {
                _id: borrowId,
                maPhieu,
                maDocGia: borrow.maDocGia,
                maNhanVien: direct ? borrow.maNhanVien : null,
                soLuong: details.length,
                trangThai: direct ? BORROW_STATUSES.APPROVED : BORROW_STATUSES.PENDING,
                ngayYeuCau: direct ? null : new Date(),
                ngayMuon
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
                hanTra: direct ? addOneCalendarMonth(ngayMuon) : null,
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
    if (
        lyDoTuChoi !== undefined &&
        lyDoTuChoi !== null &&
        lyDoTuChoi !== "" &&
        (typeof lyDoTuChoi !== "string" || lyDoTuChoi.trim().length === 0)
    ) {
        const error = new Error("Ly do tu choi khong hop le");
        error.statusCode = 400;
        throw error;
    }

    const db = await connectDB();
    const borrowCollection = db.collection(BORROW_COLLECTION);
    const detailCollection = db.collection(BORROW_DETAIL_COLLECTION);
    const bookCollection = db.collection(BOOK_COLLECTION);

    return withBorrowOperationLock(db, async (assertOwned) => {
        const borrow = await borrowCollection.findOne({ maPhieu });
        if (!borrow) return { notFound: true };

        if (await getBorrowStatus(borrow, detailCollection) !== BORROW_STATUSES.PENDING) {
            return { invalidStatus: true };
        }
        const allDetails = await detailCollection.find({ maPhieu }).toArray();
        if (!allDetails.length || allDetails.some((detail) => detail.trangThai !== STATUSES.PENDING)) {
            return { invalidStatus: true };
        }
        const pendingDetails = allDetails;
        if (![STATUSES.BORROWED, STATUSES.REJECTED].includes(nextStatus)) {
            return { invalidStatus: true };
        }

        const detailIds = pendingDetails.map((detail) => detail._id);
        const stockReceipts = [];
        const approvedAt = new Date();
        const dueAt = addOneCalendarMonth(approvedAt);
        const parentFields = nextStatus === STATUSES.BORROWED
            ? { trangThai: BORROW_STATUSES.APPROVED, maNhanVien, ngayMuon: approvedAt }
            : {
                trangThai: BORROW_STATUSES.REJECTED,
                maNhanVien,
                ...(lyDoTuChoi ? { lyDoTuChoi } : {})
            };
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
                { $set: {
                    trangThai: nextStatus,
                    ...(nextStatus === STATUSES.BORROWED ? { hanTra: dueAt } : {})
                } }
            );
            if (changed.modifiedCount !== pendingDetails.length) {
                throw new Error("So chi tiet duoc cap nhat khong khop du lieu da doc");
            }

            await assertOwned();
            parentUpdateAttempted = true;
            const parentStatusFilter = Object.prototype.hasOwnProperty.call(borrow, "trangThai")
                ? { trangThai: borrow.trangThai }
                : { trangThai: { $exists: false } };
            const parentUpdate = await borrowCollection.updateOne(
                { _id: borrow._id, maPhieu, ...parentStatusFilter },
                { $set: parentFields }
            );
            if (parentUpdate.matchedCount !== 1) {
                throw new Error("Khong the cap nhat trang thai phieu muon");
            }
        } catch (error) {
            stopOnUncertainStockChange(error);
            const rollbackErrors = [];

            if (stateUpdateAttempted) {
                try {
                    await assertOwned();
                    for (const detail of pendingDetails) {
                        const currentDetail = await detailCollection.findOne({ _id: detail._id, maPhieu });
                        const originalHanTraMatches =
                            Object.prototype.hasOwnProperty.call(currentDetail || {}, "hanTra") ===
                                Object.prototype.hasOwnProperty.call(detail, "hanTra") &&
                            (!Object.prototype.hasOwnProperty.call(detail, "hanTra") ||
                                (currentDetail.hanTra instanceof Date && detail.hanTra instanceof Date
                                    ? currentDetail.hanTra.getTime() === detail.hanTra.getTime()
                                    : currentDetail.hanTra === detail.hanTra));
                        if (currentDetail?.trangThai === STATUSES.PENDING && originalHanTraMatches) {
                            continue;
                        }
                        const restore = { $set: { trangThai: STATUSES.PENDING } };
                        if (Object.prototype.hasOwnProperty.call(detail, "hanTra")) {
                            restore.$set.hanTra = detail.hanTra;
                        } else {
                            restore.$unset = { hanTra: "" };
                        }
                        const detailRollbackFilter = {
                            _id: detail._id,
                            maPhieu,
                            trangThai: nextStatus,
                            ...(nextStatus === STATUSES.BORROWED
                                ? { hanTra: dueAt }
                                : Object.prototype.hasOwnProperty.call(detail, "hanTra")
                                    ? { hanTra: detail.hanTra }
                                    : { hanTra: { $exists: false } })
                        };
                        const restoredDetail = await detailCollection.updateOne(
                            detailRollbackFilter,
                            restore
                        );
                        if (restoredDetail.matchedCount !== 1) {
                            throw new Error("Khong the khoi phuc ngay han va trang thai chi tiet");
                        }
                    }
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
                    const currentBorrow = await borrowCollection.findOne({ _id: borrow._id, maPhieu });
                    if (!currentBorrow) {
                        throw new Error("Khong tim thay phieu de rollback trang thai");
                    }
                    const sameValue = (left, right) =>
                        left instanceof Date && right instanceof Date
                            ? left.getTime() === right.getTime()
                            : left === right;
                    const fields = Object.keys(parentFields);
                    const alreadyOriginal = fields.every((field) =>
                        Object.prototype.hasOwnProperty.call(currentBorrow, field) ===
                            Object.prototype.hasOwnProperty.call(borrow, field) &&
                        (!Object.prototype.hasOwnProperty.call(borrow, field) ||
                            sameValue(currentBorrow[field], borrow[field]))
                    );
                    if (alreadyOriginal) {
                        // The parent update failed before applying; nothing to restore.
                    } else if (currentBorrow.trangThai !== parentFields.trangThai) {
                        throw new Error("Trang thai phieu khong khop khi rollback");
                    } else {
                        const set = {};
                        const unset = {};
                        for (const field of fields) {
                            if (Object.prototype.hasOwnProperty.call(borrow, field)) {
                                set[field] = borrow[field];
                            } else {
                                unset[field] = "";
                            }
                        }
                        const update = {};
                        if (Object.keys(set).length) update.$set = set;
                        if (Object.keys(unset).length) update.$unset = unset;
                        const restoredParent = await borrowCollection.updateOne(
                            { _id: borrow._id, maPhieu, trangThai: parentFields.trangThai },
                            update
                        );
                        if (restoredParent.matchedCount !== 1) {
                            throw new Error("Khong the rollback trang thai phieu muon");
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
        if (await getBorrowStatus(borrow, detailCollection) !== BORROW_STATUSES.APPROVED) {
            return { invalidStatus: true };
        }
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
        if (await getBorrowStatus(borrow, detailCollection) !== BORROW_STATUSES.PENDING) {
            return { invalidStatus: true };
        }
        if (borrow.maNhanVien || !borrow.ngayYeuCau) return { invalidStatus: true };

        const details = await detailCollection.find({ maPhieu }).toArray();
        if (!details.length || details.some((detail) => detail.trangThai !== STATUSES.PENDING)) {
            return { invalidStatus: true };
        }

        const restored = [];
        let detailUpdateAttempted = false;
        let parentUpdateAttempted = false;
        const cancelledAt = new Date();
        try {
            for (const detail of details) {
                const receipt = await restoreStock(bookCollection, detail.maSach, 1, assertOwned);
                restored.push(receipt);
            }
            await assertOwned();
            detailUpdateAttempted = true;
            const changedDetails = await detailCollection.updateMany({
                maPhieu,
                trangThai: STATUSES.PENDING
            }, { $set: { trangThai: STATUSES.CANCELLED } });
            if (changedDetails.modifiedCount !== details.length) {
                throw new Error("Khong the huy day du chi tiet phieu muon");
            }
            await assertOwned();
            parentUpdateAttempted = true;
            const parentStatusFilter = Object.prototype.hasOwnProperty.call(borrow, "trangThai")
                ? { trangThai: borrow.trangThai }
                : { trangThai: { $exists: false } };
            const updateBorrow = await borrowCollection.updateOne({
                _id: borrow._id,
                maPhieu,
                ...parentStatusFilter
            }, { $set: { trangThai: BORROW_STATUSES.CANCELLED, ngayHuy: cancelledAt } });
            if (updateBorrow.matchedCount !== 1) {
                throw new Error("Khong the cap nhat trang thai phieu muon");
            }
            return { cancelled: true, borrow: await findOne(maPhieu) };
        } catch (error) {
            stopOnUncertainStockChange(error);
            const rollbackErrors = [];
            if (parentUpdateAttempted) {
                try {
                    await assertOwned();
                    const currentBorrow = await borrowCollection.findOne({ _id: borrow._id, maPhieu });
                    if (!currentBorrow) {
                        throw new Error("Khong tim thay phieu de rollback trang thai");
                    }
                    const sameValue = (left, right) =>
                        left instanceof Date && right instanceof Date
                            ? left.getTime() === right.getTime()
                            : left === right;
                    const fields = ["trangThai", "ngayHuy"];
                    const alreadyOriginal = fields.every((field) =>
                        Object.prototype.hasOwnProperty.call(currentBorrow, field) ===
                            Object.prototype.hasOwnProperty.call(borrow, field) &&
                        (!Object.prototype.hasOwnProperty.call(borrow, field) ||
                            sameValue(currentBorrow[field], borrow[field]))
                    );
                    if (alreadyOriginal) {
                        // The parent update failed before applying; nothing to restore.
                    } else if (currentBorrow.trangThai !== BORROW_STATUSES.CANCELLED ||
                        !sameValue(currentBorrow.ngayHuy, cancelledAt)) {
                        throw new Error("Trang thai phieu khong khop khi rollback");
                    } else {
                        const set = {};
                        const unset = {};
                        for (const field of fields) {
                            if (Object.prototype.hasOwnProperty.call(borrow, field)) {
                                set[field] = borrow[field];
                            } else {
                                unset[field] = "";
                            }
                        }
                        const update = {};
                        if (Object.keys(set).length) update.$set = set;
                        if (Object.keys(unset).length) update.$unset = unset;
                        const restoredBorrow = await borrowCollection.updateOne(
                            {
                                _id: borrow._id,
                                maPhieu,
                                trangThai: BORROW_STATUSES.CANCELLED,
                                ngayHuy: cancelledAt
                            },
                            update
                        );
                        if (restoredBorrow.matchedCount !== 1) {
                            throw new Error("Khong the rollback trang thai phieu");
                        }
                    }
                } catch (rollbackError) { rollbackErrors.push(rollbackError); }
            }
            if (detailUpdateAttempted && rollbackErrors.length === 0) {
                try {
                    await assertOwned();
                    await detailCollection.updateMany(
                        { maPhieu, trangThai: STATUSES.CANCELLED },
                        { $set: { trangThai: STATUSES.PENDING } }
                    );
                    const remaining = await detailCollection.countDocuments({ maPhieu, trangThai: STATUSES.CANCELLED });
                    if (remaining !== 0) {
                        throw new Error("Khong the rollback chi tiet ve cho duyet");
                    }
                } catch (rollbackError) { rollbackErrors.push(rollbackError); }
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
                throw makeRollbackError("Huy phieu that bai va rollback khong hoan tat", error, rollbackErrors);
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
    STATUSES,
    BORROW_STATUSES,
    addOneCalendarMonth
};
