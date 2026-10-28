const connectDB = require("../config/database");
const { BORROW_COLLECTION } = require("../models/Borrow");
const { BORROW_DETAIL_COLLECTION } = require("../models/BorrowDetail");
const { BOOK_COLLECTION } = require("../models/Book");
const { USER_COLLECTION } = require("../models/User");
const { generateCode } = require("./codeGeneratorService");
const { withBorrowOperationLock } = require("./borrowOperationLock");
const { changeAvailable, undoAvailableChange } = require("./bookStockService");
const { ObjectId } = require("mongodb");
const { isMongoDuplicateKey } = require("./mongoDuplicateError");

const STATUSES = {
    DRAFT: "Đang chọn sách",
    PENDING: "Chờ duyệt",
    BORROWED: "Đang mượn",
    RETURNED: "Đã trả",
    REJECTED: "Từ chối",
    CANCELLED: "Hủy"
};
const BORROW_STATUSES = {
    DRAFT: "Đang chọn sách",
    PENDING: "Chờ duyệt",
    APPROVED: "Đã duyệt",
    REJECTED: "Từ chối",
    CANCELLED: "Hủy"
};
const MAX_BOOKS_PER_BORROW = 5;
const MAX_ACTIVE_BOOKS = 5;
const MAX_PENDING_BORROWS = 3;
const ACTIVE_STATUSES = [STATUSES.PENDING, STATUSES.BORROWED];

function normalizeDetails(details, allowEmpty = false) {
    if (!Array.isArray(details) || (!allowEmpty && details.length === 0)) {
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
    const direct = borrow.mode === "direct";
    const details = normalizeDetails(borrow.borrowDetails || borrow.detaiMuon || (direct ? undefined : []), !direct);

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
        const reader = await db.collection(USER_COLLECTION).findOne({
            maDocGia: borrow.maDocGia
        });
        if (!reader) {
            const error = new Error("Khong tim thay doc gia");
            error.statusCode = 400;
            throw error;
        }
        if (!direct) {
            for (const detail of details) {
                if (!await bookCollection.findOne({ maSach: detail.maSach })) {
                    const error = new Error(`Khong tim thay sach ${detail.maSach}`);
                    error.statusCode = 404;
                    throw error;
                }
            }
        }

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

        if (direct) {
            const duplicate = activeDetails.find((item) =>
                details.some((detail) => detail.maSach === item.maSach)
            );
            if (duplicate) {
                const error = new Error(`Sach ${duplicate.maSach} da co trong phieu dang hoat dong ${duplicate.maPhieu}`);
                error.statusCode = 400;
                throw error;
            }
            const activeBookCount = new Set(activeDetails.map((item) => item.maSach)).size;
            if (activeBookCount + details.length > MAX_ACTIVE_BOOKS) {
                const error = new Error(`Vuot gioi han ${MAX_ACTIVE_BOOKS} sach dang cho duyet hoac dang muon`);
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

            if (direct) {
                for (const detail of details) {
                    const receipt = await reserveBook(bookCollection, detail.maSach, assertOwned);
                    reserved.push(receipt);
                }
            }

            const ngayMuon = direct ? new Date() : null;
            const record = {
                _id: borrowId,
                maPhieu,
                maDocGia: borrow.maDocGia,
                maNhanVien: direct ? borrow.maNhanVien : null,
                soLuong: details.length,
                trangThai: direct ? BORROW_STATUSES.APPROVED : BORROW_STATUSES.DRAFT,
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
                trangThai: direct ? STATUSES.BORROWED : STATUSES.DRAFT
            }));
            await assertOwned();
            const detailInsert = detailRecords.length ? await detailCollection.insertMany(detailRecords) : { insertedCount: 0 };
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
            if (isMongoDuplicateKey(error)) {
                const duplicateError = new Error("Ma phieu muon da ton tai");
                duplicateError.code = "BORROW_CODE_ALREADY_EXISTS";
                duplicateError.statusCode = 409;
                duplicateError.publicMessage = "Ma phieu muon da ton tai; vui long thu lai";
                throw duplicateError;
            }
            throw error;
        }
    });
}

async function addBooks(maPhieu, requestedDetails, requester) {
    if (!Array.isArray(requestedDetails) || !requestedDetails.length) {
        const error = new Error("borrowDetails phai co it nhat mot sach"); error.statusCode = 400; throw error;
    }
    const details = normalizeDetails(requestedDetails);
    const db = await connectDB();
    const borrows = db.collection(BORROW_COLLECTION);
    const detailCollection = db.collection(BORROW_DETAIL_COLLECTION);
    return withBorrowOperationLock(db, async (assertOwned) => {
        const borrow = await borrows.findOne({ maPhieu });
        if (!borrow) return { notFound: true };
        if (requester?.loaiTaiKhoan !== "DOCGIA" || borrow.maDocGia !== (requester.maTaiKhoan || requester.maDocGia)) return { forbidden: true };
        if (borrow.trangThai !== BORROW_STATUSES.DRAFT) return { invalidStatus: true };
        if (!(borrow.ngayYeuCau instanceof Date) || borrow.ngayYeuCau.getTime() + 3 * 86400000 <= Date.now()) return { expired: true };
        const existing = await detailCollection.find({ maPhieu }).toArray();
        if (!Number.isSafeInteger(borrow.soLuong) || borrow.soLuong !== existing.length) {
            const error = new Error("So luong sach trong phieu khong khop chi tiet; can doi soat"); error.statusCode = 409; throw error;
        }
        if (existing.length + details.length > MAX_BOOKS_PER_BORROW) {
            const error = new Error("Moi phieu muon chi duoc toi da 5 sach"); error.statusCode = 400; throw error;
        }
        const seen = new Set(existing.map((item) => item.maSach));
        if (details.some((item) => seen.has(item.maSach))) {
            const error = new Error("Sach da co trong phieu muon"); error.statusCode = 409; throw error;
        }
        for (const detail of details) {
            if (!await db.collection(BOOK_COLLECTION).findOne({ maSach: detail.maSach })) {
                const error = new Error(`Khong tim thay sach ${detail.maSach}`); error.statusCode = 404; throw error;
            }
        }
        const newDetails = details.map((item) => ({ _id: new ObjectId(), maPhieu, maSach: item.maSach, hanTra: null, ngayTra: null, trangThai: STATUSES.DRAFT }));
        let insertAttempted = false;
        let parentAttempted = false;
        try {
            await assertOwned(); insertAttempted = true;
            const inserted = await detailCollection.insertMany(newDetails);
            if (!inserted.acknowledged || inserted.insertedCount !== newDetails.length) throw new Error("Khong the them day du sach vao phieu");
            await assertOwned(); parentAttempted = true;
            const updated = await borrows.updateOne({ _id: borrow._id, trangThai: BORROW_STATUSES.DRAFT, soLuong: borrow.soLuong }, { $inc: { soLuong: newDetails.length } });
            if (updated.matchedCount !== 1) throw new Error("Phieu da thay doi; khong the cap nhat so luong sach");
            const verified = await borrows.findOne({ _id: borrow._id, maPhieu });
            if (verified?.soLuong !== borrow.soLuong + newDetails.length) throw new Error("Khong xac minh duoc so luong sach moi trong phieu");
            return { borrow: verified, details: newDetails };
        } catch (error) {
            const rollbackErrors = [];
            if (parentAttempted) {
                try {
                    const current = await borrows.findOne({ _id: borrow._id, maPhieu });
                    if (current?.soLuong === borrow.soLuong + newDetails.length) {
                        const rollback = await borrows.updateOne({ _id: borrow._id, trangThai: BORROW_STATUSES.DRAFT, soLuong: current.soLuong }, { $inc: { soLuong: -newDetails.length } });
                        if (rollback.matchedCount !== 1) throw new Error("Khong the rollback so luong sach trong phieu");
                    } else if (current?.soLuong !== borrow.soLuong) throw new Error("So luong phieu khong khop khi rollback");
                } catch (rollbackError) { rollbackErrors.push(rollbackError); }
            }
            if (insertAttempted && !rollbackErrors.length) {
                try {
                    await assertOwned();
                    await detailCollection.deleteMany({ _id: { $in: newDetails.map((item) => item._id) }, maPhieu });
                    if (await detailCollection.countDocuments({ _id: { $in: newDetails.map((item) => item._id) } }) !== 0) throw new Error("Chi tiet vua them van con sau rollback");
                } catch (rollbackError) { rollbackErrors.push(rollbackError); }
            }
            if (rollbackErrors.length) throw makeRollbackError("Them sach that bai va rollback khong hoan tat", error, rollbackErrors);
            throw error;
        }
    });
}

async function submit(maPhieu, requester) {
    const db = await connectDB();
    const borrows = db.collection(BORROW_COLLECTION);
    const detailCollection = db.collection(BORROW_DETAIL_COLLECTION);
    const books = db.collection(BOOK_COLLECTION);
    return withBorrowOperationLock(db, async (assertOwned) => {
        const borrow = await borrows.findOne({ maPhieu });
        if (!borrow) return { notFound: true };
        if (requester?.loaiTaiKhoan !== "DOCGIA" || borrow.maDocGia !== (requester.maTaiKhoan || requester.maDocGia)) return { forbidden: true };
        if (borrow.trangThai !== BORROW_STATUSES.DRAFT) return { invalidStatus: true };
        if (!(borrow.ngayYeuCau instanceof Date) || borrow.ngayYeuCau.getTime() + 3 * 86400000 <= Date.now()) return { expired: true };
        const details = await detailCollection.find({ maPhieu }).toArray();
        if (!details.length || details.length > MAX_BOOKS_PER_BORROW || details.length !== borrow.soLuong || details.some((item) => item.trangThai !== STATUSES.DRAFT) || new Set(details.map((item) => item.maSach)).size !== details.length) return { invalidDetails: true };
        const readerBorrows = await borrows.find({ maDocGia: borrow.maDocGia }, { projection: { maPhieu: 1 } }).toArray();
        const ids = readerBorrows.map((item) => item.maPhieu);
        const active = ids.length ? await detailCollection.find({ maPhieu: { $in: ids }, trangThai: { $in: ACTIVE_STATUSES } }).toArray() : [];
        if (active.some((item) => details.some((detail) => detail.maSach === item.maSach))) {
            const error = new Error("Sach da co trong phieu dang hoat dong"); error.statusCode = 400; throw error;
        }
        if (new Set(active.map((item) => item.maSach)).size + details.length > MAX_ACTIVE_BOOKS) {
            const error = new Error(`Doc gia chi duoc co toi da ${MAX_ACTIVE_BOOKS} sach dang hoat dong`); error.statusCode = 400; throw error;
        }
        const pendingIds = new Set(active.filter((item) => item.trangThai === STATUSES.PENDING).map((item) => item.maPhieu));
        if (pendingIds.size >= MAX_PENDING_BORROWS) { const error = new Error(`Moi doc gia chi duoc co toi da ${MAX_PENDING_BORROWS} phieu cho duyet`); error.statusCode = 400; throw error; }
        const receipts = [];
        let detailWriteAttempted = false;
        let parentWriteAttempted = false;
        const dueStatus = BORROW_STATUSES.PENDING;
        try {
            for (const detail of details) receipts.push(await reserveBook(books, detail.maSach, assertOwned));
            await assertOwned(); detailWriteAttempted = true;
            const changed = await detailCollection.updateMany({ maPhieu, trangThai: STATUSES.DRAFT }, { $set: { trangThai: STATUSES.PENDING } });
            if (changed.modifiedCount !== details.length) throw new Error("Khong the cap nhat day du trang thai chi tiet");
            await assertOwned(); parentWriteAttempted = true;
            const changedParent = await borrows.updateOne({ _id: borrow._id, trangThai: BORROW_STATUSES.DRAFT, soLuong: borrow.soLuong }, { $set: { trangThai: dueStatus } });
            if (changedParent.matchedCount !== 1) throw new Error("Phieu da thay doi; khong the gui");
            return { borrow: await borrows.findOne({ _id: borrow._id }) };
        } catch (error) {
            stopOnUncertainStockChange(error);
            const rollbackErrors = [];
            if (parentWriteAttempted) {
                try {
                    const current = await borrows.findOne({ _id: borrow._id });
                    if (current?.trangThai === BORROW_STATUSES.PENDING) {
                        const restored = await borrows.updateOne({ _id: borrow._id, trangThai: BORROW_STATUSES.PENDING }, { $set: { trangThai: BORROW_STATUSES.DRAFT } });
                        if (restored.matchedCount !== 1) throw new Error("Khong the rollback trang thai phieu");
                    }
                    else if (current?.trangThai !== BORROW_STATUSES.DRAFT) throw new Error("Khong xac dinh duoc trang thai phieu sau loi");
                    const verified = await borrows.findOne({ _id: borrow._id });
                    if (verified?.trangThai !== BORROW_STATUSES.DRAFT) throw new Error("Khong xac minh duoc trang thai phieu sau rollback");
                } catch (rollbackError) { rollbackErrors.push(rollbackError); }
            }
            if (detailWriteAttempted && !rollbackErrors.length) {
                try {
                    await detailCollection.updateMany({ maPhieu, trangThai: STATUSES.PENDING }, { $set: { trangThai: STATUSES.DRAFT } });
                    if (await detailCollection.countDocuments({ maPhieu, trangThai: STATUSES.PENDING }) !== 0 || await detailCollection.countDocuments({ maPhieu, trangThai: STATUSES.DRAFT }) !== details.length) throw new Error("Khong the xac minh rollback trang thai chi tiet");
                } catch (rollbackError) { rollbackErrors.push(rollbackError); }
            }
            for (const receipt of rollbackErrors.length ? [] : receipts.reverse()) {
                try { await undoAvailableChange(books, receipt, assertOwned); } catch (rollbackError) { rollbackErrors.push(rollbackError); break; }
            }
            if (rollbackErrors.length) throw makeRollbackError("Gui phieu that bai va rollback khong hoan tat; can kiem tra du lieu", error, rollbackErrors);
            throw error;
        }
    });
}

async function expireDraftBorrows(now = new Date()) {
    const db = await connectDB();
    const borrows = db.collection(BORROW_COLLECTION);
    const detailCollection = db.collection(BORROW_DETAIL_COLLECTION);
    const cutoff = new Date(now.getTime() - 3 * 86400000);
    return withBorrowOperationLock(db, async (assertOwned) => {
        const expired = await borrows.find({ trangThai: BORROW_STATUSES.DRAFT, ngayYeuCau: { $lte: cutoff } }).toArray();
        let count = 0;
        for (const borrow of expired) {
            const details = await detailCollection.find({ maPhieu: borrow.maPhieu }).toArray();
            if (details.length !== borrow.soLuong || details.some((detail) => detail.trangThai !== STATUSES.DRAFT)) {
                const error = new Error(`Phieu ${borrow.maPhieu} khong khop chi tiet; can doi soat truoc khi het han`);
                error.statusCode = 409;
                throw error;
            }
            let detailsWriteAttempted = false;
            let parentWriteAttempted = false;
            try {
                await assertOwned();
                if (details.length) {
                    detailsWriteAttempted = true;
                    const updated = await detailCollection.updateMany({ maPhieu: borrow.maPhieu, trangThai: STATUSES.DRAFT }, { $set: { trangThai: STATUSES.CANCELLED } });
                    if (updated.modifiedCount !== details.length) throw new Error("Khong the huy day du chi tiet phieu het han");
                }
                await assertOwned();
                parentWriteAttempted = true;
                const updatedBorrow = await borrows.updateOne({ _id: borrow._id, trangThai: BORROW_STATUSES.DRAFT, ngayYeuCau: { $lte: cutoff } }, { $set: { trangThai: BORROW_STATUSES.CANCELLED, ngayHuy: now, lyDoHuy: "Phiếu đã quá hạn" } });
                if (updatedBorrow.matchedCount !== 1) throw new Error("Phieu da thay doi trong luc xu ly het han");
                count++;
            } catch (error) {
                const rollbackErrors = [];
                if (parentWriteAttempted) {
                    try {
                        const current = await borrows.findOne({ _id: borrow._id, maPhieu });
                        if (current?.trangThai === BORROW_STATUSES.CANCELLED && current.lyDoHuy === "Phiếu đã quá hạn" && current.ngayHuy instanceof Date && current.ngayHuy.getTime() === now.getTime()) {
                            const restored = await borrows.updateOne({ _id: borrow._id, trangThai: BORROW_STATUSES.CANCELLED, ngayHuy: now, lyDoHuy: "Phiếu đã quá hạn" }, { $set: { trangThai: BORROW_STATUSES.DRAFT }, $unset: { ngayHuy: "", lyDoHuy: "" } });
                            if (restored.matchedCount !== 1) throw new Error("Khong the rollback trang thai phieu het han");
                        } else if (current?.trangThai !== BORROW_STATUSES.DRAFT) throw new Error("Khong xac dinh duoc trang thai phieu sau loi het han");
                    } catch (rollbackError) { rollbackErrors.push(rollbackError); }
                }
                if (detailsWriteAttempted && !rollbackErrors.length) {
                    try {
                        await assertOwned();
                        await detailCollection.updateMany({ maPhieu: borrow.maPhieu, trangThai: STATUSES.CANCELLED }, { $set: { trangThai: STATUSES.DRAFT } });
                        if (await detailCollection.countDocuments({ maPhieu: borrow.maPhieu, trangThai: STATUSES.CANCELLED }) !== 0) throw new Error("Khong the rollback chi tiet phieu het han");
                    } catch (rollbackError) { rollbackErrors.push(rollbackError); }
                }
                if (rollbackErrors.length) throw makeRollbackError("Xu ly phieu het han that bai va rollback khong hoan tat", error, rollbackErrors);
                throw error;
            }
        }
        return count;
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
        const borrowStatus = await getBorrowStatus(borrow, detailCollection);
        const isDraft = borrowStatus === BORROW_STATUSES.DRAFT;
        if (!isDraft && borrowStatus !== BORROW_STATUSES.PENDING) {
            return { invalidStatus: true };
        }
        if (borrow.maNhanVien || !borrow.ngayYeuCau) return { invalidStatus: true };
        if (isDraft && borrow.ngayYeuCau.getTime() + 3 * 86400000 <= Date.now()) return { expired: true };

        const details = await detailCollection.find({ maPhieu }).toArray();
        const expectedDetailStatus = isDraft ? STATUSES.DRAFT : STATUSES.PENDING;
        if ((!isDraft && !details.length) || details.some((detail) => detail.trangThai !== expectedDetailStatus) || borrow.soLuong !== details.length) {
            return { invalidStatus: true };
        }

        const restored = [];
        let detailUpdateAttempted = false;
        let parentUpdateAttempted = false;
        const cancelledAt = new Date();
        try {
            if (!isDraft) {
                for (const detail of details) {
                    const receipt = await restoreStock(bookCollection, detail.maSach, 1, assertOwned);
                    restored.push(receipt);
                }
            }
            await assertOwned();
            detailUpdateAttempted = true;
            const changedDetails = await detailCollection.updateMany({
                maPhieu,
                trangThai: expectedDetailStatus
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
            }, { $set: { trangThai: BORROW_STATUSES.CANCELLED, ngayHuy: cancelledAt, ...(isDraft ? { lyDoHuy: "Độc giả đã hủy phiếu" } : {}) } });
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
                    const fields = ["trangThai", "ngayHuy", ...(isDraft ? ["lyDoHuy"] : [])];
                    const alreadyOriginal = fields.every((field) =>
                        Object.prototype.hasOwnProperty.call(currentBorrow, field) ===
                            Object.prototype.hasOwnProperty.call(borrow, field) &&
                        (!Object.prototype.hasOwnProperty.call(borrow, field) ||
                            sameValue(currentBorrow[field], borrow[field]))
                    );
                    if (alreadyOriginal) {
                        // The parent update failed before applying; nothing to restore.
                    } else if (currentBorrow.trangThai !== BORROW_STATUSES.CANCELLED ||
                        !sameValue(currentBorrow.ngayHuy, cancelledAt) ||
                        (isDraft && currentBorrow.lyDoHuy !== "Độc giả đã hủy phiếu")) {
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
                                ngayHuy: cancelledAt,
                                ...(isDraft ? { lyDoHuy: "Độc giả đã hủy phiếu" } : {})
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
                        { $set: { trangThai: expectedDetailStatus } }
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
    addBooks,
    submit,
    expireDraftBorrows,
    changeStatus,
    returnBook,
    deletePendingBorrow,
    STATUSES,
    BORROW_STATUSES,
    addOneCalendarMonth
};
