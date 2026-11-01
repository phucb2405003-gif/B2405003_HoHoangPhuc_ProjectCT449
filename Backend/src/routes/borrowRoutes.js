const express = require("express");

const borrowController = require("../controllers/borrowController");
const borrowDetailController = require("../controllers/borrowDetailController");

const { authenticateToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");
const {
    allowOwnBorrow,
    allowReaderOrManager
} = require("../middlewares/borrowReaderMiddleware");

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
        message: "Bạn không có quyền xem phiếu mượn."
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
            message: "Bạn không có quyền xem phiếu mượn."
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
                message: "Chỉ độc giả mới được xem phiếu mượn của mình."
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
            message: "Bạn không có quyền xem phiếu mượn."
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

router.put(
    "/:maPhieu/submit",
    authenticateToken,
    borrowController.submit
);

router.post(
    "/:maPhieu/borrow-details",
    authenticateToken,
    borrowDetailController.add
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

// Xoa toan bo phieu truc tuyen dang cho duyet
router.delete(
    "/:maPhieu",
    authenticateToken,
    (req, res, next) => {
        if (req.user.loaiTaiKhoan !== "DOCGIA") {
            return res.status(403).json({
                message: "Chỉ độc giả mới được xóa phiếu mượn của mình."
            });
        }
        return next();
    },
    borrowController.remove
);

// =====================================================
// Them hoac xoa sach khoi phieu khi dang chon sach
// =====================================================

router.delete(
    "/:maPhieu/borrow-details/:maSach",
    authenticateToken,
    allowReaderOrManager,
    borrowDetailController.remove
);

module.exports = router;
