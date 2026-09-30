const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const connectDB = require("../config/database");
const { ACCOUNT_COLLECTION } = require("../models/Account");
const { EMPLOYEE_COLLECTION } = require("../models/Employee");
const { USER_COLLECTION } = require("../models/User");

async function login(tenDangNhap, password) {
    const db = await connectDB();

    // Tìm tài khoản theo tên đăng nhập
    const account = await db.collection(ACCOUNT_COLLECTION).findOne({
        tenDangNhap: tenDangNhap
    });

    if (!account) {
        return {
            success: false,
            message: "Sai ten dang nhap hoac mat khau"
        };
    }

    // Kiểm tra tài khoản có đang hoạt động không
    if (account.trangThai !== true) {
        return {
            success: false,
            message: "Tai khoan da bi khoa"
        };
    }

    // Kiểm tra mật khẩu
    const isPasswordCorrect = await bcrypt.compare(
        password,
        account.password
    );

    if (!isPasswordCorrect) {
        return {
            success: false,
            message: "Sai ten dang nhap hoac mat khau"
        };
    }

    let loaiTaiKhoan = "";
    let chucVu = null;
    let thongTin = null;

    // DG = độc giả
    if (account.maTaiKhoan.startsWith("DG")) {
        loaiTaiKhoan = "DOCGIA";

        thongTin = await db.collection(USER_COLLECTION).findOne({
            maDocGia: account.maTaiKhoan
        });
    }

    // NV = nhân viên
    if (account.maTaiKhoan.startsWith("NV")) {
        loaiTaiKhoan = "NHANVIEN";

        thongTin = await db.collection(EMPLOYEE_COLLECTION).findOne({
            maNhanVien: account.maTaiKhoan
        });

        if (thongTin) {
            chucVu = thongTin.chucVu;
        }
    }

    // Tạo JWT
    const token = jwt.sign(
        {
            maTaiKhoan: account.maTaiKhoan,
            tenDangNhap: account.tenDangNhap,
            loaiTaiKhoan: loaiTaiKhoan,
            chucVu: chucVu
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "2h"
        }
    );

    // Không trả password về frontend
    return {
        success: true,
        token: token,
        user: {
            maTaiKhoan: account.maTaiKhoan,
            tenDangNhap: account.tenDangNhap,
            email: account.email,
            loaiTaiKhoan: loaiTaiKhoan,
            chucVu: chucVu,
            thongTin: thongTin
        }
    };
}

module.exports = {
    login
};