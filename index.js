const express = require("express");
const connectDB = require("./config/db");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();
const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes")); //admin route to fetch all users 


const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
