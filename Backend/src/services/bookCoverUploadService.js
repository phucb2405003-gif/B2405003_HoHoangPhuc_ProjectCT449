const BUCKET_NAME = "books";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MIME_TYPES_BY_EXTENSION = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
};

function uploadError(code, statusCode, message) {
    const error = new Error(message);
    error.code = code;
    error.statusCode = statusCode;
    error.publicMessage = message;
    return error;
}

function validateCoverUpload(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw uploadError("INVALID_COVER_UPLOAD", 400, "Thông tin ảnh bìa không hợp lệ.");
    }

    const { fileName, contentType, fileSize } = payload;
    if (
        typeof fileName !== "string" ||
        fileName.length === 0 ||
        fileName.length > 180 ||
        fileName !== fileName.trim() ||
        fileName.includes("..") ||
        /[\\/:?#\u0000-\u001f]/.test(fileName) ||
        !/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(?:jpg|jpeg|png|webp)$/i.test(fileName)
    ) {
        throw uploadError("INVALID_COVER_FILE_NAME", 400, "Tên file ảnh bìa không hợp lệ.");
    }

    if (!Number.isSafeInteger(fileSize) || fileSize <= 0) {
        throw uploadError("INVALID_COVER_FILE_SIZE", 400, "Dung lượng ảnh bìa không hợp lệ.");
    }
    if (fileSize > MAX_FILE_SIZE) {
        throw uploadError("COVER_FILE_TOO_LARGE", 413, "Ảnh bìa không được vượt quá 5 MB.");
    }

    const extension = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
    if (!MIME_TYPES_BY_EXTENSION[extension]) {
        throw uploadError("UNSUPPORTED_COVER_FILE_TYPE", 400, "Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.");
    }
    if (contentType !== MIME_TYPES_BY_EXTENSION[extension]) {
        throw uploadError("COVER_MIME_MISMATCH", 400, "Định dạng MIME không khớp với phần mở rộng của ảnh.");
    }

    return { fileName, contentType };
}

function isDuplicateObjectError(error) {
    return error?.status === 409 ||
        error?.statusCode === 409 ||
        error?.code === "Duplicate" ||
        /already exists|duplicate/i.test(String(error?.message || ""));
}

async function createCoverUploadUrl(payload, dependencies = {}) {
    const { fileName } = validateCoverUpload(payload);
    const env = dependencies.env || process.env;
    if (
        typeof env.SUPABASE_BOOKS_PUBLIC_URL !== "string" || !env.SUPABASE_BOOKS_PUBLIC_URL.trim() ||
        typeof env.SUPABASE_SERVICE_ROLE_KEY !== "string" || !env.SUPABASE_SERVICE_ROLE_KEY.trim()
    ) {
        throw uploadError("SUPABASE_NOT_CONFIGURED", 503, "Dịch vụ lưu ảnh chưa được cấu hình.");
    }

    try {
        let projectOrigin;
        try {
            const publicUrl = new URL(env.SUPABASE_BOOKS_PUBLIC_URL);
            if (!/^https?:$/.test(publicUrl.protocol) || !publicUrl.origin) throw new Error("Invalid Supabase URL");
            projectOrigin = publicUrl.origin;
        } catch {
            throw uploadError("SUPABASE_NOT_CONFIGURED", 503, "Dich vu luu anh chua duoc cau hinh.");
        }
        const createClient = dependencies.createClient || require("@supabase/supabase-js").createClient;
        const supabase = createClient(projectOrigin, env.SUPABASE_SERVICE_ROLE_KEY, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        });
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUploadUrl(fileName, { upsert: false });

        if (error) {
            if (isDuplicateObjectError(error)) {
                throw uploadError("COVER_FILE_ALREADY_EXISTS", 409, "Tên file ảnh bìa đã tồn tại.");
            }
            throw uploadError("SUPABASE_SIGNED_URL_FAILED", 503, "Không thể tạo liên kết tải ảnh lúc này.");
        }
        if (!data?.signedUrl || !data?.token || !data?.path) {
            throw uploadError("SUPABASE_SIGNED_URL_FAILED", 503, "Không thể tạo liên kết tải ảnh lúc này.");
        }

        return { fileName, signedUrl: data.signedUrl, token: data.token, path: data.path };
    } catch (error) {
        if (error?.statusCode) throw error;
        throw uploadError("SUPABASE_SIGNED_URL_FAILED", 503, "Không thể tạo liên kết tải ảnh lúc này.");
    }
}

module.exports = {
    BUCKET_NAME,
    MAX_FILE_SIZE,
    validateCoverUpload,
    createCoverUploadUrl,
};
