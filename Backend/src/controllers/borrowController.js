const borrowService = require("../services/borrowService");

async function findAll(req, res) {
    try {
        res.json(await borrowService.findAll());
    } catch (error) {
        console.error("Loi lay danh sach phieu muon:", error);
        res.status(500).json({
            message: "Khong the lay danh sach phieu muon"
        });
    }
}

async function findMine(req, res) {
    try {
        res.json(
            await borrowService.findByMaDocGia(req.user.maTaiKhoan)
        );
    } catch (error) {
        console.error("Loi lay phieu muon cua doc gia:", error);
        res.status(500).json({
            message: "Khong the lay danh sach phieu muon"
        });
    }
}

async function findOne(req, res) {
    try {
        const borrow = await borrowService.findOne(req.params.maPhieu);

        if (!borrow) {
            return res.status(404).json({
                message: "Khong tim thay phieu muon"
            });
        }

        res.json(borrow);
    } catch (error) {
        console.error("Loi tim phieu muon:", error);
        res.status(500).json({
            message: "Khong the tim phieu muon"
        });
    }
}

async function create(req, res) {
    try {
        const payload = { ...req.body };

        const isReader = req.user.loaiTaiKhoan === "DOCGIA";
        const isStaff = ["Quản lý", "Thủ thư"].includes(
            req.user.chucVu
        );

        if (!isReader && !isStaff) {
            return res.status(403).json({
                message: "Ban khong co quyen tao phieu muon"
            });
        }

        if (isReader) {
            // Doc gia chi duoc tao phieu cho chinh minh
            payload.maDocGia = req.user.maTaiKhoan;

            // Doc gia khong duoc tu tao phieu truc tiep
            delete payload.maNhanVien;
            delete payload.mode;
        } else {
            // Nhan vien tao phieu truc tiep tai thu vien
            payload.maNhanVien = req.user.maTaiKhoan;
            payload.mode = "direct";
        }

        const borrow = await borrowService.create(payload);

        res.status(201).json(borrow);
    } catch (error) {
        console.error("Loi tao phieu muon:", error);

        const badRequest =
            /phải|trùng|Thiếu|Không tìm thấy|không đủ|đã hết|khong|Khong/i.test(
                error.message
            );

        res.status(badRequest ? 400 : 500).json({
            message:
                error.message || "Khong the tao phieu muon"
        });
    }
}

// Duyet phieu cho
async function approve(req, res) {
    try {
        const result = await borrowService.changeStatus(
            req.params.maPhieu,
            borrowService.STATUSES.BORROWED,
            req.user.maTaiKhoan
        );

        if (result.notFound) {
            return res.status(404).json({
                message: "Khong tim thay phieu muon"
            });
        }

        if (result.invalidStatus) {
            return res.status(400).json({
                message:
                    "Phieu muon khong o trang thai cho duyet"
            });
        }

        res.json({
            message: "Duyet phieu muon thanh cong",
            borrow: result.borrow
        });
    } catch (error) {
        console.error("Loi duyet phieu muon:", error);

        res.status(500).json({
            message: "Khong the duyet phieu muon"
        });
    }
}

// Tu choi phieu cho
async function reject(req, res) {
    try {
        const result = await borrowService.changeStatus(
            req.params.maPhieu,
            borrowService.STATUSES.REJECTED,
            req.user.maTaiKhoan,
            req.body.lyDoTuChoi
        );

        if (result.notFound) {
            return res.status(404).json({
                message: "Khong tim thay phieu muon"
            });
        }

        if (result.invalidStatus) {
            return res.status(400).json({
                message:
                    "Phieu muon khong o trang thai cho duyet"
            });
        }

        res.json({
            message: "Tu choi phieu muon thanh cong",
            borrow: result.borrow
        });
    } catch (error) {
        console.error("Loi tu choi phieu muon:", error);

        res.status(500).json({
            message: "Khong the tu choi phieu muon"
        });
    }
}

// Tra tung sach trong phieu
async function returnBook(req, res) {
    try {
        const result = await borrowService.returnBook(
            req.params.maPhieu,
            req.params.maSach
        );

        if (result.notFound) {
            return res.status(404).json({
                message: "Khong tim thay phieu muon"
            });
        }

        if (result.detailNotFound) {
            return res.status(404).json({
                message: "Khong tim thay sach trong phieu muon"
            });
        }

        if (result.invalidStatus) {
            return res.status(400).json({
                message:
                    "Sach khong o trang thai dang muon"
            });
        }

        res.json({
            message: "Tra sach thanh cong",
            borrow: result.borrow,
            detail: result.detail
        });
    } catch (error) {
        console.error("Loi tra sach:", error);

        res.status(500).json({
            message: "Khong the tra sach"
        });
    }
}

module.exports = {
    findAll,
    findMine,
    findOne,
    create,
    approve,
    reject,
    returnBook
};