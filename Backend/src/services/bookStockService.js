function stockError(message, statusCode = 409) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.stockChangeState = "not-applied";
    return error;
}

function getAvailable(book, maSach) {
    if (!Number.isSafeInteger(book.soQuyen) || book.soQuyen < 0) {
        throw stockError(`Du lieu tong so quyen cua sach ${maSach} khong hop le`);
    }

    const hasAvailable = Object.prototype.hasOwnProperty.call(book, "soQuyenConLai");
    if (!hasAvailable) {
        throw stockError(`Sach ${maSach} thieu soQuyenConLai; can doi soat du lieu truoc khi thay doi ton kho`);
    }

    const available = book.soQuyenConLai;
    if (
        !Number.isSafeInteger(available) ||
        available < 0 ||
        available > book.soQuyen
    ) {
        throw stockError(`Du lieu soQuyenConLai cua sach ${maSach} khong hop le`);
    }

    return { hasAvailable, value: available };
}

async function changeAvailable(bookCollection, maSach, delta, assertOwned) {
    if (!Number.isSafeInteger(delta) || delta === 0) {
        throw new TypeError("Stock delta must be a non-zero safe integer");
    }

    const book = await bookCollection.findOne({ maSach });
    if (!book) throw stockError(`Khong tim thay sach ${maSach}`, 404);

    const { hasAvailable, value: before } = getAvailable(book, maSach);
    const after = before + delta;
    if (after < 0) {
        throw stockError(`Sach ${maSach} khong du so luong kha dung`, 400);
    }
    if (after > book.soQuyen) {
        throw stockError(`Hoan kho sach ${maSach} se vuot tong so quyen`);
    }

    const filter = {
        maSach,
        soQuyen: book.soQuyen,
        soQuyenConLai: hasAvailable ? before : { $exists: false }
    };

    if (assertOwned) await assertOwned();
    let updateResult;
    let updateError;
    try {
        updateResult = await bookCollection.updateOne(
            filter,
            { $set: { soQuyenConLai: after } }
        );
    } catch (error) {
        updateError = error;
    }

    if (!updateError && updateResult?.matchedCount === 1) {
        return {
            maSach,
            total: book.soQuyen,
            before,
            after,
            hadAvailable: hasAvailable
        };
    }

    if (!updateError) {
        throw stockError(
            `Ton kho sach ${maSach} da thay doi; vui long thu lai`,
            409
        );
    }

    let current;
    try {
        current = await bookCollection.findOne({ maSach });
    } catch (readError) {
        const uncertainError = stockError(
            `Khong the xac minh ton kho sach ${maSach}; can doi soat`,
            503
        );
        uncertainError.stockChangeState = "uncertain";
        uncertainError.retainBorrowLock = true;
        uncertainError.cause = updateError;
        uncertainError.verificationError = readError;
        throw uncertainError;
    }
    if (current?.soQuyen === book.soQuyen && current.soQuyenConLai === after) {
        return {
            maSach,
            total: book.soQuyen,
            before,
            after,
            hadAvailable: hasAvailable
        };
    }
    if (current?.soQuyen === book.soQuyen &&
        current.soQuyenConLai === (hasAvailable ? before : undefined)) {
        throw updateError;
    }
    const uncertainError = stockError(
        `Khong the xac nhan cap nhat ton kho sach ${maSach}; can doi soat`,
        503
    );
    uncertainError.stockChangeState = "uncertain";
    uncertainError.cause = updateError;
    uncertainError.retainBorrowLock = true;
    throw uncertainError;
}

async function undoAvailableChange(bookCollection, receipt, assertOwned) {
    const filter = {
        maSach: receipt.maSach,
        soQuyen: receipt.total,
        soQuyenConLai: receipt.after
    };
    const update = receipt.hadAvailable
        ? { $set: { soQuyenConLai: receipt.before } }
        : { $unset: { soQuyenConLai: "" } };

    if (assertOwned) await assertOwned();
    let result;
    let updateError;
    try {
        result = await bookCollection.updateOne(filter, update);
    } catch (error) {
        updateError = error;
    }
    if (result?.matchedCount === 1) return;

    let current;
    try {
        current = await bookCollection.findOne({ maSach: receipt.maSach });
    } catch (readError) {
        const error = stockError(
            `Khong the xac minh rollback ton kho sach ${receipt.maSach}; can doi soat`,
            503
        );
        error.retainBorrowLock = true;
        error.cause = updateError || readError;
        throw error;
    }

    const alreadyUndone = current?.soQuyen === receipt.total &&
        (receipt.hadAvailable
            ? current.soQuyenConLai === receipt.before
            : !Object.prototype.hasOwnProperty.call(current, "soQuyenConLai"));
    if (alreadyUndone) return;

    const error = stockError(
        `Khong the khoi phuc ton kho sach ${receipt.maSach}; can doi soat`,
        503
    );
    error.retainBorrowLock = true;
    if (updateError) error.cause = updateError;
    throw error;
}

module.exports = { changeAvailable, undoAvailableChange };
