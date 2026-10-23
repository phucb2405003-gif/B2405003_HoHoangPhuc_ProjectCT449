
require("dotenv").config();

function getPort() {
    const configuredPort = process.env.PORT;
    if (configuredPort === undefined) return 3000;

    if (typeof configuredPort !== "string" || !/^\d+$/.test(configuredPort)) {
        const error = new Error("PORT must be an integer TCP port between 1 and 65535.");
        error.code = "INVALID_PORT";
        throw error;
    }

    const port = Number(configuredPort);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        const error = new Error("PORT must be an integer TCP port between 1 and 65535.");
        error.code = "INVALID_PORT";
        throw error;
    }
    return port;
}

async function startServer() {
    try {
        if (typeof process.env.JWT_SECRET !== "string" || process.env.JWT_SECRET.trim() === "") {
            const error = new Error("JWT_SECRET is required and must not be empty.");
            error.code = "JWT_SECRET_REQUIRED";
            throw error;
        }

        const PORT = getPort();
        const getCorsOrigins = require("./config/corsOrigins");
        getCorsOrigins();

        const connectDB = require("./config/database");
        const db = await connectDB();
        const { ensureIndexes } = require("./config/databaseIndexes");
        await ensureIndexes(db);

        const app = require("./app");
        const server = app.listen(PORT, () => {
            console.log(`Server dang chay tren cong ${PORT}.`);
        });
        const onStartupError = (error) => {
            console.error("Khong the khoi dong server:", error?.code || error?.name || "Error");
            process.exitCode = 1;
        };
        server.once("error", onStartupError);
        server.once("listening", () => server.off("error", onStartupError));
    } catch (error) {
        if (
            error.code === "MONGODB_URI_REQUIRED" ||
            error.code === "INVALID_MONGODB_URI" ||
            error.code === "DB_NAME_REQUIRED" ||
            error.code === "JWT_SECRET_REQUIRED" ||
            error.code === "INVALID_PORT" ||
            error.code === "INVALID_CORS_ORIGINS"
        ) {
            console.error("Khong the khoi dong server:", error.message);
        } else {
            console.error("Khong the khoi dong server:", error?.code || error?.name || "Error");
            if (String(error?.code || "").startsWith("UNIQUE_INDEX_")) {
                console.error(error.message);
            }
        }
        process.exitCode = 1;
    }
}

startServer();
