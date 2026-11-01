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
            message: "Không thể tải danh sách phiếu mượn. Vui lòng thử lại sau."
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
            message: "Không thể tải danh sách phiếu mượn. Vui lòng thử lại sau."
        });
    }
}

async function findOne(req, res) {
    try {
        const borrow = await borrowService.findOne(req.params.maPhieu);

        if (!borrow) {
            return res.status(404).json({
                message: "Không tìm thấy phiếu mượn."
            });
        }

        res.json(borrow);
    } catch (error) {
        console.error("Loi tim phieu muon:", error);
        res.status(500).json({
            message: "Không thể tải thông tin phiếu mượn. Vui lòng thử lại sau."
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
                message: "Bạn không có quyền tạo phiếu mượn."
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
            "Không thể tạo phiếu mượn. Vui lòng kiểm tra lại dữ liệu."
        );
    }
}

async function submit(req, res) {
    try {
        const result = await borrowService.submit(req.params.maPhieu, req.user);
        if (result.notFound) return res.status(404).json({ message: "Không tìm thấy phiếu mượn." });
        if (result.forbidden) return res.status(403).json({ message: "Bạn không có quyền gửi phiếu mượn này." });
        if (result.invalidStatus || result.invalidDetails) return res.status(400).json({ message: "Phiếu mượn không hợp lệ để gửi. Vui lòng kiểm tra trạng thái và danh sách sách." });
        if (result.expired) return res.status(400).json({ message: "Phiếu mượn đã hết hạn." });
        return res.json({ message: "Đã gửi phiếu mượn thành công.", borrow: result.borrow });
    } catch (error) {
        return serviceErrorResponse(res, error, `gui phieu muon ${req.params.maPhieu}`, "Không thể gửi phiếu mượn. Vui lòng thử lại sau.");
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
                message: "Không tìm thấy phiếu mượn."
            });
        }

        if (result.forbidden) {
            return res.status(403).json({
                message: "Bạn không có quyền xóa phiếu mượn này."
            });
        }

        if (result.expired) {
            return res.status(400).json({ message: "Phiếu mượn đã hết hạn." });
        }

        if (result.invalidStatus) {
            return res.status(400).json({
                message: "Chỉ được xóa phiếu trực tuyến khi tất cả sách trong phiếu đang chờ duyệt."
            });
        }

        return res.json({ message: "Đã hủy phiếu mượn thành công." });
    } catch (error) {
        return serviceErrorResponse(
            res,
            error,
            `huy phieu muon ${req.params.maPhieu}`,
            "Không thể hủy phiếu mượn. Vui lòng thử lại sau."
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
                message: "Không tìm thấy phiếu mượn."
            });
        }

        if (result.invalidStatus) {
            return res.status(400).json({
                message:
                    "Phiếu mượn không ở trạng thái chờ duyệt."
            });
        }

        res.json({
            message: "Đã duyệt phiếu mượn thành công.",
            borrow: result.borrow
        });
    } catch (error) {
        return serviceErrorResponse(
            res,
            error,
            `duyet phieu muon ${req.params.maPhieu}`,
            "Không thể duyệt phiếu mượn. Vui lòng thử lại sau."
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
                message: "Không tìm thấy phiếu mượn."
            });
        }

        if (result.invalidStatus) {
            return res.status(400).json({
                message:
                    "Phiếu mượn không ở trạng thái chờ duyệt."
            });
        }

        res.json({
            message: "Đã từ chối phiếu mượn thành công.",
            borrow: result.borrow
        });
    } catch (error) {
        return serviceErrorResponse(
            res,
            error,
            `tu choi phieu muon ${req.params.maPhieu}`,
            "Không thể từ chối phiếu mượn. Vui lòng thử lại sau."
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
                message: "Không tìm thấy phiếu mượn."
            });
        }

        if (result.detailNotFound) {
            return res.status(404).json({
                message: "Không tìm thấy sách trong phiếu mượn."
            });
        }

        if (result.invalidStatus) {
            return res.status(400).json({
                message:
                    "Sách không ở trạng thái đang mượn."
            });
        }

        res.json({
            message: "Đã ghi nhận trả sách thành công.",
            borrow: result.borrow,
            detail: result.detail
        });
    } catch (error) {
        return serviceErrorResponse(
            res,
            error,
            `tra sach ${req.params.maSach} trong phieu ${req.params.maPhieu}`,
            "Không thể ghi nhận trả sách. Vui lòng thử lại sau."
        );
    }
}

module.exports = {
    findAll,
    findMine,
    findOne,
    create,
    submit,
    approve,
    reject,
    returnBook,
    remove
};
