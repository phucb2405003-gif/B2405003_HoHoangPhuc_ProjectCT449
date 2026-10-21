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

class BooksCollection {
    constructor(rows) { this.rows = rows; this.updateCalls = 0; }
    async findOne(query) { return this.rows.find((row) => row.maSach === query.maSach) || null; }
    async updateOne(query, update) {
        this.updateCalls++;
        const row = this.rows.find((item) => item.maSach === query.maSach &&
            item.soQuyen === query.soQuyen && item.soQuyenConLai === query.soQuyenConLai);
        if (!row) return { matchedCount: 0 };
        for (const [key, amount] of Object.entries(update.$inc)) row[key] += amount;
        return { matchedCount: 1 };
    }
}

function setup(book) {
    const books = new BooksCollection(book ? [book] : []);
    activeDb = { collection: () => books };
    return books;
}

test("addStock increments valid existing inventory", async () => {
    const books = setup({ maSach: "S1", soQuyen: 5, soQuyenConLai: 3 });
    const result = await bookService.addStock("S1", 2);
    assert.deepEqual([result.soQuyen, result.soQuyenConLai], [7, 5]);
});

test("addStock rejects a missing book without updating", async () => {
    const books = setup();
    await assert.rejects(bookService.addStock("missing", 1), { code: "NOT_FOUND" });
    assert.equal(books.updateCalls, 0);
});

for (const [label, makeBook] of [
    ["missing total", () => ({ maSach: "S1", soQuyenConLai: 0 })],
    ["null total", () => ({ maSach: "S1", soQuyen: null, soQuyenConLai: 0 })],
    ["missing available", () => ({ maSach: "S1", soQuyen: 1 })],
    ["null available", () => ({ maSach: "S1", soQuyen: 1, soQuyenConLai: null })],
    ["string available", () => ({ maSach: "S1", soQuyen: 1, soQuyenConLai: "0" })],
    ["string total", () => ({ maSach: "S1", soQuyen: "1", soQuyenConLai: 0 })],
    ["negative available", () => ({ maSach: "S1", soQuyen: 1, soQuyenConLai: -1 })],
    ["available exceeds total", () => ({ maSach: "S1", soQuyen: 1, soQuyenConLai: 2 })],
    ["non-finite total", () => ({ maSach: "S1", soQuyen: Infinity, soQuyenConLai: 0 })],
    ["increment overflows safe integer", () => ({ maSach: "S1", soQuyen: Number.MAX_SAFE_INTEGER, soQuyenConLai: 0 })]
]) {
    test(`addStock rejects ${label} inventory without updating`, async () => {
        const original = makeBook();
        const books = setup(original);
        await assert.rejects(bookService.addStock("S1", 1), { code: "INVALID_STOCK_DATA" });
        assert.equal(books.updateCalls, 0);
        assert.deepEqual(books.rows[0], original);
    });
}

for (const quantity of [0, -1, 1.5, "2", null, Number.MAX_SAFE_INTEGER + 1]) {
    test(`addStock rejects invalid increment ${String(quantity)}`, async () => {
        const books = setup({ maSach: "S1", soQuyen: 2, soQuyenConLai: 1 });
        await assert.rejects(bookService.addStock("S1", quantity), { code: "INVALID_QUANTITY" });
        assert.equal(books.updateCalls, 0);
    });
}
