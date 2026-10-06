const connectDB = require("../config/database");
const { ACCOUNT_COLLECTION } = require("../models/Account");
const { USER_COLLECTION } = require("../models/User");
const { EMPLOYEE_COLLECTION } = require("../models/Employee");
const bcrypt = require("bcryptjs");

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
    const error = new Error("Password phai la chuoi hop le");
    error.code = "INVALID_PASSWORD";
    return error;
}

// Tạo tài khoản
async function create(account) {
    const db = await connectDB();
    const collection = db.collection(ACCOUNT_COLLECTION);

    await ensureLinkedEntityExists(db, account.maTaiKhoan);

    const existingAccount = await collection.findOne({
        tenDangNhap: account.tenDangNhap
    });

    if (existingAccount) {
        throw duplicateUsernameError();
    }

    const accountToInsert = { ...account };
    if (
        typeof accountToInsert.password !== "string" ||
        !accountToInsert.password
    ) {
        throw invalidPasswordError();
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
    const collection = await getCollection();
    const accountToUpdate = { ...account };
    delete accountToUpdate.maTaiKhoan;

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
        if (
            typeof accountToUpdate.password !== "string" ||
            !accountToUpdate.password
        ) {
            throw invalidPasswordError();
        }

        if (!isBcryptHash(accountToUpdate.password)) {
            accountToUpdate.password = await bcrypt.hash(
                accountToUpdate.password,
                10,
            );
        }
    }

    await collection.updateOne(
        {
            maTaiKhoan: maTaiKhoan
        },
        {
            $set: accountToUpdate
        }
    );

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
    findAll,
    findOne,
    create,
    update,
    remove
};
