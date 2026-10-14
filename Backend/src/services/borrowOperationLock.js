const { randomUUID } = require("node:crypto");

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

module.exports = { withBorrowOperationLock };
