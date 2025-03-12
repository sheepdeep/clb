const express = require('express');
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const handlebars = require('express-handlebars');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv').config({ path: path.join(__dirname, 'configs/config.env') });
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const os = require('os-utils');
const { v4: uuidv4 } = require("uuid");
const session = require('express-session');
const minifyHbs = require('express-hbsmin');
const db = require('./configs/database');
const homeRoute = require('./routers/home.route');
const errorHandler = require('./middlewares/error.middleware');
const hbsHelper = require('./helpers/handlebars.helper');
const historyHelper = require('./helpers/history.helper');

let userCount = 0;

global.socket = io;

app.engine('hbs', handlebars.engine({
    extname: '.hbs',
    partialsDir: path.join(__dirname, 'views/partials'),
    defaultLayout: false,
    helpers: hbsHelper
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', true)

app.use(cors())
app.use(cookieParser())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')))
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}))
app.use(minifyHbs({
    override: true,
    exception_url: false,
    htmlMinifier: {
        removeComments: true,
        collapseWhitespace: true,
        collapseBooleanAttributes: true,
        removeAttributeQuotes: true,
        removeEmptyAttributes: true,
        minifyJS: true
    }
}))

process.env.NODE_ENV == 'development' && app.use(morgan('dev'))

// COUNT USER ONLINE :)))
io.on('connection', function (socket) {
    userCount++
    io.emit('countOnline', userCount);

    socket.on('clientSocket', (key, data) => {
        io.emit(key, data)
    })

    socket.on('cpuInfo', () => {
        os.cpuUsage(function (v) {
            io.emit('cpuInfo', v.toFixed(2));
        });
    })

    socket.on('xsst', (data) => {
        io.emit('xsst', data);
    })

    socket.on('disconnect', function () {
        userCount--;
        io.emit('countOnline', userCount);
    });
});

// TAIXIURONG SERVER
io.of('/taixiu-rong').on('connection', (socket) => {
    console.log('A user connected to server1 subdomain');

    // Lắng nghe sự kiện từ client
    socket.on('message', (data) => {
        console.log('Message from client: ', data);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected from server1 subdomain');
    });
});



// SET TOKEN SETUP
process.env.TOKEN_SETUP = uuidv4().toUpperCase();
console.log(`TOKEN SETUP: ${process.env.TOKEN_SETUP.toUpperCase()}`)

// Kết nối MongoDB
db.connectDB();
historyHelper.history();
historyHelper.fakeBill();
historyHelper.gift();

app.use(homeRoute);
// Error Handler
app.use(errorHandler);

server.listen(process.env.PORT || 80, () => console.log(`Server đang hoạt động port: ${process.env.PORT || 80}`));