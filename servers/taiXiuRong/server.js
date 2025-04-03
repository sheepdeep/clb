const express = require('express');
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({path: path.join(__dirname, '../../configs/config.env')});
const taiXiuService = require('./service');
const {connectDB} = require('../../configs/database');
global.socket = io;

connectDB().then(() => {
    console.log('Chạy file với kết nối DB hiện tại');
});

app.use(cors());

io.on('connection', function (socket) {
    console.log(socket)
});

taiXiuService.run();

server.listen(process.env.TAIXIURONGPORT, () => console.log(`Server đang hoạt động port: ${process.env.TAIXIURONGPORT}`));

