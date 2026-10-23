const { randomUUID, createHash, timingSafeEqual } = require("node:crypto");

const LOCK_COLLECTION = "borrow_operation_locks";
const LOCK_ID = "all-borrow-writes";
const LOCK_WAIT_MS = 15 * 1000;

// Fail closed: the lock has no expiry because a paused owner must never overlap
// a replacement owner. A process crash leaves the lock for operator recovery.

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function lockError(message) {
    const error = new Error(message);
    error.statusCode = 503;
    return error;
}

function fingerprintOwner(owner) {
    if (typeof owner !== "string" || owner.length === 0) return null;
    return createHash("sha256").update(owner).digest("hex");
}

async function inspectBorrowOperationLock(db) {
    let lock;
    try {
        lock = await db.collection(LOCK_COLLECTION).findOne({ _id: LOCK_ID });
    } catch {
        throw lockError("Could not inspect borrow lock; no recovery was performed");
    }
    if (!lock) {
        return {
            lockId: LOCK_ID,
            exists: false,
            acquiredAt: null,
            ownerPid: null,
            recoveryStatus: "not-needed"
        };
    }
    return {
        lockId: LOCK_ID,
        exists: true,
        acquiredAt: lock.acquiredAt instanceof Date ? lock.acquiredAt.toISOString() : null,
        ownerPid: Number.isInteger(lock.ownerPid) ? lock.ownerPid : null,
        ownerFingerprint: fingerprintOwner(lock.owner),
        recoveryStatus: "requires-operator-review"
    };
}

async function recoverBorrowOperationLock(db, options = {}) {
    const {
        confirmRecovery,
        allBackendProcessesStopped,
        historyReconciled,
        expectedOwnerFingerprint
    } = options;
    if (
        confirmRecovery !== true ||
        allBackendProcessesStopped !== true ||
        historyReconciled !== true
    ) {
        throw lockError("Recovery requires explicit confirmation, stopped Backend processes, and reconciled history");
    }
    if (
        typeof expectedOwnerFingerprint !== "string" ||
        !/^[a-f0-9]{64}$/.test(expectedOwnerFingerprint)
    ) {
        throw lockError("A valid owner fingerprint from the status command is required");
    }

    const locks = db.collection(LOCK_COLLECTION);
    let current;
    try {
        current = await locks.findOne({ _id: LOCK_ID });
    } catch {
        throw lockError("Could not inspect borrow lock; no recovery was performed");
    }
    if (
        !current ||
        typeof current.owner !== "string" ||
        !current.owner ||
        !Number.isInteger(current.ownerPid) ||
        !(current.acquiredAt instanceof Date)
    ) {
        throw lockError("Current lock cannot be verified safely; keep it and reconcile manually");
    }
    const actual = Buffer.from(fingerprintOwner(current.owner), "hex");
    const expected = Buffer.from(expectedOwnerFingerprint, "hex");
    if (!timingSafeEqual(actual, expected)) {
        throw lockError("Current lock owner differs from the confirmed lock");
    }

    let result;
    try {
        result = await locks.deleteOne({
            _id: LOCK_ID,
            owner: current.owner,
            ownerPid: current.ownerPid,
            acquiredAt: current.acquiredAt
        });
    } catch {
        throw lockError("MongoDB recovery failed; no success was reported");
    }
    if (result.deletedCount !== 1) {
        throw lockError("Lock changed during recovery; no lock was released");
    }
    return {
        released: true,
        lockId: LOCK_ID,
        acquiredAt: current.acquiredAt.toISOString(),
        ownerPid: current.ownerPid
    };
}

async function withBorrowOperationLock(db, operation, waitMs = LOCK_WAIT_MS) {
    const locks = db.collection(LOCK_COLLECTION);
    const token = randomUUID();
    const deadline = Date.now() + waitMs;
    let acquired = false;

    while (!acquired && Date.now() < deadline) {
        try {
            const lock = await locks.findOneAndUpdate(
                { _id: LOCK_ID, owner: { $exists: false } },
                {
                    $set: {
                        owner: token,
                        ownerPid: process.pid,
                        acquiredAt: new Date()
                    }
                },
                { upsert: true, returnDocument: "after" }
            );
            acquired = lock?.owner === token;
        } catch (error) {
            if (error.code !== 11000) throw error;
        }

        if (!acquired) await delay(50);
    }

    if (!acquired) {
        try {
            const current = await locks.findOne({ _id: LOCK_ID });
            console.error("Borrow write lock wait timed out:", {
                ownerPid: current?.ownerPid,
                acquiredAt: current?.acquiredAt
            });
        } catch (error) {
            console.error("Could not inspect the held borrow write lock:", error);
        }
        throw lockError("He thong dang xu ly phieu muon; vui long thu lai sau");
    }

    const assertOwned = async () => {
        const lock = await locks.findOne({ _id: LOCK_ID, owner: token });
        if (!lock) {
            const error = lockError("Mat quyen khoa thao tac; dung ghi va can doi soat du lieu");
            error.lockOwnershipLost = true;
            throw error;
        }
    };

    let result;
    let operationError;
    let releaseError;
    try {
        result = await operation(assertOwned);
    } catch (error) {
        operationError = error;
    }

    if (operationError?.retainBorrowLock) {
        console.error("Giu khoa thao tac muon sach de doi soat sau loi khong the rollback:", operationError);
    } else if (operationError?.lockOwnershipLost) {
        console.error("Thao tac muon sach da dung vi mat quyen so huu khoa:", operationError);
    } else {
        try {
            const release = await locks.deleteOne({ _id: LOCK_ID, owner: token });
            if (release.deletedCount !== 1) {
                throw lockError("Khong the giai phong khoa do owner da thay doi");
            }
        } catch (error) {
            console.error("Khong the giai phong khoa thao tac muon sach:", error);
            releaseError = error;
            if (operationError) operationError.lockCleanupError = error;
        }
    }

    if (operationError) throw operationError;
    if (releaseError) {
        const error = lockError("Thao tac da xu ly nhung khong the xac nhan giai phong khoa; can kiem tra trang thai");
        error.cause = releaseError;
        throw error;
    }
    return result;
}

module.exports = { withBorrowOperationLock, inspectBorrowOperationLock, recoverBorrowOperationLock };
