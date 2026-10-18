const connectDB = require("../config/database");
const { BOOK_COLLECTION } = require("../models/Book");
const { BORROW_DETAIL_COLLECTION } = require("../models/BorrowDetail");
const { PUBLISHER_COLLECTION } = require("../models/Publisher");
const { generateCode } = require("./codeGeneratorService");
const { withBorrowOperationLock } = require("./borrowOperationLock");

// Lấy collection sách
async function getCollection() {
    const db = await connectDB();
    return db.collection(BOOK_COLLECTION);
}

// Lấy tất cả sách
async function findAll() {
    const collection = await getCollection();

    return await collection.find({}).toArray();
}

// Lấy sách theo mã sách
async function findOne(maSach) {
    const collection = await getCollection();

    return await collection.findOne({
        maSach: maSach, // Tìm bằng mã sách
    });
}

function normalizeWhitespace(value) {
    return value.trim().replace(/\s+/g, " ");
}

function duplicateNameError() {
    const error = new Error("Ten sach da ton tai");
    error.code = "DUPLICATE_NAME";
    return error;
}

// Thêm sách
async function create(book) {
    const collection = await getCollection();
    const normalizedBook = {
        ...book,
        tenSach: normalizeWhitespace(book.tenSach),
        tacGia: normalizeWhitespace(book.tacGia),
    };
    const toWhitespaceFlexiblePattern = (value) =>
        value
            .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            .replace(/ /g, "\\s+");

    const existingBook = await collection.findOne({
        tenSach: {
            $regex: `^\\s*${toWhitespaceFlexiblePattern(normalizedBook.tenSach)}\\s*$`,
            $options: "i",
        },
        tacGia: {
            $regex: `^\\s*${toWhitespaceFlexiblePattern(normalizedBook.tacGia)}\\s*$`,
            $options: "i",
        },
        maNXB: normalizedBook.maNXB,
    });

    if (existingBook) {
        throw duplicateNameError();
    }

    const maSach = await generateCode("S");
    const bookToInsert = {
        ...normalizedBook,
        maSach,
        soQuyenConLai: normalizedBook.soQuyen,
    };

    const result = await collection.insertOne(bookToInsert);

    return await collection.findOne({
        _id: result.insertedId,
    });
}

// Cập nhật theo mã sách
async function update(maSach, book) {
    const db = await connectDB();
    const collection = db.collection(BOOK_COLLECTION);
    const bookToUpdate = { ...book };
    delete bookToUpdate.maSach;

    // Tồn kho chỉ thay đổi qua nghiệp vụ mượn và trả.
    delete bookToUpdate.soQuyen;
    delete bookToUpdate.soQuyenConLai;

    if (bookToUpdate.tenSach !== undefined) {
        bookToUpdate.tenSach = normalizeWhitespace(bookToUpdate.tenSach);
    }
    if (bookToUpdate.tacGia !== undefined) {
        bookToUpdate.tacGia = normalizeWhitespace(bookToUpdate.tacGia);
    }

    const currentBook = await collection.findOne({ maSach });
    if (!currentBook) {
        const error = new Error("Khong tim thay sach");
        error.code = "NOT_FOUND";
        throw error;
    }

    if (bookToUpdate.maNXB !== undefined) {
        const publisher = await db.collection(PUBLISHER_COLLECTION).findOne({
            maNXB: bookToUpdate.maNXB,
        });

        if (!publisher) {
            const error = new Error("Khong tim thay nha xuat ban");
            error.code = "PUBLISHER_NOT_FOUND";
            throw error;
        }
    }

    const hasDuplicateKeyChange =
        bookToUpdate.tenSach !== undefined ||
        bookToUpdate.tacGia !== undefined ||
        bookToUpdate.maNXB !== undefined;

    if (hasDuplicateKeyChange) {
        const candidateBook = { ...currentBook, ...bookToUpdate };
        const toWhitespaceFlexiblePattern = (value) =>
            value
                .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
                .replace(/ /g, "\\s+");

        const existingBook = await collection.findOne({
            maSach: { $ne: maSach },
            tenSach: {
                $regex: `^\\s*${toWhitespaceFlexiblePattern(candidateBook.tenSach)}\\s*$`,
                $options: "i",
            },
            tacGia: {
                $regex: `^\\s*${toWhitespaceFlexiblePattern(candidateBook.tacGia)}\\s*$`,
                $options: "i",
            },
            maNXB: candidateBook.maNXB,
        });

        if (existingBook) {
            throw duplicateNameError();
        }
    }

    const result = await collection.updateOne(
        { maSach: maSach }, // Không dùng _id
        { $set: bookToUpdate }
    );

    if (result.matchedCount === 0) {
        const error = new Error("Khong tim thay sach");
        error.code = "NOT_FOUND";
        throw error;
    }

    return await findOne(maSach);
}

// Bổ sung số lượng sách
async function addStock(maSach, soLuong) {
    const collection = await getCollection();

    const book = await collection.findOne({ maSach });

    if (!book) {
        const error = new Error("Khong tim thay sach");
        error.code = "NOT_FOUND";
        throw error;
    }

    if (!Number.isInteger(soLuong) || soLuong <= 0) {
        const error = new Error("So luong bo sung phai la so nguyen duong");
        error.code = "INVALID_QUANTITY";
        throw error;
    }

    await collection.updateOne(
        { maSach },
        {
            $inc: {
                soQuyen: soLuong,
                soQuyenConLai: soLuong,
            },
        }
    );

    return await findOne(maSach);
}

// Tiêu hủy sách
async function destroyStock(maSach, soLuong) {
    const collection = await getCollection();
    const book = await collection.findOne({ maSach });

    if (!book) {
        const error = new Error("Khong tim thay sach");
        error.code = "NOT_FOUND";
        throw error;
    }

    if (!Number.isInteger(soLuong) || soLuong <= 0) {
        const error = new Error("So luong tieu huy phai la so nguyen duong");
        error.code = "INVALID_QUANTITY";
        throw error;
    }

    if (soLuong > book.soQuyenConLai || soLuong > book.soQuyen) {
        const error = new Error("So luong tieu huy vuot qua so sach hien co");
        error.code = "INSUFFICIENT_STOCK";
        throw error;
    }

    const result = await collection.updateOne(
        {
            maSach,
            soQuyenConLai: { $gte: soLuong },
            soQuyen: { $gte: soLuong },
        },
        {
            $inc: {
                soQuyen: -soLuong,
                soQuyenConLai: -soLuong,
            },
        }
    );

    if (result.modifiedCount === 0) {
        const currentBook = await collection.findOne({ maSach });

        if (!currentBook) {
            const error = new Error("Khong tim thay sach");
            error.code = "NOT_FOUND";
            throw error;
        }

        const error = new Error("So luong tieu huy vuot qua so sach hien co");
        error.code = "INSUFFICIENT_STOCK";
        throw error;
    }

    return await findOne(maSach);
}

// Xóa theo mã sách
async function remove(maSach) {
    const db = await connectDB();
    const collection = db.collection(BOOK_COLLECTION);

    return withBorrowOperationLock(db, async (assertOwned) => {
        const book = await collection.findOne({ maSach });

        if (!book) {
            return { acknowledged: true, deletedCount: 0 };
        }

        const borrowDetails = db.collection(BORROW_DETAIL_COLLECTION);
        const referencedDetail = await borrowDetails.findOne({ maSach });

        if (referencedDetail) {
            const error = new Error("Khong the xoa sach da duoc ghi nhan trong lich su muon tra");
            error.code = "BOOK_REFERENCED";
            throw error;
        }

        await assertOwned();
        return await collection.deleteOne({
            maSach: maSach, // Xóa bằng mã sách
        });
    });
}
module.exports = {
    findAll,
    findOne,
    create,
    update,
    addStock,
    destroyStock,
    remove,

};
