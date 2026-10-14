const borrowService = require("../services/borrowService");

function serviceErrorResponse(res, error, operation, fallbackMessage) {
    console.error(`Loi ${operation}:`, error);
    const statusCode = Number.isInteger(error.statusCode) &&
        error.statusCode >= 400 &&
        error.statusCode <= 599
        ? error.statusCode
        : 500;
    const message = statusCode < 500
        ? (error.publicMessage || error.message || fallbackMessage)
        : (error.publicMessage || fallbackMessage);

    return res.status(statusCode).json({ message });
}

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
        return serviceErrorResponse(
            res,
            error,
            `tao phieu muon ${req.user?.maTaiKhoan || "unknown"}`,
            "Khong the tao phieu muon"
        );
    }
}

async function remove(req, res) {
    try {
        const result = await borrowService.deletePendingBorrow(
            req.params.maPhieu,
            req.user
        );

        if (result.notFound) {
            return res.status(404).json({
                message: "Khong tim thay phieu muon"
            });
        }

        if (result.forbidden) {
            return res.status(403).json({
                message: "Ban khong co quyen xoa phieu muon nay"
            });
        }

        if (result.invalidStatus) {
            return res.status(400).json({
                message: "Chi duoc xoa phieu truc tuyen khi tat ca sach dang cho duyet"
            });
        }

        return res.json({ message: "Xoa phieu muon thanh cong" });
    } catch (error) {
        return serviceErrorResponse(
            res,
            error,
            `xoa phieu muon ${req.params.maPhieu}`,
            "Khong the xoa phieu muon"
        );
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
        return serviceErrorResponse(
            res,
            error,
            `duyet phieu muon ${req.params.maPhieu}`,
            "Khong the duyet phieu muon"
        );
    }
}

// Tu choi phieu cho
async function reject(req, res) {
    try {
        const result = await borrowService.changeStatus(
            req.params.maPhieu,
            borrowService.STATUSES.REJECTED,
            req.user.maTaiKhoan,
            req.body?.lyDoTuChoi
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
        return serviceErrorResponse(
            res,
            error,
            `tu choi phieu muon ${req.params.maPhieu}`,
            "Khong the tu choi phieu muon"
        );
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
        return serviceErrorResponse(
            res,
            error,
            `tra sach ${req.params.maSach} trong phieu ${req.params.maPhieu}`,
            "Khong the tra sach"
        );
    }
}

module.exports = {
    findAll,
    findMine,
    findOne,
    create,
    approve,
    reject,
    returnBook,
    remove
};
