require('dotenv').config({path: "./config.env"});
const express = require('express');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');
const path = require('path');

//connect DB
connectDB();

const app = express();

// get data from body
app.use(express.json());

// redirect to auth 
app.use('/api/auth', require('./routes/auth'));  

// Error Handler (last piece of middleware)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;


const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

process.on("unhandledRejection", (err, promise)=>{ 
    console.log(`Logged Error: ${err}`);
    server.close(() => process.exit(1));
})   