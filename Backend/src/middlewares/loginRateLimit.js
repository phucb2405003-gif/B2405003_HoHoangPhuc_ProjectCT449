const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX_REQUESTS = 8;

function positiveIntegerFromEnv(name, fallback) {
    const value = Number(process.env[name]);
    return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

const windowMs = positiveIntegerFromEnv("LOGIN_RATE_LIMIT_WINDOW_MS", DEFAULT_WINDOW_MS);
const maxRequests = positiveIntegerFromEnv("LOGIN_RATE_LIMIT_MAX", DEFAULT_MAX_REQUESTS);
const requestsByIp = new Map();

// Keep expired entries from accumulating when the server receives traffic
// from many distinct IP addresses. unref() lets Node exit normally.
const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of requestsByIp) {
        if (entry.resetAt <= now) requestsByIp.delete(ip);
    }
}, windowMs);
cleanupTimer.unref();

function loginRateLimit(req, res, next) {
    const now = Date.now();
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    let entry = requestsByIp.get(ip);

    if (!entry || entry.resetAt <= now) {
        entry = { count: 0, resetAt: now + windowMs };
        requestsByIp.set(ip, entry);
    }

    if (entry.count >= maxRequests) {
        res.set("Retry-After", String(Math.max(1, Math.ceil((entry.resetAt - now) / 1000))));
        return res.status(429).json({
            message: "Qua nhieu yeu cau dang nhap. Vui long thu lai sau."
        });
    }

    entry.count += 1;
    return next();
}

module.exports = loginRateLimit;
