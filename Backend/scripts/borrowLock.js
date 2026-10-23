const { MongoClient } = require("mongodb");
const path = require("node:path");
const { inspectBorrowOperationLock, recoverBorrowOperationLock } = require("../src/services/borrowOperationLock");

require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });

function usage() {
    return "Usage: node scripts/borrowLock.js status | recover --confirm-recovery --all-backend-stopped --history-reconciled --fingerprint <sha256>";
}

function parseRecoveryArgs(args) {
    const flags = new Set(args.filter((arg) => arg.startsWith("--") && !arg.includes("=")));
    const fingerprintIndex = args.indexOf("--fingerprint");
    return {
        confirmRecovery: flags.has("--confirm-recovery"),
        allBackendProcessesStopped: flags.has("--all-backend-stopped"),
        historyReconciled: flags.has("--history-reconciled"),
        expectedOwnerFingerprint: fingerprintIndex >= 0 ? args[fingerprintIndex + 1] : undefined
    };
}

async function main() {
    const [command, ...args] = process.argv.slice(2);
    if (!["status", "recover"].includes(command)) throw new Error(usage());
    const mongoUri = process.env.MONGODB_URI;
    const dbName = process.env.DB_NAME;
    if (typeof mongoUri !== "string" || !mongoUri.trim() || typeof dbName !== "string" || !dbName.trim()) {
        throw new Error("MONGODB_URI and DB_NAME must be configured in Backend/.env");
    }

    const client = new MongoClient(mongoUri);
    try {
        await client.connect();
        const db = client.db(dbName);
        if (command === "status") {
            console.log(JSON.stringify(await inspectBorrowOperationLock(db), null, 2));
            return;
        }
        const result = await recoverBorrowOperationLock(db, parseRecoveryArgs(args));
        console.log(JSON.stringify(result, null, 2));
    } finally {
        await client.close();
    }
}

main().catch((error) => {
    console.error(error.statusCode === 503 ? error.message : (error.message || "Borrow lock command failed"));
    process.exitCode = 1;
});