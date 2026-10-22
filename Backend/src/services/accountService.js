const connectDB = require("../config/database");
const { ACCOUNT_COLLECTION } = require("../models/Account");
const { USER_COLLECTION } = require("../models/User");
const { EMPLOYEE_COLLECTION } = require("../models/Employee");
const bcrypt = require("bcryptjs");
const { getUpdateFields } = require("./updatePayload");

function withoutPassword(account) {
    if (!account) {
        return account;
    }

    const safeAccount = { ...account };
    delete safeAccount.password;
    return safeAccount;
}

function isBcryptHash(value) {
    return typeof value === "string" &&
        /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value);
}

async function ensureLinkedEntityExists(db, maTaiKhoan) {
    if (typeof maTaiKhoan !== "string") {
        return;
    }

    let collectionName;
    let idField;

    if (maTaiKhoan.startsWith("DG")) {
        collectionName = USER_COLLECTION;
        idField = "maDocGia";
    } else if (maTaiKhoan.startsWith("NV")) {
        collectionName = EMPLOYEE_COLLECTION;
        idField = "maNhanVien";
    } else {
        return;
    }

    const entity = await db.collection(collectionName).findOne({
        [idField]: maTaiKhoan,
    });

    if (!entity) {
        const error = new Error(
            `Khong tim thay doi tuong lien ket cho maTaiKhoan ${maTaiKhoan}`,
        );
        error.code = "LINKED_ENTITY_NOT_FOUND";
        throw error;
    }
}

async function getCollection() {
    const db = await connectDB();
    return db.collection(ACCOUNT_COLLECTION);
}

// Lấy tất cả tài khoản
async function findAll() {
    const collection = await getCollection();
    const accounts = await collection.find({}).toArray();
    return accounts.map(withoutPassword);
}

// Tìm tài khoản theo mã
async function findOne(maTaiKhoan) {
    const collection = await getCollection();

    const account = await collection.findOne({
        maTaiKhoan: maTaiKhoan
    });
    return withoutPassword(account);
}

function duplicateUsernameError() {
    const error = new Error("Ten dang nhap da ton tai");
    error.code = "DUPLICATE_USERNAME";
    return error;
}

function invalidPasswordError() {
    const error = new Error("Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt");
    error.code = "INVALID_PASSWORD";
    return error;
}

function validateNewPassword(password, { allowBcryptHash = false } = {}) {
    if (isBcryptHash(password)) {
        if (allowBcryptHash) return password;
        throw invalidPasswordError();
    }

    if (
        typeof password !== "string" ||
        /^\s*$/u.test(password) ||
        [...password].length < 8 ||
        !/[A-Z]/.test(password) ||
        !/[a-z]/.test(password) ||
        !/[0-9]/.test(password) ||
        !/[^A-Za-z0-9\s]/u.test(password)
    ) {
        throw invalidPasswordError();
    }

    return password;
}

function validateCreatePayload(account, { allowBcryptPassword = false } = {}) {
    if (
        account === null ||
        typeof account !== "object" ||
        Array.isArray(account) ||
        Object.getPrototypeOf(account) !== Object.prototype
    ) {
        const error = new Error("Du lieu tao tai khoan khong hop le");
        error.code = "INVALID_UPDATE";
        throw error;
    }

    if (
        typeof account.maTaiKhoan !== "string" ||
        account.maTaiKhoan.trim().length === 0 ||
        (!account.maTaiKhoan.startsWith("DG") && !account.maTaiKhoan.startsWith("NV")) ||
        !Object.hasOwn(account, "tenDangNhap")
    ) {
        const error = new Error("Du lieu tao tai khoan khong hop le");
        error.code = "INVALID_UPDATE";
        throw error;
    }

    const accountFields = Object.fromEntries(
        Object.entries(account).filter(([field]) => ["tenDangNhap", "email", "trangThai"].includes(field))
    );
    const validated = getUpdateFields(accountFields, {
        tenDangNhap: "string",
        email: "email",
        trangThai: "boolean",
    });
    return {
        ...account,
        ...validated,
        password: validateNewPassword(account.password, { allowBcryptHash: allowBcryptPassword }),
    };
}

// Tạo tài khoản
async function create(account) {
    // Direct service callers may provide a password already hashed by a trusted internal flow.
    // The HTTP controller validates request passwords with allowBcryptPassword=false first.
    const accountToInsert = validateCreatePayload(account, { allowBcryptPassword: true });
    const db = await connectDB();
    const collection = db.collection(ACCOUNT_COLLECTION);

    await ensureLinkedEntityExists(db, account.maTaiKhoan);

    const existingAccount = await collection.findOne({
        tenDangNhap: account.tenDangNhap
    });

    if (existingAccount) {
        throw duplicateUsernameError();
    }

    if (!isBcryptHash(accountToInsert.password)) {
        accountToInsert.password = await bcrypt.hash(
            accountToInsert.password,
            10,
        );
    }

    const result = await collection.insertOne(accountToInsert);

    const createdAccount = await collection.findOne({
        _id: result.insertedId
    });
    return withoutPassword(createdAccount);
}

// Cập nhật tài khoản
async function update(maTaiKhoan, account) {
    const accountToUpdate = getUpdateFields(account, {
        tenDangNhap: "string",
        password: "string",
        email: "email",
        trangThai: "boolean",
    });

    if (Object.hasOwn(accountToUpdate, "password")) {
        accountToUpdate.password = validateNewPassword(accountToUpdate.password, {
            allowBcryptHash: true,
        });
    }

    const collection = await getCollection();

    if (!(await collection.findOne({ maTaiKhoan }))) {
        const error = new Error("Khong tim thay tai khoan");
        error.code = "NOT_FOUND";
        throw error;
    }

    if (accountToUpdate.tenDangNhap !== undefined) {
        const existingAccount = await collection.findOne({
            tenDangNhap: accountToUpdate.tenDangNhap,
            maTaiKhoan: { $ne: maTaiKhoan }
        });

        if (existingAccount) {
            throw duplicateUsernameError();
        }
    }

    if (Object.hasOwn(accountToUpdate, "password")) {
        if (!isBcryptHash(accountToUpdate.password)) {
            accountToUpdate.password = await bcrypt.hash(
                accountToUpdate.password,
                10,
            );
        }
    }

    const result = await collection.updateOne(
        {
            maTaiKhoan: maTaiKhoan
        },
        {
            $set: accountToUpdate
        }
    );

    if (result.matchedCount === 0) {
        const error = new Error("Khong tim thay tai khoan");
        error.code = "NOT_FOUND";
        throw error;
    }

    return await findOne(maTaiKhoan);
}

// Xóa tài khoản
async function remove(maTaiKhoan) {
    const collection = await getCollection();

    return await collection.deleteOne({
        maTaiKhoan: maTaiKhoan
    });
}

module.exports = {
    validateCreatePayload,
    validateNewPassword,
    findAll,
    findOne,
    create,
    update,
    remove
};
