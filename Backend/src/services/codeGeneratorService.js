const connectDB = require("../config/database");
const { isMongoDuplicateKey } = require("./mongoDuplicateError");

const COUNTER_COLLECTION = "counters";
const ALLOWED_PREFIXES = new Set(["DG", "NV", "S", "NXB", "PM"]);
const MAX_SEQUENCE = 999999;

function sequenceExhaustedError(counterId) {
    const error = new Error(`Sequence cho ${counterId} da dat gioi han ${MAX_SEQUENCE}.`);
    error.code = "CODE_SEQUENCE_EXHAUSTED";
    error.statusCode = 409;
    error.publicMessage = `Da het day ma ${counterId}; khong the tao ma moi`;
    return error;
}

function invalidCounterError(counterId) {
    const error = new Error(`Counter ${counterId} khong hop le; can doi soat du lieu.`);
    error.code = "CODE_COUNTER_INVALID";
    return error;
}

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

    while (true) {
        let counter;
        try {
            counter = await counters.findOneAndUpdate(
                {
                    _id: counterId,
                    sequence: { $type: ["int", "long"], $gte: 0, $lt: MAX_SEQUENCE }
                },
                { $inc: { sequence: 1 } },
                { upsert: true, returnDocument: "after" },
            );
        } catch (error) {
            if (!isMongoDuplicateKey(error)) throw error;

            // A competing first request may have inserted the counter. Retry if
            // it is still valid; otherwise fail without changing the document.
            const current = await counters.findOne({ _id: counterId });
            if (!current) throw error;
            if (!Number.isSafeInteger(current.sequence) || current.sequence < 0) {
                throw invalidCounterError(counterId);
            }
            if (current.sequence >= MAX_SEQUENCE) {
                throw sequenceExhaustedError(counterId);
            }

            const integerCounter = await counters.findOne({
                _id: counterId,
                sequence: { $type: ["int", "long"] }
            });
            if (integerCounter) continue;

            // Keep integral BSON doubles usable without accepting fractions.
            const doubleCounter = await counters.findOneAndUpdate(
                {
                    _id: counterId,
                    sequence: {
                        $type: "double",
                        $eq: current.sequence,
                        $gte: 0,
                        $lt: MAX_SEQUENCE
                    }
                },
                { $inc: { sequence: 1 } },
                { returnDocument: "after" }
            );
            if (doubleCounter) {
                if (!Number.isSafeInteger(doubleCounter.sequence) || doubleCounter.sequence > MAX_SEQUENCE) {
                    throw invalidCounterError(counterId);
                }
                return `${counterId}-${String(doubleCounter.sequence).padStart(6, "0")}`;
            }
        }

        if (
            !counter ||
            !Number.isSafeInteger(counter.sequence) ||
            counter.sequence < 1 ||
            counter.sequence > MAX_SEQUENCE
        ) {
            throw invalidCounterError(counterId);
        }
        return `${counterId}-${String(counter.sequence).padStart(6, "0")}`;
    }
}
module.exports = { generateCode };
