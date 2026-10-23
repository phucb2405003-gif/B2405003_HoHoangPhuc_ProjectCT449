const connectDB = require("../config/database");
const { ACCOUNT_COLLECTION } = require("../models/Account");
const { USER_COLLECTION } = require("../models/User");
const { EMPLOYEE_COLLECTION } = require("../models/Employee");
const bcrypt = require("bcryptjs");
const { randomInt, randomUUID } = require("node:crypto");
const { getUpdateFields } = require("./updatePayload");

const ACCOUNT_CREATION_LOCK_COLLECTION = "account_creation_locks";
const ACCOUNT_CREATION_LOCK_WAIT_MS = 15000;
const ACCOUNT_CREATION_LOCK_ERROR_CODES = new Set([
    "ACCOUNT_CREATION_BUSY",
    "ACCOUNT_CREATION_LOCK_UNCONFIRMED",
    "ACCOUNT_CREATION_LOCK_LOST",
    "ACCOUNT_CREATION_LOCK_CLEANUP",
]);

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

function duplicateAccountError() {
    const error = new Error("Tai khoan da ton tai cho ho so nay");
    error.code = "ACCOUNT_ALREADY_EXISTS";
    return error;
}

function createAccountCreationBusyError() {
    const error = new Error("He thong dang tao tai khoan; vui long thu lai sau");
    error.code = "ACCOUNT_CREATION_BUSY";
    error.statusCode = 503;
    return error;
}

async function withAccountCreationLock(db, maTaiKhoan, operation) {
    const locks = db.collection(ACCOUNT_CREATION_LOCK_COLLECTION);
    const lockId = `account:${maTaiKhoan}`;
    const token = randomUUID();
    const deadline = Date.now() + ACCOUNT_CREATION_LOCK_WAIT_MS;
    let acquired = false;

    while (!acquired && Date.now() < deadline) {
        try {
            const lock = await locks.findOneAndUpdate(
                { _id: lockId, owner: { $exists: false } },
                { $set: { owner: token, ownerPid: process.pid, acquiredAt: new Date() } },
                { upsert: true, returnDocument: "after" }
            );
            acquired = lock?.owner === token;
        } catch (error) {
            if (error.code !== 11000) {
                const lockError = createAccountCreationBusyError();
                lockError.code = "ACCOUNT_CREATION_LOCK_UNCONFIRMED";
                lockError.cause = error;
                throw lockError;
            }
        }

        if (!acquired) await new Promise((resolve) => setTimeout(resolve, 50));
    }

    if (!acquired) throw createAccountCreationBusyError();

    const assertOwned = async () => {
        let ownedLock;
        try {
            ownedLock = await locks.findOne({ _id: lockId, owner: token });
        } catch (cause) {
            const error = createAccountCreationBusyError();
            error.code = "ACCOUNT_CREATION_LOCK_LOST";
            error.cause = cause;
            throw error;
        }
        if (!ownedLock) {
            const error = createAccountCreationBusyError();
            error.code = "ACCOUNT_CREATION_LOCK_LOST";
            throw error;
        }
    };

    let result;
    let operationError;
    try {
        result = await operation(assertOwned);
    } catch (error) {
        operationError = error;
    }

    try {
        const release = await locks.deleteOne({ _id: lockId, owner: token });
        if (release.deletedCount !== 1) throw createAccountCreationBusyError();
    } catch (releaseError) {
        const error = createAccountCreationBusyError();
        error.code = "ACCOUNT_CREATION_LOCK_CLEANUP";
        error.cause = releaseError;
        if (operationError) error.operationErrorCode = operationError.code;
        throw error;
    }

    if (operationError) throw operationError;
    return result;
}

function generateCompliantPassword() {
    const groups = [
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        "abcdefghijklmnopqrstuvwxyz",
        "0123456789",
        "!@#$%^&*",
    ];
    const characters = groups.map((group) => group[randomInt(group.length)]);
    const allCharacters = groups.join("");
    while (characters.length < 16) {
        characters.push(allCharacters[randomInt(allCharacters.length)]);
    }

    for (let index = characters.length - 1; index > 0; index--) {
        const otherIndex = randomInt(index + 1);
        [characters[index], characters[otherIndex]] = [characters[otherIndex], characters[index]];
    }

    return characters.join("");
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

    return withAccountCreationLock(db, account.maTaiKhoan, async (assertOwned) => {
        await ensureLinkedEntityExists(db, account.maTaiKhoan);

        if (await collection.findOne({ maTaiKhoan: account.maTaiKhoan })) {
            throw duplicateAccountError();
        }

        if (await collection.findOne({ tenDangNhap: account.tenDangNhap })) {
            throw duplicateUsernameError();
        }

        if (!isBcryptHash(accountToInsert.password)) {
            accountToInsert.password = await bcrypt.hash(accountToInsert.password, 10);
        }

        await assertOwned();
        const result = await collection.insertOne(accountToInsert);
        const createdAccount = await collection.findOne({ _id: result.insertedId });
        if (!createdAccount) {
            const error = new Error("Khong the xac nhan tai khoan vua tao");
            error.code = "ACCOUNT_CREATE_UNCONFIRMED";
            throw error;
        }
        return withoutPassword(createdAccount);
    });
}

async function createGeneratedForProfile(maTaiKhoan) {
    if (typeof maTaiKhoan !== "string" || !/^(?:DG|NV)-\d{2}-\d{6}$/.test(maTaiKhoan)) {
        const error = new Error("Ma ho so khong hop le");
        error.code = "INVALID_UPDATE";
        throw error;
    }

    const initialPassword = generateCompliantPassword();
    const account = await create({
        maTaiKhoan,
        tenDangNhap: maTaiKhoan.replaceAll("-", ""),
        password: initialPassword,
        trangThai: true,
    });

    return { account, initialPassword };
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

async function changeOwnPassword(maTaiKhoan, currentPassword, newPassword) {
    validateNewPassword(newPassword);

    const collection = await getCollection();
    const account = await collection.findOne({ maTaiKhoan });
    if (!account) {
        const error = new Error("Khong tim thay tai khoan");
        error.code = "NOT_FOUND";
        throw error;
    }

    if (
        typeof currentPassword !== "string" ||
        currentPassword.length === 0 ||
        typeof account.password !== "string" ||
        !(await bcrypt.compare(currentPassword, account.password))
    ) {
        const error = new Error("Mat khau hien tai khong dung");
        error.code = "INVALID_CURRENT_PASSWORD";
        throw error;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await collection.updateOne(
        { maTaiKhoan, password: account.password },
        { $set: { password: hashedPassword } }
    );

    if (result.matchedCount === 0) {
        const error = new Error("Mat khau hien tai khong dung");
        error.code = "INVALID_CURRENT_PASSWORD";
        throw error;
    }

    return true;
}

module.exports = {
    validateCreatePayload,
    validateNewPassword,
    generateCompliantPassword,
    createGeneratedForProfile,
    ACCOUNT_CREATION_LOCK_ERROR_CODES,
    findAll,
    findOne,
    create,
    update,
    changeOwnPassword
};
