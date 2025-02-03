const moment = require('moment');
const momoHelper = require('../helpers/momo.helper');
const telegramHelper = require('../helpers/telegram.helper');
const momoModel = require("../models/momo.model");
const fs = require('fs');
const path = require('path');
const pm2 = require('pm2');
const dotenv = require("dotenv");
const {connectDB} = require("../configs/database");
const mqtt = require("mqtt-with-proxy");
const settingModel = require("../models/setting.model");
const turnTaiXiuModel = require("../models/turn.taixiu.model");
const historyTaiXiuModel = require("../models/history-taixiu.model");
const {dataTurn, handleTurnDone} = require("../services/taixiu.service");
const axios = require("axios");

const momoController = {
    otp: async (req, res, next) => {
        try {
            let {phone, password, type} = req.body;

            if (!phone || !password) {
                return res.json({
                    success: false,
                    message: 'Vui lòng điền đầy đủ thông tin!'
                })
            }

            if (!res.locals.profile.permission.addNew) {
                return res.json({
                    success: false,
                    message: 'Không có quyền thao tác!'
                })
            }

            if (type === 'normal') {
                return res.json(await momoHelper.sendOTP(phone, password));
            } else if (type === 'business') {

                // GET THÔNG TIN BUSINESS
                await momoModel.findOneAndUpdate({phone}, {
                    $set: {
                        phone,
                        passwordBusiness: password,
                        receiver: true,
                        storeId: req.body.storeId,
                        partnerCode: req.body.partnerCode,
                        accessKey: req.body.accessKey,
                        secretKey: req.body.secretKey
                    }
                }, {upsert: true});



                return res.json(await momoHelper.getQrBusiness(phone))
            } else {

                if (await momoModel.findOne({phone}).lean()) {
                    return res.json({
                        success: false,
                        message: 'Dữ liệu momo đã có trong hệ thống'
                    })
                }

                await new momoModel(req.body).save();

                res.status(200).json({
                    success: true,
                    message: 'Thêm dữ liệu file json thành công'
                });
            }
        } catch (err) {
            console.log(err);
            next(err);
        }
    },
    confirm: async (req, res, next) => {
        try {
            let {phone, password, otp} = req.body;

            if (!phone || !password || !otp) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập đầy đủ thông tin!'
                })
            }

            res.json(await momoHelper.confirmOTP(phone, password, otp));
        } catch (err) {
            next(err);
        }
    },
    login: async (req, res, next) => {
        try {
            let {phone, password, imei} = req.body;

            if (!phone || !password || !imei) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập đầy đủ thông tin!'
                })
            }

            await momoHelper.checkEligibleForMigration(phone, password, imei);
            const checkUser = await momoHelper.relogin(phone, password, imei);
            if (checkUser.success) {
                return res.json(await momoHelper.login(phone));
            }

            res.json(checkUser);
        } catch (err) {
            next(err);
        }
    },
    refresh: async (req, res, next) => {
        try {
            let phone = req.body.phone;

            if (!phone) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập số điện thoại!'
                })
            }

            res.json(await momoHelper.refreshToken(phone));
        } catch (err) {
            next(err);
        }
    },
    balance: async (req, res, next) => {
        try {
            let phone = req.body.phone;

            if (!phone) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập số điện thoại!'
                })
            }

            res.json(await momoHelper.balance(phone));
        } catch (err) {
            next(err);
        }
    },
    history: async (req, res, next) => {
        try {
            let {phone, dataType, limit} = req.body;

            if (!phone) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập số điện thoại!'
                })
            }

            if (!res.locals.profile.permission.useCheck) {
                return res.json({
                    success: false,
                    message: 'Không có quyền thao tác!'
                })
            }

            res.json(await momoHelper.getHistory(phone, {
                dataType: ['noti', 'default'].includes(dataType) ? dataType : res.locals.settings.history.dataType,
                limit: !limit ? res.locals.settings.history.limit : limit
            }))
        } catch (err) {
            next(err);
        }
    },
    details: async (req, res, next) => {
        try {
            let {phone, transId} = req.body;

            if (!phone || !transId) {
                return res.json({
                    success: false,
                    message: 'Vui lòng điền đầy đủ thông tin!'
                })
            }

            if (!res.locals.profile.permission.useCheck) {
                return res.json({
                    success: false,
                    message: 'Không có quyền thao tác!'
                })
            }

            res.json(await momoHelper.getDetails(phone, transId));
        } catch (err) {
            next(err);
        }
    },
    transfer: async (req, res, next) => {
        try {
            let {phone, receiver, amount, comment} = req.body;

            if (!phone || !receiver || !amount) {
                return res.json({
                    success: false,
                    message: 'Vui lòng điền đầy đủ thông tin!'
                })
            }

            if (!res.locals.profile.permission.useTrans) {
                return res.json({
                    success: false,
                    message: 'Không có quyền thao tác!'
                })
            }

            await telegramHelper.sendText(process.env.privateTOKEN, process.env.privateID, `* [ ${res.locals.profile.username} ] vừa thao tác chuyển tiền bằng API\n* [ ${phone} | ${receiver} | ${Intl.NumberFormat('en-US').format(amount)} | ${comment || null} ]`)
            res.json(await momoHelper.moneyTransfer(phone, {phone: receiver, amount, comment}));
        } catch (err) {
            next(err);
        }
    },
    export: async (req, res, next) => {
        try {
            let phone = req.body.phone;

            const data = await momoModel.findOne({phone});

            if (!data) {
                // If no document is found, return an error
                return res.status(404).json({message: 'No data found for the given phone number'});
            }

            // Define the file path for the temporary JSON file
            const filePath = path.join(__dirname, 'output.json');

            // Write the data to the JSON file
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

            // Set headers for file download
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename="' + phone + '.json"');

            // Stream the JSON file to the response
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);

            // Delete the temporary file after sending it
            fileStream.on('end', () => {
                fs.unlinkSync(filePath);
            });

            // res.json({
            //     success: true,
            //     message: 'Đang tải'
            // })


        } catch (err) {
            next(err);
        }
    },
    qr: async (req, res, next) => {
        try {
            let phone = req.body.phone;

            if (!phone) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập số điện thoại!'
                })
            }

            res.json(await momoHelper.getQR(phone));
        } catch (err) {
            next(err);
        }
    },
    noti: async (req, res, next) => {
        try {

            let phone = req.body.phone;

            if (!phone) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập số điện thoại!'
                })
            }

            const sourceJS = `const mqtt = require("mqtt-with-proxy");
const axios = require("axios");
const dotenv = require('dotenv');

// Load biến môi trường
dotenv.config({path: '../configs/config.env'});
const {connectDB} = require('../configs/database');

connectDB().then(() => {
    console.log('Chạy file với kết nối DB hiện tại');
});
const historyTaiXiuModel = require('../models/history-taixiu.model');
const settingModel = require('../models/setting.model');
const turnTaiXiuModel = require("../models/turn.taixiu.model");
const momoHelper = require('../helpers/momo.helper');
const momoModel = require('../models/momo.model');
const path = require('path');
const {handleTurnDone} = require("../services/taixiu.service");


const parseMsg = (msg) => {
    try {
        return JSON.parse(msg);
    } catch (error) {
        return null;
    }
}
const decodeData = (token) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace('-', '+').replace('_', '/');
        return JSON.parse(Buffer.from(base64, 'base64').toString('binary'));
    } catch (error) {
        return null;
    }
}

const connectWithToken = async (newToken) => {
    const fileName = path.basename(__filename);
    const phone = fileName.slice(0, -3);
    if (!newToken) {
        console.log('Vui lòng nhập token.');
        return;
    }
    const {agent_id, imei, DEVICE_OS, APP_VER, user, uid, exp} = decodeData(newToken) || {};
    console.log(exp, Math.floor(Date.now() / 1000))
    if (exp < Math.floor(Date.now() / 1000)) {
        await momoHelper.refreshToken(phone);
        console.log('Token hết hạn');
        run();
        return;
    }

    const client = mqtt.connect("mqtts://mqtt.momo.vn", {
        clientId: imei,
        username: user,
        password: newToken,
        keepalive: 100,
        port: 8883,
        clean: false,
        reconnectPeriod: 1000,
        //proxy: {
        // host: '123.1.1.1',
        //port: 4312,
        //proxyType: "https"
        // }
    });

    /*
    Three types are supported
    1. https
    2. http
    3. socks
    */
    function extractAmountAndComment(text) {
        // Find the index of the first occurrence of "kèm lời nhắn:"
        const keywordIndex = text.indexOf('kèm lời nhắn:');

        // Extract the comment from the substring after the keyword
        const comment = keywordIndex !== -1 ? text.slice(keywordIndex + 'kèm lời nhắn:'.length).trim().replace(/"/g, '') : null;

        // Extract amount from the substring before the keyword
        const amountText = keywordIndex !== -1 ? text.slice(0, keywordIndex) : text;
        const amountMatch = amountText.match(/\\b(\\d{1,3}(?:\\.\\d{3})*(?:\\.\\d+)?)\\s*₫/);
        const amount = amountMatch ? parseInt(amountMatch[1].replace(/\\./g, '')) : null;

        return {amount, comment};
    }

    const TOPICS = [
        "MQTT_USER_BALANCE",
        "MQTT_NOTIFICATION",
    ];

    client.on('error', function (err, packet) {
        console.log(err);
        if (err && err.code === 5) {
            console.log('Unauthorized user. Not reconnecting.');
            client.end(); // End the client to prevent automatic reconnection
            process.exit(0);
            // You can perform additional actions or logging here
        } else {
            console.log('Disconnected for another reason.');
            // Handle other disconnect reasons if needed
        }
    });

    client.on("connect", () => {
        console.log('connected');

        TOPICS.forEach(topic => {
            client.subscribe("momo/" + String(DEVICE_OS).toUpperCase() + "/" + APP_VER + "/" + agent_id + "/" + imei + "/" + topic, (err) => {
                if (!err) {
                    console.log(err);
                }
            });
        })
    });

    client.on("message", async (topic, message) => {
        console.log('topic: ' + topic);
        console.dir(parseMsg(message.toString()), {depth: null});
        const dataMsg = parseMsg(message.toString());
        const syncType = dataMsg.syncType;
        if (syncType === "MQTT_USER_BALANCE") {
            const balance = parseMsg(dataMsg.syncData).balance;
            // Chỗ này xử lí lưu balance bằng cách gọi DB hoặc API tuỳ ý:
            console.log(uid, balance);

            // TODO: Khúc này gọi api để update số dư momo hoặc lưu thẳng xuống DB luôn

            try {
                await momoModel.findOneAndUpdate({phone}, {$set: {balance: balance}});
                // await axios.post('http://localhost:37811/newBalancess', {phone: uid, balance}, {timeout: 5000})

            } catch (e) {
                console.log('call API error', e.message);

            }


        }

        if (syncType === "MQTT_NOTIFICATION") {
            const syncData = parseMsg(dataMsg.syncData);
            // Chỗ này xử lí lưu balance bằng cách gọi DB hoặc API tuỳ ý:
            if (syncData.momoMsg && syncData.momoMsg.tranId !== 0 && syncData.momoMsg.tranSuccess && (syncData.momoMsg.caption.startsWith('Nhận tiền') || syncData.momoMsg.caption.includes('gửi tiền mừng cho'))) {
                const extraData = JSON.parse(syncData.momoMsg.extra);
                let {tranId, comment, partnerId, amount, partnerName} = extraData;
                const time = syncData.momoMsg.time;
                partnerId = momoHelper.convertPhone(partnerId);

                await handleTurnDone(tranId, comment, partnerId, amount, partnerName, time, phone);
            }

            // incase send from momo to BVBank qr
            if (syncData.momoMsg && syncData.momoMsg.tranSuccess && syncData.momoMsg.caption === 'Nhận tiền chuyển khoản từ ví điện tử') {
                console.log(syncData.momoMsg);
                const extraData = JSON.parse(syncData.momoMsg.extra);
                const {tranId} = extraData;
                const body = syncData.momoMsg.body;
                console.log(extractAmountAndComment(body));
                // missing comment, partnerId, amount, partnerName
                const {amount, comment} = extractAmountAndComment(body);
                if (amount) {
                    const time = syncData.momoMsg.time;
                    console.log('NEW Transaction', 'time', time, 'from', 'tranId', tranId, 'comment', comment, 'amount', amount);
                    try {

                        await axios.post('http://localhost:37811/addTransss', {
                            phone: uid,
                            time,
                            from: 'Mã QR Đa Năng',
                            fromName: 'Mã QR Đa Năng',
                            tranId,
                            comment,
                            amount: parseInt(amount)
                        }, {timeout: 5000})
                    } catch (e) {
                        console.log('call API error', e.message);

                    }
                }


                // TODO: Khúc này gọi api thêm giao dịch mới hoặc lưu xuống DB luôn. (có khi sẽ bị đúp transactionId nên check kĩ)
            }
        }

    });


}

const run = async () => {
    const fileName = path.basename(__filename);
    const phone = fileName.slice(0, -3);

    const momo = await momoModel.findOne({phone}).lean();

    connectWithToken(momo.accessToken);
}

run();`

            const dirPath = path.join(__dirname, '../noti');
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }

            const fileToWriteName = path.join(dirPath, `${phone}.js`);
            await fs.promises.writeFile(fileToWriteName, sourceJS, {});
            pm2.connect((err) => {
                if (err) {
                    console.error(err);
                    // process.exit(1);
                }

                // Start a new PM2 process
                pm2.restart({
                    restart_delay: 5000,
                    script: fileToWriteName, // Replace 'app.js' with your script
                    name: fileToWriteName.replace('.js', '').replace('noti/', ''), // Name of the process
                }, (err, proc) => {
                    if (err) {
                        console.error(err);
                        pm2.disconnect(); // Disconnect from PM2
                        return;
                    }

                    pm2.disconnect();

                })
            })

            res.json({
                success: true,
                message: 'Cài đặt noti thành công!'
            })

        } catch (e) {
            console.log(e);
        }
    }
}

module.exports = momoController;