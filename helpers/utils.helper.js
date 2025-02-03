"use strict";
const moment = require("moment");
const crypto = require('crypto');
const settingModel = require('../models/setting.model');
const historyModel = require('../models/history.model');
const momoModel = require("../models/bank.model");
const missionModel = require("../models/mission.model");
const refundModel = require("../models/refund-bill.model");
const userModel = require("../models/user.model");
const momoHelper = require('../helpers/momo.helper');
const historyHelper = require('../helpers/history.helper');
const telegramHelper = require('../helpers/telegram.helper');
const momoService = require('../services/momo.service');
const _ = require('lodash');
const {v4: uuidV4} = require('uuid');

exports.runDetails = async (phone, data) => {
    let threads = [];

    for (let history of data) {
        (!await historyModel.findOne({ transId: history.transId }) && history.io != -1) && threads.push(momoHelper.getDetails(phone, history.transId))
    }

    return await Promise.all(threads);
}

exports.runHistory = async () => {
    const dataSetting = await settingModel.findOne();
    let threads = [];
    let dataPhone = await momoService.phoneRun(dataSetting.limitPhone);

    for (let data of dataPhone) {
        const dataHistoryMomo = await momoService.dataInfo(data, true);
        if (dataHistoryMomo.receiptDay >= data.limitDay) {
            await momoModel.findOneAndUpdate({phone: data.phone}, {
                $set: {
                    phone: data.phone,
                    status: 'pending'
                }
            }, {upsert: true});
        }
        threads.push(historyHelper.getHistory(data.phone, dataSetting.history));
    }

    return await Promise.all(threads);
}

/* V1
exports.runReward = async () => {
    const dataSetting = await settingModel.findOne();
    let threads = [];
    let dataPhone = await momoService.phoneRun(dataSetting.limitPhone);

    for (let data of dataPhone) {
        threads.push(historyHelper.rewardPhone(data.phone));
    }

    return await Promise.all(threads);
}
*/

exports.runReward = async () => {
    const dataSetting = await settingModel.findOne();
    let threads = [];

    if (dataSetting.reward.dataType === 'limit') {
        let dataHistory = await historyModel.aggregate([
            {
                $match: {
                    status: 'wait'
                }
            },
            {
                $sample: { size: Number(dataSetting.reward.limit) }
            }
        ]);

        for (let data of dataHistory) {
            threads.push(historyHelper.rewardTransId(data.phone, data.transId));
        }
    } else {
        let dataPhone = await momoService.phoneRunTransfer(dataSetting.limitPhone);

        for (let data of dataPhone) {
            threads.push(historyHelper.rewardPhone(data.phone));
        }
    }

    console.log(threads);

    return await Promise.all(threads);
}

exports.runError = async (arrayStatus) => {
    let list = [];
    let array = arrayStatus.map((item) => ({ status: item }));
    let listError = await historyModel.find(
        {
            io: 1,
            $and: [
                {
                    $or: array
                }
            ]
        }
    );

    for (let data of listError) {
        arrayStatus.includes(data.status) && list.push(historyHelper.rewardTransId(null, data.transId));
    }

    return await Promise.all(list);
}

exports.runRefresh = async () => {
    try {
        let threads = [];
        let list = await momoModel.find({ status: 'active', loginStatus: 'refreshError' });

        for (let data of list) {
            threads.push(momoHelper.refreshToken(data.phone));
        }

        let result = await Promise.all(threads);

        return result.filter(e => (delete e.message && delete e.data));
    } catch (err) {
        console.log(err);
        return;
    }
}

exports.runMission = async () => {
    try {
        const dataSetting = await settingModel.findOne();

        let threads = [];
        let min = Math.min(...dataSetting.missionData.data.map(item => item.amount));
        let missionData = dataSetting.missionData.data;
        let dataDay = await historyModel.aggregate([{ $match: { timeTLS: { $gte: moment().startOf('day').toDate(), $lt: moment().endOf('day').toDate() }, $and: [{ $or: [{ status: 'win' }, { status: 'won' }] }] } }, { $group: { _id: '$partnerId', amount: { $sum: '$amount' } } }]);

        dataDay = dataDay.filter(item => item.amount >= min);

        if (!dataDay.length) return;

        for (let data of dataDay) {
            let object = [];
            let amount = [];
            let bonus = [];

            for (let i = 0; i < missionData.length; i++) {
                if (data.amount < missionData[i].amount) {
                    continue;
                }

                amount.push(missionData[i].amount);
                bonus.push(missionData[i].bonus);
            }

            let checkData = await missionModel.find({
                phone: data._id,
                amount: { $in: amount },
                bonus: { $in: bonus },
                createdAt: {
                    $gte: moment().startOf('day').toDate(),
                    $lt: moment().endOf('day').toDate()
                }
            });

            for (let i = 0; i < amount.length; i++) {
                object.push({
                    amount: Number(amount[i]),
                    bonus: Number(bonus[i])
                })
            }

            checkData = object.filter((obj1) => !checkData.some((obj2) => obj1.amount == obj2.amount && obj1.bonus == obj2.bonus))

            checkData.map(obj => threads.push(historyHelper.rewardMission(data._id, obj.amount, obj.bonus, data.amount)));
        }

        return await Promise.all(threads);
    } catch (err) {
        console.log(err);
        return;
    }
}

exports.runTOP = async () => {
    try {
        const dataSetting = await settingModel.findOne();

        let threads = [];
        let dataTOP = dataSetting.topData.bonus;
        let list = await historyModel.aggregate([{ $match: { status: 'win', updatedAt: { $gte: moment().startOf(dataSetting.topData.typeTOP).toDate(), $lt: moment().endOf(dataSetting.topData.typeTOP).add(dataSetting.topData.typeTOP == 'week' ? 1 : 0, 'days').toDate() } } }, { $group: { _id: "$partnerId", money: { $sum: '$bonus' } } }, { $sort: { money: -1 } }, { $limit: dataTOP.length }]);

        console.log(`Tiến hành trả thưởng top!, ${moment().format('YYYY-MM-DD HH:mm:ss')}`)

        for (let [index, data] of list.entries()) {
            let phone = data._id;
            let bonus = Number(dataTOP[index]);

            bonus > 100 && threads.push(historyHelper.rewardTOP(phone, index + 1, data.money, bonus))
        }

        return await Promise.all(threads);
    } catch (err) {
        console.log(err);
        return;
    }
}

exports.runRefund = async () => {
    try {
        const dataSetting = await settingModel.findOne();

        let threads = [];
        let phoneData = [];

        let checkData = await refundModel.find({
            createdAt: {
                $gte: moment().startOf('day').toDate(),
                $lt: moment().endOf('day').toDate()
            }
        });

        phoneData = checkData.map((obj) => obj.phone);

        let filters = [
            {
                $match: {
                    partnerId: { $nin: phoneData },
                    createdAt: {
                        $gte: moment().startOf('day').toDate(),
                        $lt: moment().endOf('day').toDate()
                    }
                }
            },
            {
                $group: {
                    _id: "$partnerId",
                    amount: {
                        $sum: '$amount'
                    }
                }
            }
        ];
        dataSetting.refundBill.typeAction == 'all' && (filters[0].$match.status = 'won');

        let players = await historyModel.aggregate(filters);

        players = players.filter(obj => obj.amount >= dataSetting.refundBill.min);

        for (let data of players) {
            threads.push(historyHelper.refundBill(data._id, dataSetting));
        }

        return await Promise.all(threads);
    } catch (err) {
        console.log(err);
        return;
    }
}

exports.checkError = async (limit = 10) => {
    try {
        let errorData = await historyModel.find({
            io: 1,
            status: 'errorComment',
            amount: { $gte: 5001 },
            isCheck: { $ne: true },
            timeTLS: {
                $gte: moment().startOf('day').toDate(),
                $lt: moment().endOf('day').toDate()
            }
        }).limit(limit);

        let list = [];
        let threads = errorData.map((obj) => momoHelper.getDetails(obj.phone, obj.transId));
        let data = await Promise.all(threads);

        for (let detail of data) {
            if (detail.success) {
                list.push(historyHelper.handleTransId(detail.data, false, detail.data.comment ? true : -1));
            }
        }

        return await Promise.all(list);

    } catch (err) {
        console.log(err);
        return;
    }
}

exports.checkQuery = (search, data) => {
    let query = new URLSearchParams(search);

    for (let key in data) {
        query.delete(data[key]);
    }

    return query.toString();
}

exports.getOTP = (length = 6) => {
    let digits = '1234567890';
    let otp = '';

    for (let i = 0; i < length; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }

    return otp;
}

exports.OTP = async (typeData, dataAction, time = 120) => {
    try {
        let success = true;
        let message;

        switch (typeData) {
            case 'generate':
                let otp = this.getOTP();

                if (!process.env.privateTOKEN || !process.env.privateID) {
                    success = false;
                    message = 'Không tìm thấy privateID!';
                    break;
                }

                var dataUser = await userModel.findOne({ username: dataAction.username });

                if (!dataUser) {
                    success = false;
                    message = 'Không tìm thấy người dùng!';
                    break;
                }

                if (dataUser.dataOTP && moment(dataUser.dataOTP.timeCreated).add(60, 'seconds').format('X') >= moment().format('X')) {
                    success = false;
                    message = 'Không thể lấy OTP lúc này, thử lại sau ít phút!';
                    break;
                }

                dataUser.dataOTP = {
                    otp: crypto.createHash('md5').update(otp).digest("hex"),
                    action: dataAction.action,
                    timeExpired: time,
                    timeCreated: moment().toDate(),
                }

                await dataUser.save();

                await telegramHelper.sendText(process.env.privateTOKEN, process.env.privateID, `* [ ${dataAction.username} ] tạo OTP cho dịch vụ [ ${dataAction.action} ]\n* OTP: ${otp}`);
                message = 'Gửi OTP thành công!';
                break;
            case 'verify':
                var dataUser = await userModel.findOne({ username: dataAction.username });

                if (!dataUser) {
                    success = false;
                    message = 'Không tìm thấy người dùng!';
                    break;
                }

                let dataOTP = dataUser.dataOTP;

                if (!dataOTP || moment().format('X') >= moment(dataOTP.timeCreated).add(dataOTP.timeExpired, 'seconds').format('X') || dataAction.otp != dataOTP.otp || dataAction.action != dataOTP.action) {
                    success = false;
                    message = 'Mã OTP không hợp lệ hoặc đã hết hạn!';
                    break;
                }

                dataUser.dataOTP = null;
                await dataUser.save();
                await telegramHelper.sendText(process.env.privateTOKEN, process.env.privateID, `* [ ${dataAction.username} ] xác nhận OTP thành công cho dịch vụ [ ${dataAction.action} ]`);

                message = 'Xác nhận OTP thành công!';
                break;
        }

        !message && (message = 'Thao tác không hợp lệ!');

        return ({
            success,
            message
        })
    } catch (err) {
        console.log(err);
        return ({
            success: false,
            message: `Có lỗi xảy ra ${err.message || err}`
        })
    }
}

exports.checkQuery = (search, data) => {
    let query = new URLSearchParams(search);

    for (let key in data) {
        query.delete(data[key]);
    }

    return query.toString();
};

exports.generateUserAgent = (appCode, appVer, codename, buildNumber, osVersion = 10) => {
    return `momotransfer/${process.env.appCode}.${process.env.appVer} Dalvik/2.1.0 (Linux; U; Android ${osVersion}; ${codename} ${buildNumber}) AgentID/`;
}

exports.aes256cbcDecrypt = (data, key) => {
    let iv = Buffer.alloc(16);
    let cipher = crypto.createDecipheriv("aes-256-cbc", key.substring(0, 32), iv);
    return cipher.update(data, "base64") + cipher.final("utf8");
}

exports.aes256cbcEncrypt = (data, key) => {
    let iv = Buffer.alloc(16);
    let cipher = crypto.createCipheriv("aes-256-cbc", key.substr(0, 32), iv);
    return Buffer.concat([cipher.update(data, "utf8"), cipher.final()]).toString("base64");
}


// hàm encrypt RSA
exports.rsaEncryptWithPublicKey = (data, publicKey) => crypto.publicEncrypt({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_PADDING,
}, Buffer.from(data)).toString("base64");


// Hàm tạo uuid v4
exports.generateUUIDv4 = () => {
    return uuidV4();
};

// random fmc token
exports.getDummyFcmToken = () => `${this.generateRandomString(22)}:${this.generateRandomString(9)}-${this.generateRandomString(20)}-${this.generateRandomString(12)}-${this.generateRandomString(7)}-${this.generateRandomString(7)}-${this.generateRandomString(53)}-${this.generateRandomString(9)}_${this.generateRandomString(11)}-${this.generateRandomString(4)}`;


// Hàm tạo kí tự ngẫu nhiên theo độ dài
exports.generateRandomString = (length, characters = 'ABCDEFabcdef0123456789') => {
    let result = '';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}

exports.calculateCheckSum = (phone, type, times, setupKey) => this.aes256cbcEncrypt(`${phone}${times}000000${type}${times / 1000000000000.0}E12`, setupKey)

exports.generateRandomBuildId = () => {

    // Function to generate a random date within a specific range
    function generateRandomDate(startDate, endDate) {
        return new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
    }

    // Generate a random alphanumeric string for the first 5 characters
    const alphanumericPrefix = this.generateRandomString(5).toUpperCase();

    // Generate a random number for the build (between 1 and 20)
    const buildNumber = _.random(1, 20).toString().padStart(3, '0');

    // Generate a random date within a range (adjust the range as needed)
    const startDate = new Date('2010-01-01'); // Start date
    const endDate = new Date(); // End date (current date)
    const randomDate = generateRandomDate(startDate, endDate);

    // Format the date as YYYYMMDD
    const formattedDate = randomDate.toISOString().slice(0, 10).replace(/-/g, "");

    // Concatenate parts to form the build ID
    const buildId = `Build/${alphanumericPrefix}.${formattedDate}.${buildNumber}`;

    return buildId;
}

exports.getRKeyFromPhoneAndRandomKey = (phone, randomKey) => {
    return crypto.createHash('sha256').update(`${phone}${randomKey}`).digest('hex');
}

exports.getImeiFromSecureAndModel = (secureId, modelId) => {
    return crypto.createHash('sha256').update(`${secureId}${modelId}`).digest('hex');
}

exports.calculateOHash = (phone, rKey, otp) => {
    return crypto.createHash("sha256").update(`${phone}${rKey}${otp}`).digest("hex");
}

exports.calculatePHash = (imei, password, setupKey) => {
    return this.aes256cbcEncrypt(`${imei}|${password}`, setupKey);
}

exports.generateSecureId = () => this.generateRandomString(16).toLowerCase();
exports.generateModelId = () => this.generateRandomString(64).toLowerCase();

exports.generateSecretKey = () => crypto.randomBytes(32).toString("hex").substring(32);