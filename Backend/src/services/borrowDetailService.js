const connectDB = require("../config/database");

const {
    BORROW_DETAIL_COLLECTION
} = require("../models/BorrowDetail");

const {
    BORROW_COLLECTION
} = require("../models/Borrow");

const {
    BOOK_COLLECTION
} = require("../models/Book");

const PENDING = "Chờ duyệt";

async function getCollection() {
    const db = await connectDB();

    return db.collection(
        BORROW_DETAIL_COLLECTION
    );
}

// Lấy tất cả chi tiết
async function findAll() {
    return (await getCollection())
        .find({})
        .toArray();
}

// Lấy các sách trong một phiếu
async function findByMaPhieu(maPhieu) {
    return (await getCollection())
        .find({ maPhieu })
        .toArray();
}

// =====================================================
// XÓA SÁCH KHỎI PHIẾU - CHỈ DÙNG TRONG TRƯỜNG HỢP ĐẶC BIỆT
// =====================================================

async function remove(maPhieu, maSach) {
    const db = await connectDB();

    const borrowCollection =
        db.collection(BORROW_COLLECTION);

    const detailCollection =
        db.collection(BORROW_DETAIL_COLLECTION);

    const bookCollection =
        db.collection(BOOK_COLLECTION);

    // Kiểm tra phiếu
    const borrow =
        await borrowCollection.findOne({
            maPhieu
        });

    if (!borrow) {
        return {
            notFound: true
        };
    }

    // Kiểm tra chi tiết
    const detail =
        await detailCollection.findOne({
            maPhieu,
            maSach
        });

    if (!detail) {
        return {
            detailNotFound: true
        };
    }

    // Chỉ được xóa khi phiếu vẫn đang chờ duyệt
    if (detail.trangThai !== PENDING) {
        return {
            invalidStatus: true
        };
    }

    // Xóa detail
    const deleteResult = await detailCollection.deleteOne({
        maPhieu,
        maSach
    });

    if (deleteResult.deletedCount === 0) {
        return {
            detailNotFound: true
        };
    }

    try {
        const borrowUpdate = await borrowCollection.updateOne(
            {
                maPhieu,
                soLuong: { $gt: 0 }
            },
            {
                $inc: {
                    soLuong: -1
                }
            }
        );

        if (borrowUpdate.modifiedCount === 0) {
            throw new Error("So luong sach tren phieu khong hop le");
        }
    } catch (error) {
        try {
            await detailCollection.insertOne(detail);
        } catch (restoreError) {
            const rollbackError = new Error(
                "Khong the cap nhat soLuong hoac khoi phuc borrow detail",
            );
            rollbackError.cause = error;
            rollbackError.restoreError = restoreError;
            throw rollbackError;
        }

        throw error;
    }

    // Trả lại 1 quyển vào kho
    await bookCollection.updateOne(
        { maSach },
        {
            $inc: {
                soQuyenConLai: 1
            }
        }
    );

    return {
        detail: {
            maPhieu,
            maSach,
            trangThai: PENDING
        }
    };
}

module.exports = {
    findAll,
    findByMaPhieu,
    remove
};
