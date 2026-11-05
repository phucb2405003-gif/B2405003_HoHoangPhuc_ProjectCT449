const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "book-cover-upload-test-secret";

let activeDb;
const databasePath = require.resolve("../src/config/database");
require.cache[databasePath] = {
    id: databasePath,
    filename: databasePath,
    loaded: true,
    exports: async () => activeDb,
};

const bookRoutes = require("../src/routes/bookRoutes");
const bookController = require("../src/controllers/bookController");
const coverService = require("../src/services/bookCoverUploadService");
const validPayload = {
    fileName: "nha-gia-kim-a8f31c.jpg",
    contentType: "image/jpeg",
    fileSize: 102400,
};

function response() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

function resetDb(role = "Quản lý") {
    activeDb = {
        accounts: role === "Guest"
            ? [{ maTaiKhoan: "DG7", tenDangNhap: "reader", trangThai: true }]
            : [{ maTaiKhoan: "NV8", tenDangNhap: "manager", trangThai: true }],
        employees: role === "Guest" ? [] : [{ maNhanVien: "NV8", chucVu: role }],
        readers: role === "Guest" ? [{ maDocGia: "DG7" }] : [],
        collection(name) {
            return { findOne: async (query) => this[name].find((row) =>
                Object.entries(query).every(([key, value]) => row[key] === value)
            ) || null };
        },
    };
}

function routeHandlers() {
    return bookRoutes.stack.find((layer) =>
        layer.route?.path === "/cover-upload-url" && layer.route.methods.post
    ).route.stack.map((layer) => layer.handle);
}

async function callRoute({ role = "Quản lý", body = validPayload, bearer = null } = {}) {
    resetDb(role);
    const handlers = routeHandlers();
    const req = { headers: { authorization: bearer || `Bearer ${jwt.sign({ maTaiKhoan: "NV8" }, process.env.JWT_SECRET)}` }, body };
    const res = response();
    await handlers[0](req, res, async () => handlers[1](req, res, async () => handlers[2](req, res)));
    return res;
}

test("manager receives signed upload details and only the manager role is required", async () => {
    const original = coverService.createCoverUploadUrl;
    coverService.createCoverUploadUrl = async () => ({
        fileName: validPayload.fileName,
        signedUrl: "https://storage.example/upload/signed",
        token: "upload-token",
        path: validPayload.fileName,
    });
    try {
        const handlers = routeHandlers();
        assert.equal(handlers.length, 3);
        assert.equal(handlers[0].name, "authenticateToken");
        const response = await callRoute();
        assert.equal(response.statusCode, 201);
        assert.deepEqual(response.body, {
            fileName: validPayload.fileName,
            signedUrl: "https://storage.example/upload/signed",
            token: "upload-token",
            path: validPayload.fileName,
        });
    } finally {
        coverService.createCoverUploadUrl = original;
    }
});

test("guest, librarian, and invalid JWT are denied", async () => {
    assert.equal((await callRoute({ role: "Thủ thư" })).statusCode, 403);
    const guestToken = jwt.sign({ maTaiKhoan: "DG7" }, process.env.JWT_SECRET);
    assert.equal((await callRoute({ role: "Guest", bearer: `Bearer ${guestToken}` })).statusCode, 403);
    assert.equal((await callRoute({ bearer: "Bearer invalid-token" })).statusCode, 401);
});

test("valid request creates a non-upserting URL in the books bucket", async () => {
    let received;
    const result = await coverService.createCoverUploadUrl(validPayload, {
        env: { SUPABASE_URL: "https://project.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "server-only" },
        createClient: (...args) => {
            received = { args };
            return { storage: { from: (bucket) => ({
                createSignedUploadUrl: async (path, options) => {
                    received.bucket = bucket;
                    received.path = path;
                    received.options = options;
                    return { data: { signedUrl: "signed-url", token: "signed-token", path }, error: null };
                },
            }) } };
        },
    });

    assert.equal(received.bucket, "books");
    assert.equal(received.path, validPayload.fileName);
    assert.deepEqual(received.options, { upsert: false });
    assert.equal(received.args[1], "server-only");
    assert.deepEqual(result, {
        fileName: validPayload.fileName,
        signedUrl: "signed-url",
        token: "signed-token",
        path: validPayload.fileName,
    });
});

test("filename paths, empty or unsupported files, MIME mismatch, and files over 5 MB are rejected", async () => {
    const invalidPayloads = [
        { ...validPayload, fileName: "../cover.jpg" },
        { ...validPayload, fileName: "books/cover.jpg" },
        { ...validPayload, fileName: "C:\\cover.jpg" },
        { ...validPayload, fileName: "cover.gif", contentType: "image/gif" },
        { ...validPayload, contentType: "image/png" },
        { ...validPayload, fileSize: 0 },
        { ...validPayload, fileSize: 5 * 1024 * 1024 + 1 },
    ];
    for (const payload of invalidPayloads) {
        await assert.rejects(coverService.createCoverUploadUrl(payload, {
            env: { SUPABASE_URL: "https://project.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "server-only" },
            createClient: () => assert.fail("invalid metadata must fail before creating a client"),
        }));
    }
});

test("missing Supabase config and existing object return safe service errors", async () => {
    await assert.rejects(
        coverService.createCoverUploadUrl(validPayload, { env: {} }),
        { code: "SUPABASE_NOT_CONFIGURED", statusCode: 503 }
    );

    await assert.rejects(coverService.createCoverUploadUrl(validPayload, {
        env: { SUPABASE_URL: "https://project.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "server-only" },
        createClient: () => ({ storage: { from: () => ({
            createSignedUploadUrl: async () => ({ data: null, error: { status: 409, message: "The resource already exists" } }),
        }) } }),
    }), { code: "COVER_FILE_ALREADY_EXISTS", statusCode: 409 });
});

test("Supabase connection and signed URL errors fail safely with 503", async () => {
    await assert.rejects(coverService.createCoverUploadUrl(validPayload, {
        env: { SUPABASE_URL: "https://project.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "server-only" },
        createClient: () => ({ storage: { from: () => ({
            createSignedUploadUrl: async () => { throw new Error("private upstream detail"); },
        }) } }),
    }), { code: "SUPABASE_SIGNED_URL_FAILED", statusCode: 503 });
});
