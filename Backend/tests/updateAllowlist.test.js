const test = require("node:test");
const assert = require("node:assert/strict");

let activeDb;
const configPath = require.resolve("../src/config/database");
require.cache[configPath] = {
    id: configPath,
    filename: configPath,
    loaded: true,
    exports: async () => activeDb
};

const bookService = require("../src/services/bookService");
const publisherService = require("../src/services/publisherService");
const userService = require("../src/services/userService");
const employeeService = require("../src/services/employeeService");
const accountService = require("../src/services/accountService");
const userController = require("../src/controllers/userController");
const employeeController = require("../src/controllers/employeeController");
const bookController = require("../src/controllers/bookController");
const publisherController = require("../src/controllers/publisherController");
const accountController = require("../src/controllers/accountController");

class Collection {
    constructor(rows = []) { this.rows = rows; this.updateCalls = 0; this.insertCalls = 0; this.deleteCalls = 0; this.sets = []; this.inserts = []; }
    async findOne(query) {
        if (Object.values(query).some((value) => value && typeof value === "object")) return null;
        const entries = Object.entries(query).filter(([, value]) => value === null || ["string", "number", "boolean"].includes(typeof value));
        return entries.length ? this.rows.find((row) => entries.every(([key, value]) => row[key] === value)) || null : null;
    }
    async updateOne(query, update) {
        this.updateCalls++;
        this.sets.push(structuredClone(update.$set));
        const entries = Object.entries(query).filter(([, value]) => value === null || ["string", "number", "boolean"].includes(typeof value));
        const row = this.rows.find((item) => entries.every(([key, value]) => item[key] === value));
        if (!row) return { matchedCount: 0 };
        Object.assign(row, update.$set);
        return { matchedCount: 1 };
    }
    async insertOne(document) {
        this.insertCalls++;
        this.inserts.push(structuredClone(document));
        const insertedId = `inserted-${this.insertCalls}`;
        this.rows.push({ _id: insertedId, ...document });
        return { insertedId };
    }
    async deleteOne(query) {
        this.deleteCalls++;
        const index = this.rows.findIndex((row) => Object.entries(query).every(([key, value]) => row[key] === value));
        if (index < 0) return { deletedCount: 0 };
        this.rows.splice(index, 1);
        return { deletedCount: 1 };
    }
    async findOneAndUpdate() { return { sequence: 1 }; }
}

class LockCollection extends Collection {
    constructor(rows = []) { super(rows); this.onContended = null; this.acquisitionIds = []; }
    async findOneAndUpdate(query, update) {
        this.acquisitionIds.push(query._id);
        let lock = this.rows.find((row) => row._id === query._id);
        if (lock?.owner !== undefined) {
            this.onContended?.();
            const error = new Error("duplicate lock key");
            error.code = 11000;
            throw error;
        }
        if (!lock) {
            lock = { _id: query._id };
            this.rows.push(lock);
        }
        Object.assign(lock, update.$set);
        return structuredClone(lock);
    }
}

function setup() {
    const books = new Collection([{ maSach: "S1", tenSach: "Old", tacGia: "Author", maNXB: "NXB1", soQuyen: 8, soQuyenConLai: 6 }]);
    const publishers = new Collection([{ maNXB: "NXB1", tenNXB: "Old Publisher" }]);
    const readers = new Collection([{ maDocGia: "DG1", hoLot: "Nguyen Van", ten: "An", ngaySinh: new Date("2000-01-01T00:00:00.000Z"), phai: false, diaChi: "Old address", dienThoai: "0900000000", trangThai: "active", lyDoHanChe: null }]);
    const employees = new Collection([{ maNhanVien: "NV1", hoTenNV: "Tran B", diaChi: "Old address", soDienThoai: "0900000001", chucVu: "Thủ thư" }]);
    const accounts = new Collection([{ maTaiKhoan: "NV1", tenDangNhap: "staff", password: "old-hash", email: "old@example.com", trangThai: true }]);
    const collections = { books, publishers, readers, employees, accounts, counters: new Collection(), borrow_operation_locks: new LockCollection() };
    activeDb = { collection: (name) => collections[name] };
    return collections;
}

test("reader update writes only ERD profile allowlist and converts valid birth date", async () => {
    const { readers } = setup();
    const result = await userService.update("DG1", {
        hoLot: "Nguyen Van",
        ten: "Binh",
        ngaySinh: "2001-02-03",
        phai: true,
        diaChi: "New address",
        dienThoai: "0900000002",
    });
    assert.deepEqual(Object.keys(readers.sets[0]).sort(), ["diaChi", "dienThoai", "hoLot", "ngaySinh", "phai", "ten"]);
    assert.ok(result.ngaySinh instanceof Date);
    assert.equal(result.ngaySinh.toISOString(), "2001-02-03T00:00:00.000Z");
    assert.equal(result.phai, true);
    assert.equal(result.trangThai, "active");
});

test("reader update accepts false as Boolean and writes it unchanged", async () => {
    const { readers } = setup();
    const result = await userService.update("DG1", { phai: false });
    assert.equal(readers.sets[0].phai, false);
    assert.equal(typeof readers.sets[0].phai, "boolean");
    assert.equal(result.phai, false);
});

test("reader update rejects protected, unknown, and mixed allowed/protected fields without partial writes", async () => {
    for (const payload of [
        { maDocGia: "DG2" },
        { _id: "forged" },
        { trangThai: "blocked" },
        { lyDoHanChe: "reason" },
        { hoLot: "Valid", email: "new@example.com" },
        { hoLot: "Valid", role: "admin" },
        { hoLot: 12 },
        { phai: 0 },
        { phai: 1 },
        { phai: "true" },
        { phai: "false" },
        { phai: "0" },
        { phai: "1" },
        { phai: null },
        { phai: undefined },
        { ngaySinh: "2023-02-29" },
        { ngaySinh: "03/04/2000" },
        {}, null, [], "text", 12
    ]) {
        const { readers } = setup();
        const before = structuredClone(readers.rows[0]);
        await assert.rejects(userService.update("DG1", payload), { code: "INVALID_UPDATE" });
        assert.equal(readers.updateCalls, 0);
        assert.deepEqual(readers.rows[0], before);
    }
});

test("reader create accepts Boolean gender and stores it unchanged", async () => {
    for (const phai of [true, false]) {
        const { readers } = setup();
        const result = await userService.create({ hoLot: "Nguyen Van", phai });
        assert.equal(typeof readers.inserts[0].phai, "boolean");
        assert.equal(readers.inserts[0].phai, phai);
        assert.equal(result.phai, phai);
        assert.equal(readers.insertCalls, 1);
    }
});

test("reader create rejects non-Boolean or missing gender before inserting", async () => {
    for (const payload of [
        { phai: 0 }, { phai: 1 }, { phai: "true" }, { phai: "false" },
        { phai: "0" }, { phai: "1" }, { phai: null }, {},
    ]) {
        const { readers } = setup();
        await assert.rejects(userService.create(payload), { code: "INVALID_UPDATE" });
        assert.equal(readers.insertCalls, 0);
        assert.deepEqual(readers.inserts, []);
    }
});

test("employee update writes only profile allowlist and leaves role unchanged", async () => {
    const { employees } = setup();
    const result = await employeeService.update("NV1", {
        hoTenNV: "Tran C",
        diaChi: "New address",
        soDienThoai: "0900000003",
    });
    assert.deepEqual(Object.keys(employees.sets[0]).sort(), ["diaChi", "hoTenNV", "soDienThoai"]);
    assert.equal(result.hoTenNV, "Tran C");
    assert.equal(result.chucVu, "Thủ thư");
});

test("employee update blocks id, role, account, unknown, malformed, and empty fields", async () => {
    for (const payload of [
        { maNhanVien: "NV2" },
        { msnv: "NV2" },
        { _id: "forged" },
        { chucVu: "Quản lý" },
        { hoTenNV: "Valid", maTaiKhoan: "NV2" },
        { soDienThoai: 900 },
        { hoTenNV: "  " },
        {}, null, [], "text"
    ]) {
        const { employees } = setup();
        const before = structuredClone(employees.rows[0]);
        await assert.rejects(employeeService.update("NV1", payload), { code: "INVALID_UPDATE" });
        assert.equal(employees.updateCalls, 0);
        assert.deepEqual(employees.rows[0], before);
    }
});

test("reader and employee updates return not found for missing identifiers", async () => {
    setup();
    await assert.rejects(userService.update("DG404", { ten: "B" }), { code: "NOT_FOUND" });
    await assert.rejects(employeeService.update("NV404", { hoTenNV: "B" }), { code: "NOT_FOUND" });
});

test("book update rejects a missing book and does not write", async () => {
    const { books } = setup();
    await assert.rejects(bookService.update("S404", { tenSach: "New" }), { code: "NOT_FOUND" });
    assert.equal(books.updateCalls, 0);
});

test("book create with an existing publisher succeeds while holding shared write lock", async () => {
    const { books, borrow_operation_locks: locks } = setup();
    const result = await bookService.create({
        tenSach: "New Title",
        tacGia: "New Author",
        maNXB: "NXB1",
        soQuyen: 4,
    });
    assert.equal(result.maNXB, "NXB1");
    assert.equal(books.insertCalls, 1);
    assert.equal(locks.deleteCalls, 1);
});

test("book create rejects a missing publisher without inserting", async () => {
    const { books } = setup();
    await assert.rejects(bookService.create({
        tenSach: "New Title",
        tacGia: "New Author",
        maNXB: "NXB404",
        soQuyen: 4,
    }), { code: "PUBLISHER_NOT_FOUND" });
    assert.equal(books.insertCalls, 0);
});

test("book create controller maps a missing publisher to HTTP 400", async () => {
    const { books } = setup();
    const res = mockResponse();
    await bookController.create({ body: {
        tenSach: "New Title",
        tacGia: "New Author",
        maNXB: "NXB404",
        soQuyen: 4,
    } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(books.insertCalls, 0);
});

test("book update accepts business fields and preserves inventory", async () => {
    const { books, borrow_operation_locks: locks } = setup();
    const result = await bookService.update("S1", { tenSach: "  New   Title ", tacGia: "New Author" });
    assert.equal(result.tenSach, "New Title");
    assert.equal(result.tacGia, "New Author");
    assert.deepEqual([result.soQuyen, result.soQuyenConLai], [8, 6]);
    assert.equal(locks.acquisitionIds.length, 0);
});

test("book update changes to an existing publisher inside the shared lock", async () => {
    const { books, publishers, borrow_operation_locks: locks } = setup();
    publishers.rows.push({ maNXB: "NXB2", tenNXB: "New Publisher" });
    const result = await bookService.update("S1", { maNXB: "NXB2" });
    assert.equal(result.maNXB, "NXB2");
    assert.equal(books.rows[0].maNXB, "NXB2");
    assert.ok(locks.acquisitionIds.length > 0);
    assert.ok(locks.acquisitionIds.every((id) => id === "all-borrow-writes"));
});

test("book update rejects a missing publisher without changing the book", async () => {
    const { books } = setup();
    const before = structuredClone(books.rows[0]);
    await assert.rejects(bookService.update("S1", { maNXB: "NXB404" }), { code: "PUBLISHER_NOT_FOUND" });
    assert.equal(books.updateCalls, 0);
    assert.deepEqual(books.rows[0], before);
});

test("book update propagates publisher lookup and write failures", async () => {
    const publisherState = setup();
    publisherState.publishers.findOne = async () => { throw new Error("publisher query failed"); };
    await assert.rejects(bookService.update("S1", { maNXB: "NXB1" }), /publisher query failed/);
    assert.equal(publisherState.books.updateCalls, 0);

    const writeState = setup();
    writeState.publishers.rows.push({ maNXB: "NXB2", tenNXB: "New Publisher" });
    writeState.books.updateOne = async () => { throw new Error("book write failed"); };
    await assert.rejects(bookService.update("S1", { maNXB: "NXB2" }), /book write failed/);
    assert.equal(writeState.books.rows[0].maNXB, "NXB1");
});

test("book update rejects identifiers, inventory, and unknown fields without writing", async () => {
    for (const payload of [
        { maSach: "S2" },
        { soQuyen: 100 },
        { soQuyenConLai: 100 },
        { isAdmin: true },
        { tenSach: "Valid", unknown: "field" }
    ]) {
        const { books } = setup();
        await assert.rejects(bookService.update("S1", payload), { code: "INVALID_UPDATE" });
        assert.equal(books.updateCalls, 0);
    }
});

test("book update rejects invalid field formats and empty valid updates", async () => {
    for (const payload of [{ tenSach: 12 }, { tacGia: null }, { donGia: 10 }, { namXuatBan: 2020 }, {}, null, "invalid", []]) {
        const { books } = setup();
        await assert.rejects(bookService.update("S1", payload), { code: "INVALID_UPDATE" });
        assert.equal(books.updateCalls, 0);
    }
});

test("book update keeps publisher and duplicate-name validation", async () => {
    const { books } = setup();
    await assert.rejects(bookService.update("S1", { maNXB: "NXB404" }), { code: "PUBLISHER_NOT_FOUND" });
    const findOne = books.findOne.bind(books);
    books.findOne = async (query) => query.maSach?.$ne ? { maSach: "S2" } : findOne(query);
    await assert.rejects(bookService.update("S1", { tenSach: "Duplicate" }), { code: "DUPLICATE_NAME" });
    assert.equal(books.updateCalls, 0);
});

test("publisher update accepts its name field", async () => {
    const { publishers } = setup();
    const result = await publisherService.update("NXB1", { tenNXB: "New Publisher" });
    assert.equal(result.tenNXB, "New Publisher");
    assert.equal(publishers.updateCalls, 1);
});

test("publisher update rejects identifier, unknown fields, malformed values, and empty updates", async () => {
    for (const payload of [
        { maNXB: "NXB2" },
        { _id: "forged" },
        { tenNXB: "Valid", diaChi: "Address" },
        { tenNXB: "Valid", isAdmin: true },
        { tenNXB: 4 },
        { tenNXB: "   " },
        {}, null, [], "invalid",
    ]) {
        const { publishers } = setup();
        await assert.rejects(publisherService.update("NXB1", payload), { code: "INVALID_UPDATE" });
        assert.equal(publishers.updateCalls, 0);
    }
});

test("publisher update returns not found for a missing identifier", async () => {
    setup();
    await assert.rejects(publisherService.update("NXB404", { tenNXB: "New" }), { code: "NOT_FOUND" });
});

test("publisher delete returns not found for a missing publisher", async () => {
    setup();
    const res = mockResponse();
    await publisherController.remove({ params: { maNXB: "NXB404" } }, res);
    assert.equal(res.statusCode, 404);
});

test("publisher delete rejects a publisher referenced by a book with HTTP 409", async () => {
    const { publishers } = setup();
    const res = mockResponse();
    await publisherController.remove({ params: { maNXB: "NXB1" } }, res);
    assert.equal(res.statusCode, 409);
    assert.match(res.body.message, /nha xuat ban dang duoc sach su dung/i);
    assert.equal(publishers.deleteCalls, 0);
    assert.ok(publishers.rows.some((publisher) => publisher.maNXB === "NXB1"));
});

test("publisher delete succeeds when no book references it", async () => {
    const { publishers, books } = setup();
    books.rows = [];
    const res = mockResponse();
    await publisherController.remove({ params: { maNXB: "NXB1" } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(publishers.deleteCalls, 1);
    assert.equal(publishers.rows.some((publisher) => publisher.maNXB === "NXB1"), false);
});

test("publisher delete reports book lookup failures as HTTP 500 without deleting", async () => {
    const { publishers, books } = setup();
    books.findOne = async () => { throw new Error("database query failed"); };
    const res = mockResponse();
    await publisherController.remove({ params: { maNXB: "NXB1" } }, res);
    assert.equal(res.statusCode, 500);
    assert.equal(publishers.deleteCalls, 0);
    assert.ok(publishers.rows.some((publisher) => publisher.maNXB === "NXB1"));
});

test("book create and publisher delete serialize on the shared lock", async () => {
    const { books, publishers, borrow_operation_locks: locks } = setup();
    books.rows = [];

    let signalBookCheck;
    const bookCheckReached = new Promise((resolve) => { signalBookCheck = resolve; });
    let continueBookCheck;
    const waitForContinue = new Promise((resolve) => { continueBookCheck = resolve; });
    const originalFindOne = books.findOne.bind(books);
    books.findOne = async (query) => {
        if (query.maNXB === "NXB1" && Object.keys(query).length === 1) {
            signalBookCheck();
            await waitForContinue;
        }
        return originalFindOne(query);
    };

    let signalContended;
    const lockContended = new Promise((resolve) => { signalContended = resolve; });
    locks.onContended = signalContended;

    const removePromise = publisherService.remove("NXB1");
    await bookCheckReached;
    const createPromise = bookService.create({
        tenSach: "Concurrent Title",
        tacGia: "Concurrent Author",
        maNXB: "NXB1",
        soQuyen: 2,
    });
    await lockContended;
    continueBookCheck();

    await removePromise;
    await assert.rejects(createPromise, { code: "PUBLISHER_NOT_FOUND" });
    assert.equal(publishers.rows.some((publisher) => publisher.maNXB === "NXB1"), false);
    assert.equal(books.insertCalls, 0);
    assert.ok(locks.acquisitionIds.length >= 3);
    assert.ok(locks.acquisitionIds.every((id) => id === "all-borrow-writes"));
});

test("book publisher update and publisher delete serialize without leaving a dangling reference", async () => {
    const { books, publishers, borrow_operation_locks: locks } = setup();
    books.rows[0].maNXB = "NXB2";
    publishers.rows.push({ maNXB: "NXB2", tenNXB: "Existing Publisher" });

    let signalBookCheck;
    const bookCheckReached = new Promise((resolve) => { signalBookCheck = resolve; });
    let continueBookCheck;
    const waitForContinue = new Promise((resolve) => { continueBookCheck = resolve; });
    const originalFindOne = books.findOne.bind(books);
    books.findOne = async (query) => {
        if (query.maNXB === "NXB1" && Object.keys(query).length === 1) {
            signalBookCheck();
            await waitForContinue;
        }
        return originalFindOne(query);
    };

    let signalContended;
    const lockContended = new Promise((resolve) => { signalContended = resolve; });
    locks.onContended = signalContended;

    const removePromise = publisherService.remove("NXB1");
    await bookCheckReached;
    const updatePromise = bookService.update("S1", { maNXB: "NXB1" });
    await lockContended;
    continueBookCheck();

    await removePromise;
    await assert.rejects(updatePromise, { code: "PUBLISHER_NOT_FOUND" });
    assert.equal(publishers.rows.some((publisher) => publisher.maNXB === "NXB1"), false);
    assert.equal(books.rows[0].maNXB, "NXB2");
    assert.ok(locks.acquisitionIds.length >= 3);
    assert.ok(locks.acquisitionIds.every((id) => id === "all-borrow-writes"));
});

test("publisher update keeps duplicate-name validation", async () => {
    const { publishers } = setup();
    const findOne = publishers.findOne.bind(publishers);
    publishers.findOne = async (query) => query.maNXB?.$ne ? { maNXB: "NXB2" } : findOne(query);
    await assert.rejects(publisherService.update("NXB1", { tenNXB: "Duplicate" }), { code: "DUPLICATE_NAME" });
    assert.equal(publishers.updateCalls, 0);
});

test("account update accepts documented account fields and never returns password", async () => {
    const { accounts } = setup();
    const result = await accountService.update("NV1", {
        tenDangNhap: "staff-new",
        password: "new-secret",
        email: "new@example.com",
        trangThai: false,
    });
    assert.deepEqual(Object.keys(accounts.sets[0]).sort(), ["email", "password", "tenDangNhap", "trangThai"]);
    assert.notEqual(accounts.sets[0].password, "new-secret");
    assert.equal(result.tenDangNhap, "staff-new");
    assert.equal(result.email, "new@example.com");
    assert.equal(Object.hasOwn(result, "password"), false);
    assert.equal(result.trangThai, false);
});

test("account update blocks id, derived role, and arbitrary account fields", async () => {
    for (const payload of [
        { maTaiKhoan: "NV2" },
        { loaiTaiKhoan: "DOCGIA" },
        { status: false },
        { role: "admin" },
        { email: "new@example.com", permissions: ["all"] },
        { email: 9 },
        { email: "not-an-email" },
        { trangThai: "false" },
        {}, null, [], "invalid"
    ]) {
        const { accounts } = setup();
        const before = structuredClone(accounts.rows[0]);
        await assert.rejects(accountService.update("NV1", payload), { code: "INVALID_UPDATE" });
        assert.equal(accounts.updateCalls, 0);
        assert.deepEqual(accounts.rows[0], before);
    }
});

test("account update preserves duplicate-username behavior and rejects missing ids", async () => {
    const { accounts } = setup();
    const findOne = accounts.findOne.bind(accounts);
    accounts.findOne = async (query) => query.tenDangNhap ? { maTaiKhoan: "NV2" } : findOne(query);
    await assert.rejects(accountService.update("NV1", { tenDangNhap: "taken" }), { code: "DUPLICATE_USERNAME" });
    assert.equal(accounts.updateCalls, 0);
    accounts.findOne = findOne;
    await assert.rejects(accountService.update("NV404", { email: "new@example.com" }), { code: "NOT_FOUND" });
});

function mockResponse() {
    return {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

test("all update controllers map invalid payloads to safe HTTP 400 responses", async () => {
    setup();
    const cases = [
        [userController, { params: { maDocGia: "DG1" }, body: { trangThai: "blocked" } }],
        [employeeController, { params: { maNhanVien: "NV1" }, body: { chucVu: "Quản lý" } }],
        [bookController, { params: { maSach: "S1" }, body: { soQuyen: 100 } }],
        [publisherController, { params: { maNXB: "NXB1" }, body: { diaChi: "Address" } }],
        [accountController, { params: { maTaiKhoan: "NV1" }, body: { loaiTaiKhoan: "DOCGIA" } }],
    ];
    for (const [controller, req] of cases) {
        const res = mockResponse();
        await controller.update(req, res);
        assert.equal(res.statusCode, 400);
        assert.deepEqual(Object.keys(res.body), ["message"]);
    }
});

test("reader create controller rejects missing or invalid gender with HTTP 400", async () => {
    for (const body of [{}, { phai: 0 }, { phai: "true" }]) {
        const { readers } = setup();
        const res = mockResponse();
        await userController.create({ body }, res);
        assert.equal(res.statusCode, 400);
        assert.equal(readers.insertCalls, 0);
    }
});
