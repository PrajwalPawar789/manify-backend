// index.js
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5030;

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:3030',
  credentials: true
}));

const Router = require('./routes');

app.use('/api/v1', Router);

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));