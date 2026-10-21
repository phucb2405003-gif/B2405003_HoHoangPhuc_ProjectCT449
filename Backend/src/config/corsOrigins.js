const defaultCorsOrigins = [
    "http://localhost:3001",
    "http://localhost:3002",
];

function getCorsOrigins(configuredOrigins) {
    if (arguments.length === 0) configuredOrigins = process.env.CORS_ORIGINS;
    if (configuredOrigins === undefined) return [...defaultCorsOrigins];
    if (typeof configuredOrigins !== "string" || configuredOrigins.trim() === "") {
        const error = new Error("CORS_ORIGINS must contain one or more valid origins.");
        error.code = "INVALID_CORS_ORIGINS";
        throw error;
    }

    const origins = configuredOrigins.split(",").map((origin) => origin.trim());
    if (origins.some((origin) => origin === "")) {
        const error = new Error("CORS_ORIGINS must not contain empty origin entries.");
        error.code = "INVALID_CORS_ORIGINS";
        throw error;
    }

    const normalizedOrigins = [];
    for (const origin of origins) {
        if (!/^https?:\/\/[^/?#\\]+$/i.test(origin) || origin.endsWith(":")) {
            const error = new Error("CORS_ORIGINS entries must be origins with a scheme and host only.");
            error.code = "INVALID_CORS_ORIGINS";
            throw error;
        }

        let parsedOrigin;
        try {
            parsedOrigin = new URL(origin);
        } catch {
            const error = new Error("CORS_ORIGINS entries must be valid origins.");
            error.code = "INVALID_CORS_ORIGINS";
            throw error;
        }

        if (
            !["http:", "https:"].includes(parsedOrigin.protocol) ||
            !parsedOrigin.hostname ||
            parsedOrigin.username ||
            parsedOrigin.password
        ) {
            const error = new Error("CORS_ORIGINS entries must be valid HTTP or HTTPS origins.");
            error.code = "INVALID_CORS_ORIGINS";
            throw error;
        }
        normalizedOrigins.push(parsedOrigin.origin);
    }

    return normalizedOrigins;
}

module.exports = getCorsOrigins;
