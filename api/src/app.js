const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.ICA_BASE_URL,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// We will mount routes here
app.use('/api/oauth', require('./routes/oauth'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));

app.use(errorHandler);

module.exports = app;
