const { MongoClient } = require("mongodb");

require("dotenv").config();

const client = new MongoClient(process.env.MONGODB_URI);

async function connectDB() {
    try {
        await client.connect();
        console.log("Da ket noi MongoDB.");

        return client.db(process.env.DB_NAME);
    } catch (error) {
        console.error("Loi ket noi MongoDB:", error);
        throw error;
    }
}

module.exports = connectDB;