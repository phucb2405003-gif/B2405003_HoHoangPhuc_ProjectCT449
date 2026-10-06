const connectDB = require("../config/database");

const COUNTER_COLLECTION = "counters";
const ALLOWED_PREFIXES = new Set(["DG", "NV", "S", "NXB", "PM"]);
const MAX_SEQUENCE = 999999;

async function generateCode(prefix) {
    if (!ALLOWED_PREFIXES.has(prefix)) {
        throw new Error(
            `Prefix khong hop le: ${prefix}. Chi chap nhan DG, NV, S, NXB, PM.`,
        );
    }

    const year = String(new Date().getFullYear()).slice(-2);
    const counterId = `${prefix}-${year}`;
    const db = await connectDB();
    const counters = db.collection(COUNTER_COLLECTION);

    const counter = await counters.findOneAndUpdate(
        { _id: counterId },
        { $inc: { sequence: 1 } },
        { upsert: true, returnDocument: "after" },
    );

    if (counter.sequence > MAX_SEQUENCE) {
        throw new Error(
            `Sequence cho ${counterId} da vuot gioi han ${MAX_SEQUENCE}.`,
        );
    }

    return `${counterId}-${String(counter.sequence).padStart(6, "0")}`;
}

module.exports = { generateCode };
