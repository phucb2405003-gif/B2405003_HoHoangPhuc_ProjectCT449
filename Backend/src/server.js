
require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/database");

const PORT = process.env.PORT || 3000;

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
