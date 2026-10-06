const connectDB = require("../config/database");

const {
    BORROW_COLLECTION
} = require("../models/Borrow");

const {
    BORROW_DETAIL_COLLECTION
} = require("../models/BorrowDetail");

const {
    BOOK_COLLECTION
} = require("../models/Book");
const { generateCode } = require("./codeGeneratorService");

const STATUSES = {
    PENDING: "Chờ duyệt",
    BORROWED: "Đang mượn",
    RETURNED: "Đã trả",
    REJECTED: "Từ chối",
    CANCELLED: "Hủy"
};

// Chuẩn hóa danh sách sách đăng ký
function normalizeDetails(details) {
    if (
        !Array.isArray(details) ||
        details.length === 0
    ) {
        throw new Error(
            "Phiếu mượn phải có ít nhất một sách"
        );
    }

    const seen = new Set();

    return details.map((detail) => {
        if (
            !detail.maSach ||
            seen.has(detail.maSach)
        ) {
            throw new Error(
                "maSach bị thiếu hoặc trùng trong phiếu"
            );
        }

        seen.add(detail.maSach);

        return {
            maSach: detail.maSach,
            hanTra: detail.hanTra || null
        };
    });
}

async function getCollection() {
    const db = await connectDB();

    return db.collection(
        BORROW_COLLECTION
    );
}

// Lấy tất cả phiếu
async function findAll() {
    return (await getCollection())
        .find({})
        .toArray();
}

// Lấy một phiếu
async function findOne(maPhieu) {
    return (await getCollection()).findOne({
        maPhieu
    });
}

// Lấy phiếu của một độc giả
async function findByMaDocGia(maDocGia) {
    return (await getCollection())
        .find({ maDocGia })
        .toArray();
}

// =====================================================
// TẠO PHIẾU + TẠO TOÀN BỘ CHI TIẾT
// =====================================================

async function create(borrow) {
    const db = await connectDB();

    const borrowCollection =
        db.collection(BORROW_COLLECTION);

    const detailCollection =
        db.collection(BORROW_DETAIL_COLLECTION);

    const bookCollection =
        db.collection(BOOK_COLLECTION);

    // Danh sach sach duoc dang ky
    const details = normalizeDetails(
        borrow.borrowDetails ||
        borrow.detaiMuon
    );

    const direct =
        borrow.mode === "direct";

    // Kiem tra thong tin bat buoc
    if (
        !borrow.maDocGia ||
        (direct && !borrow.maNhanVien)
    ) {
        throw new Error(
            "Thiếu thông tin người mượn"
        );
    }

    // =================================================
    // KHONG CHO DOC GIA DANG KY LAI SACH
    // DANG CHO DUYET HOAC DANG MUON
    // =================================================

    // Chi ap dung cho dang ky muon online cua doc gia
    if (!direct) {
        // Lay cac phieu cua doc gia nay
        const activeBorrows =
            await borrowCollection.find({
                maDocGia: borrow.maDocGia
            }).toArray();

        const activeBorrowIds =
            activeBorrows.map(
                (borrow) => borrow.maPhieu
            );

        // Neu doc gia chua co phieu nao thi bo qua
        if (activeBorrowIds.length > 0) {
            // Tim cac sach trung voi sach dang muon
            // hoac dang cho duyet
            const activeDetails =
                await detailCollection.find({
                    maPhieu: {
                        $in: activeBorrowIds
                    },
                    maSach: {
                        $in: details.map(
                            (detail) => detail.maSach
                        )
                    },
                    trangThai: {
                        $in: [
                            STATUSES.PENDING,
                            STATUSES.BORROWED
                        ]
                    }
                }).toArray();

            // Neu co sach trung thi khong cho dang ky
            if (activeDetails.length > 0) {
                const conflict =
                    activeDetails[0];

                if (
                    conflict.trangThai ===
                    STATUSES.PENDING
                ) {
                    throw new Error(
                        `Bạn đã đăng ký sách ${conflict.maSach} trong phiếu ${conflict.maPhieu} và đang chờ duyệt`
                    );
                }

                if (
                    conflict.trangThai ===
                    STATUSES.BORROWED
                ) {
                    throw new Error(
                        `Bạn đang mượn sách ${conflict.maSach} trong phiếu ${conflict.maPhieu}`
                    );
                }
            }
        }
    }

    const reserved = [];

    let borrowInserted = false;
    let maPhieu;

    try {
        // =============================================
        // KIEM TRA + GIU KHO
        // =============================================

        for (const detail of details) {
            const book =
                await bookCollection.findOne({
                    maSach: detail.maSach
                });

            if (!book) {
                throw new Error(
                    `Không tìm thấy sách ${detail.maSach}`
                );
            }

            const available =
                book.soQuyenConLai ??
                book.soQuyen ??
                0;

            if (available < 1) {
                throw new Error(
                    `Sách ${detail.maSach} đã hết`
                );
            }

            await bookCollection.updateOne(
                {
                    maSach: detail.maSach
                },
                {
                    $set: {
                        soQuyenConLai:
                            available - 1
                    }
                }
            );

            reserved.push({
                maSach: detail.maSach,
                available
            });
        }

        // =============================================
        // TAO PHIEU
        // =============================================

        maPhieu = await generateCode("PM");

        const record = {
            maPhieu,
            maDocGia: borrow.maDocGia,

            maNhanVien: direct
                ? borrow.maNhanVien
                : null,

            // So sach dang ky tai thoi diem tao phieu
            soLuong: details.length,

            // Yeu cau online
            ngayYeuCau: direct
                ? null
                : new Date(),

            // Muon truc tiep thi co ngay muon ngay
            ngayMuon: direct
                ? new Date()
                : null
        };

        await borrowCollection.insertOne(
            record
        );

        borrowInserted = true;

        // =============================================
        // TAO CHI TIET NGAY LUC TAO PHIEU
        // =============================================

        await detailCollection.insertMany(
            details.map((detail) => ({
                maPhieu:
                    record.maPhieu,

                maSach:
                    detail.maSach,

                hanTra:
                    detail.hanTra,

                ngayTra: null,

                trangThai: direct
                    ? STATUSES.BORROWED
                    : STATUSES.PENDING
            }))
        );

        return findOne(record.maPhieu);
    } catch (error) {
        // =============================================
        // ROLLBACK NEU TAO PHIEU THAT BAI
        // =============================================

        if (maPhieu) {
            await detailCollection.deleteMany({
                maPhieu
            });
        }

        if (borrowInserted) {
            await borrowCollection.deleteOne({
                maPhieu
            });
        }

        // Tra lai kho
        for (const book of reserved) {
            await bookCollection.updateOne(
                {
                    maSach: book.maSach
                },
                {
                    $set: {
                        soQuyenConLai:
                            book.available
                    }
                }
            );
        }

        throw error;
    }
}

// =====================================================
// DUYỆT / TỪ CHỐI / HỦY PHIẾU
// =====================================================

async function changeStatus(
    maPhieu,
    nextStatus,
    maNhanVien,
    lyDoTuChoi
) {
    const db = await connectDB();

    const borrowCollection =
        db.collection(BORROW_COLLECTION);

    const detailCollection =
        db.collection(BORROW_DETAIL_COLLECTION);

    const bookCollection =
        db.collection(BOOK_COLLECTION);

    const borrow =
        await borrowCollection.findOne({
            maPhieu
        });

    if (!borrow) {
        return {
            notFound: true
        };
    }

    // Chi xu ly cac detail dang cho duyet
    const pendingDetails =
        await detailCollection
            .find({
                maPhieu,
                trangThai: STATUSES.PENDING
            })
            .toArray();

    if (pendingDetails.length === 0) {
        return {
            invalidStatus: true
        };
    }

    // =============================================
    // DUYỆT
    // =============================================

    if (
        nextStatus === STATUSES.BORROWED
    ) {
        await detailCollection.updateMany(
            {
                maPhieu,
                trangThai:
                    STATUSES.PENDING
            },
            {
                $set: {
                    trangThai:
                        STATUSES.BORROWED
                }
            }
        );

        await borrowCollection.updateOne(
            {
                maPhieu
            },
            {
                $set: {
                    maNhanVien,
                    ngayMuon: new Date()
                }
            }
        );
    }

    // =============================================
    // TỪ CHỐI / HỦY
    // =============================================

    else if (
        nextStatus ===
            STATUSES.REJECTED ||
        nextStatus ===
            STATUSES.CANCELLED
    ) {
        await detailCollection.updateMany(
            {
                maPhieu,
                trangThai:
                    STATUSES.PENDING
            },
            {
                $set: {
                    trangThai:
                        nextStatus
                }
            }
        );

        // Tra lai kho cho cac sach dang cho duyet
        for (const detail of pendingDetails) {
            await bookCollection.updateOne(
                {
                    maSach:
                        detail.maSach
                },
                {
                    $inc: {
                        soQuyenConLai: 1
                    }
                }
            );
        }

        const set = {};

        if (lyDoTuChoi) {
            set.lyDoTuChoi =
                lyDoTuChoi;
        }

        if (
            Object.keys(set).length > 0
        ) {
            await borrowCollection.updateOne(
                {
                    maPhieu
                },
                {
                    $set: set
                }
            );
        }
    }

    else {
        return {
            invalidStatus: true
        };
    }

    return {
        borrow:
            await findOne(maPhieu)
    };
}

// =====================================================
// TRẢ TỪNG SÁCH
// =====================================================

async function returnBook(
    maPhieu,
    maSach
) {
    const db = await connectDB();

    const borrowCollection =
        db.collection(BORROW_COLLECTION);

    const detailCollection =
        db.collection(BORROW_DETAIL_COLLECTION);

    const bookCollection =
        db.collection(BOOK_COLLECTION);

    const borrow =
        await borrowCollection.findOne({
            maPhieu
        });

    if (!borrow) {
        return {
            notFound: true
        };
    }

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

    // Chi sach dang muon moi duoc tra
    if (
        detail.trangThai !==
        STATUSES.BORROWED
    ) {
        return {
            invalidStatus: true
        };
    }

    const ngayTra = new Date();

    await detailCollection.updateOne(
        {
            maPhieu,
            maSach
        },
        {
            $set: {
                trangThai:
                    STATUSES.RETURNED,
                ngayTra
            }
        }
    );

    // Tra lai kho
    await bookCollection.updateOne(
        {
            maSach
        },
        {
            $inc: {
                soQuyenConLai: 1
            }
        }
    );

    return {
        borrow:
            await findOne(maPhieu),

        detail:
            await detailCollection.findOne({
                maPhieu,
                maSach
            })
    };
}

module.exports = {
    findAll,
    findOne,
    findByMaDocGia,
    create,
    changeStatus,
    returnBook,
    STATUSES
};
