// server.js
const express = require('express');
const app =express();
const dotenv=require("dotenv");
const connectDB=require("./config/db");

dotenv.config();

connectDB();

app.use(express.json());

app.use("/api/users", require("./routes/userRoutes"));

const PORT= 5000;


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
})
