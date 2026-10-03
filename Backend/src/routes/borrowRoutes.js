const express = require("express");

const borrowController = require("../controllers/borrowController");
const borrowDetailController = require("../controllers/borrowDetailController");

const { authenticateToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");
const { allowOwnBorrow } = require("../middlewares/borrowReaderMiddleware");

const router = express.Router();

const staffRoles = ["Quản lý", "Thủ thư"];

// =====================================================
// LẤY DANH SÁCH PHIẾU MƯỢN
// =====================================================

router.get("/", authenticateToken, (req, res, next) => {
    // Nhan vien duoc xem tat ca phieu
    if (staffRoles.includes(req.user.chucVu)) {
        return borrowController.findAll(req, res, next);
    }

    // Doc gia chi xem phieu cua minh
    if (req.user.loaiTaiKhoan === "DOCGIA") {
        return borrowController.findMine(req, res, next);
    }

    return res.status(403).json({
        message: "Khong co quyen xem phieu muon"
    });
});

// =====================================================
// XEM CHI TIET SACH TRONG MOT PHIEU
// =====================================================

router.get(
    "/:maPhieu/borrow-details",
    authenticateToken,
    (req, res, next) => {
        // Nhan vien duoc xem
        if (staffRoles.includes(req.user.chucVu)) {
            return next();
        }

        // Doc gia chi xem phieu cua minh
        if (req.user.loaiTaiKhoan === "DOCGIA") {
            return allowOwnBorrow(req, res, next);
        }

        return res.status(403).json({
            message: "Khong co quyen xem phieu muon"
        });
    },
    borrowDetailController.findByMaPhieu
);

// =====================================================
// XEM PHIEU CUA BAN THAN
// =====================================================
router.get(
    "/mine",
    authenticateToken,
    (req, res, next) => {
        if (req.user.loaiTaiKhoan !== "DOCGIA") {
            return res.status(403).json({
                message: "Chi doc gia moi duoc xem phieu cua minh"
            });
        }

        return borrowController.findMine(req, res, next);
    }
);

// =====================================================
// XEM MOT PHIEU
// =====================================================

router.get(
    "/:maPhieu",
    authenticateToken,
    (req, res, next) => {
        if (staffRoles.includes(req.user.chucVu)) {
            return next();
        }

        if (req.user.loaiTaiKhoan === "DOCGIA") {
            return allowOwnBorrow(req, res, next);
        }

        return res.status(403).json({
            message: "Khong co quyen xem phieu muon"
        });
    },
    borrowController.findOne
);

// =====================================================
// TAO PHIEU MUON
// =====================================================

router.post(
    "/",
    authenticateToken,
    borrowController.create
);

// =====================================================
// DUYET PHIEU
// =====================================================

router.put(
    "/:maPhieu/approve",
    authenticateToken,
    allowRoles(...staffRoles),
    borrowController.approve
);

// =====================================================
// TU CHOI PHIEU
// =====================================================

router.put(
    "/:maPhieu/reject",
    authenticateToken,
    allowRoles(...staffRoles),
    borrowController.reject
);

// =====================================================
// TRA MOT QUYEN SACH
// =====================================================

router.put(
    "/:maPhieu/return/:maSach",
    authenticateToken,
    allowRoles(...staffRoles),
    borrowController.returnBook
);

// =====================================================
// TRUONG HOP DAC BIET:
// XOA MOT SACH KHOI CHI TIET KHI PHIEU CHUA DUYET
// =====================================================

// Chi Quan ly duoc thuc hien nghiep vu dac biet nay
router.delete(
    "/:maPhieu/borrow-details/:maSach",
    authenticateToken,
    allowRoles("Quản lý"),
    borrowDetailController.remove
);

module.exports = router;