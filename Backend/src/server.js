const app = require("./app");
const config = require("../app/config");
const connectDB = require("./config/database");

const PORT = config.app.port;

async function startServer() {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`Server dang chay tren cong ${PORT}.`);
        });
    } catch (error) {
        console.error("Khong the khoi dong server:", error);
    }
}

startServer();