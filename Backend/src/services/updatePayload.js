function invalidUpdateError() {
    const error = new Error("Du lieu cap nhat khong hop le");
    error.code = "INVALID_UPDATE";
    return error;
}

function isIsoDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateCreateFields(payload, fieldTypes, requiredFields) {
    if (
        payload === null ||
        typeof payload !== "object" ||
        Array.isArray(payload) ||
        Object.getPrototypeOf(payload) !== Object.prototype ||
        Object.keys(payload).some((field) => !Object.hasOwn(fieldTypes, field)) ||
        requiredFields.some((field) => !Object.hasOwn(payload, field))
    ) {
        throw invalidUpdateError();
    }

    return getUpdateFields(payload, fieldTypes);
}

function getUpdateFields(payload, allowedFields) {
    if (
        payload === null ||
        typeof payload !== "object" ||
        Array.isArray(payload) ||
        Object.getPrototypeOf(payload) !== Object.prototype
    ) {
        throw invalidUpdateError();
    }

    const fields = Object.keys(payload);
    if (fields.length === 0 || fields.some((field) => !Object.hasOwn(allowedFields, field))) {
        throw invalidUpdateError();
    }

    for (const field of fields) {
        const value = payload[field];
        const type = allowedFields[field];
        if (type === "string" && (typeof value !== "string" || value.trim().length === 0)) {
            throw invalidUpdateError();
        }
        if (type === "email" && (
            typeof value !== "string" ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
        )) {
            throw invalidUpdateError();
        }
        if (type === "gender" && typeof value !== "boolean") throw invalidUpdateError();
        if (type === "boolean" && typeof value !== "boolean") throw invalidUpdateError();
        if (type === "nonNegativeInteger" && (!Number.isSafeInteger(value) || value < 0)) {
            throw invalidUpdateError();
        }
        if (type === "date" && !isIsoDate(value)) throw invalidUpdateError();
    }

    return Object.fromEntries(fields.map((field) => [
        field,
        allowedFields[field] === "date"
            ? new Date(`${payload[field]}T00:00:00.000Z`)
            : payload[field]
    ]));
}

module.exports = { getUpdateFields, validateCreateFields };
