const { MongoClient } = require("mongodb");

require("dotenv").config();

const mongoUri = process.env.MONGODB_URI;
if (typeof mongoUri !== "string" || mongoUri.trim() === "") {
    const error = new Error("MONGODB_URI is required and must not be empty.");
    error.code = "MONGODB_URI_REQUIRED";
    throw error;
}

const dbName = process.env.DB_NAME;
if (typeof dbName !== "string" || dbName.trim() === "") {
    const error = new Error("DB_NAME is required and must not be empty.");
    error.code = "DB_NAME_REQUIRED";
    throw error;
}

let client;
try {
    client = new MongoClient(mongoUri);
} catch {
    const error = new Error("MONGODB_URI is invalid. Use a valid mongodb:// or mongodb+srv:// URI.");
    error.code = "INVALID_MONGODB_URI";
    throw error;
}

async function connectDB() {
    try {
        await client.connect();
        console.log("Da ket noi MongoDB.");

        return client.db(dbName);
    } catch (error) {
        console.error("Loi ket noi MongoDB:", error?.name || "MongoDBError");
        throw error;
    }
}

module.exports = connectDB;
