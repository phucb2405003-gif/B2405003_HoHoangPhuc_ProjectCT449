const jwt = require("jsonwebtoken");

const connectDB = require("../config/database");
const { ACCOUNT_COLLECTION } = require("../models/Account");
const { EMPLOYEE_COLLECTION } = require("../models/Employee");
const { USER_COLLECTION } = require("../models/User");

function unauthorized(res) {
    return res.status(401).json({
        message: "Tai khoan khong con hoat dong hoac ho so khong ton tai"
    });
}

async function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            message: "Chua dang nhap"
        });
    }

    const [scheme, token, ...extra] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token || extra.length) {
        return res.status(401).json({
            message: "Token khong hop le"
        });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return res.status(401).json({
            message: "Token khong hop le hoac da het han"
        });
    }

    if (!decoded?.maTaiKhoan) return unauthorized(res);

    let currentUser;
    try {
        const db = await connectDB();
        const account = await db.collection(ACCOUNT_COLLECTION).findOne({
            maTaiKhoan: decoded.maTaiKhoan
        });

        if (!account || account.trangThai !== true || typeof account.maTaiKhoan !== "string") {
            return unauthorized(res);
        }

        let loaiTaiKhoan;
        let chucVu = null;
        if (account.maTaiKhoan.startsWith("DG")) {
            const reader = await db.collection(USER_COLLECTION).findOne({
                maDocGia: account.maTaiKhoan
            });
            if (!reader) return unauthorized(res);
            loaiTaiKhoan = "DOCGIA";
        } else if (account.maTaiKhoan.startsWith("NV")) {
            const employee = await db.collection(EMPLOYEE_COLLECTION).findOne({
                maNhanVien: account.maTaiKhoan
            });
            if (!employee) return unauthorized(res);
            loaiTaiKhoan = "NHANVIEN";
            chucVu = employee.chucVu ?? null;
        } else {
            return unauthorized(res);
        }

        currentUser = {
            ...decoded,
            maTaiKhoan: account.maTaiKhoan,
            tenDangNhap: account.tenDangNhap,
            loaiTaiKhoan,
            chucVu
        };
    } catch (error) {
        console.error("Loi xac minh tai khoan va quyen hien tai:", error);
        return res.status(503).json({
            message: "Khong the xac minh tai khoan; vui long thu lai sau"
        });
    }

    req.user = currentUser;
    return next();
}

module.exports = {
    authenticateToken
};
