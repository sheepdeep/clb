"use strict";
const {v4: uuidv4} = require("uuid");
const crypto = require('crypto');
const axios = require('axios');
const moment = require('moment');
const request = require('request');
const momoModel = require('../models/momo.model');
const proxyModel = require('../models/proxy.model');
const transferModel = require('../models/transfer.model');
const logHelper = require('../helpers/log.helper');
const utilsHelper = require('../helpers/utils.helper');
const _ = require('lodash');
const httpsProxyAgent = require('https-proxy-agent');
const {HttpsProxyAgent} = require("https-proxy-agent");
const gameModel = require("../models/game.model");
axios.defaults.timeout = 20 * 1000;
const DEVICE_LIST = JSON.parse(require('fs').readFileSync(__dirname + '/../json/device.json'));
const utilVsign = require('./utilVsign.helper');
const settingModel = require('../models/setting.model');
const jwt = require('jsonwebtoken');

// login section
const CHECK_USER_BE_MSG_LINK = 'https://api.momo.vn/public/auth/user/check';
const TOKEN_GENERATE_LINK = 'https://api.momo.vn/public/auth/switcher/token/generate';
const SEND_OTP_MSG_LINK = 'https://api.momo.vn/public/auth/otp/init';
const REG_DEVICE_MSG_LINK = 'https://api.momo.vn/public/auth/otp/verify';

// smart section
const SMART_REG_LINK = 'https://vsign.pro/api/v3/registerSmartOTP';
const SMART_DELETE_LINK = 'https://vsign.pro/api/v3/deleteSmartOTP';
const SMART_GETOTP_LINK = 'https://vsign.pro/api/v3/getSmartOTP';
const MOMO_VERIFY_SMARTOTP_LINK = 'https://api.momo.vn/api/auth/otp/smart/verify';

// Link các api momo
const LOGIN_LINK = 'https://owa.momo.vn/public/login';
const REFRESH_TOKEN_LINK = 'https://api.momo.vn/auth/fast-login/refresh-token';

const SERVICE_DISPATCHER_LINK = 'https://api.momo.vn/bank/service-dispatcher';
const BALANCE = 'https://api.momo.vn/backend/sof/api/SOF_LIST_MANAGER_MSG';
const FIND_MOMO = 'https://owa.momo.vn/api/FIND_RECEIVER_PROFILE';

const TRAN_HIS_INIT_MSG = 'https://owa.momo.vn/api/TRAN_HIS_INIT_MSG';
const TRAN_HIS_CONFIRM_MSG = 'https://owa.momo.vn/api/TRAN_HIS_CONFIRM_MSG';

const hardCodedAppCode = '4.1.17';
const hardCodedAppVer = 41170;

exports.randomDevice = () => {
    let listDevice = [
        // { "name": "SM-G532F", "FIRMWARE" "deviceOS": "ANDROID", "hardware": "mt6735", "facture": "samsung", "MODELID": "samsung sm-g532gmt6735r58j8671gsw" },
        // { "name": "SM-A102U", "deviceOS": "ANDROID", "hardware": "a10e", "facture": "Samsung", "MODELID": "Samsung SM-A102U" },
        // { "name": "SM-A305FN", "deviceOS": "ANDROID", "hardware": "a30", "facture": "Samsung", "MODELID": "Samsung SM-A305FN" },
        // { "name": "HTC One X9 dual sim", "deviceOS": "ANDROID", "hardware": "htc_e56ml_dtul", "facture": "HTC", "MODELID": "HTC One X9 dual sim" },
        // { "name": "HTC D10w", "deviceOS": "ANDROID", "hardware": "htc_a56dj_pro_dtwl", "facture": "HTC", "MODELID": "HTC htc_a56dj_pro_dtwl" },
        // { "name": "HTC 7060", "deviceOS": "ANDROID", "hardware": "cp5dug", "facture": "HTC", "MODELID": "HTC HTC_7060" },
        // { "name": "Oppo realme X Lite", "deviceOS": "ANDROID", "hardware": "RMX1851CN", "facture": "Oppo", "MODELID": "Oppo RMX1851" },
        // { "name": "MI 9", "deviceOS": "ANDROID", "hardware": "equuleus", "facture": "Xiaomi", "MODELID": "Xiaomi equuleus" }
    ];
    return listDevice[Math.floor(Math.random() * listDevice.length)];
}

exports.randomComment = () => {
    let listComment = [
        {
            "categoryId": 16,
            "themeId": 261,
            themeUrl: "https://img.mservice.com.vn/app/img/transfer/theme/trasua-750x260.png",
            "message": "☕️ Chuyển tiền cà phê",
            "categoryName": "Cà phê, đồ uống khác"
        },
        {
            "categoryId": 16,
            "themeId": 261,
            themeUrl: "https://img.mservice.com.vn/app/img/transfer/theme/trasua-750x260.png",
            "message": "🥤 Chuyển tiền trà sữa",
            "ranking": -1,
            "categoryName": "Cà phê, đồ uống khác"
        },
        {
            "categoryId": 5,
            "themeId": 261,
            themeUrl: "https://img.mservice.com.vn/app/img/transfer/theme/trasua-750x260.png",
            "message": "🍛 Chuyển tiền ăn trưa",
            "ranking": 30,
            categoryName: "Ăn uống"
        },
        {
            "categoryId": 5,
            "themeId": 261,
            themeUrl: "https://img.mservice.com.vn/app/img/transfer/theme/trasua-750x260.png",
            "message": "🍲 Chuyển tiền ăn tối",
            "ranking": -1,
            categoryName: "Ăn uống"
        },
        {
            "categoryId": 5,
            "themeId": 261,
            themeUrl: "https://img.mservice.com.vn/app/img/transfer/theme/trasua-750x260.png",
            "message": "🍜 Chuyển tiền ăn sáng",
            "ranking": -1,
            categoryName: "Ăn uống"
        },
        {
            "categoryId": 14,
            "themeId": 261,
            themeUrl: "https://img.mservice.com.vn/app/img/transfer/theme/trasua-750x260.png",
            "message": "💰 Trả nợ nha!",
            "ranking": 20,
            categoryName: "Trả nợ"
        },
        {
            "categoryId": 10,
            "themeId": 261,
            themeUrl: "https://img.mservice.com.vn/app/img/transfer/theme/trasua-750x260.png",
            "message": "🏠 Chuyển tiền nhà trọ",
            "ranking": -1,
            categoryName: "Sinh hoạt phí"
        },
        {
            "categoryId": 10,
            "themeId": 261,
            themeUrl: "https://img.mservice.com.vn/app/img/transfer/theme/trasua-750x260.png",
            "message": "💡 Chuyển tiền điện",
            "ranking": -1,
            categoryName: "Sinh hoạt phí"
        },
        {
            "categoryId": 10,
            "themeId": 261,
            themeUrl: "https://img.mservice.com.vn/app/img/transfer/theme/trasua-750x260.png",
            "message": "💦 Tiền nước sinh hoạt",
            "ranking": -1,
            categoryName: "Sinh hoạt phí"
        },
        {
            "categoryId": 10,
            "themeId": 261,
            themeUrl: "https://img.mservice.com.vn/app/img/transfer/theme/trasua-750x260.png",
            "message": "🌐 Chuyển tiền internet",
            "ranking": -1,
            categoryName: "Sinh hoạt phí"
        },
        {
            "categoryId": 66,
            "themeId": 261,
            themeUrl: "https://img.mservice.com.vn/app/img/transfer/theme/trasua-750x260.png",
            "message": "💸 Tiền tiêu vặt",
            "ranking": 40,
            categoryName: "Gửi tiền người thân"
        },
        {
            "categoryId": 66,
            "themeId": 261,
            themeUrl: "https://img.mservice.com.vn/app/img/transfer/theme/trasua-750x260.png",
            "message": "💵 Chuyển tiền cho ba mẹ",
            "ranking": -1,
            categoryName: "Gửi tiền người thân"
        },
        {
            "categoryId": 67,
            "themeId": 261,
            themeUrl: "https://img.mservice.com.vn/app/img/transfer/theme/trasua-750x260.png",
            "message": "🤑 Cho bạn mượn tiền",
            "ranking": -1,
            categoryName: "Cho vay"
        },
        {
            "categoryId": 67,
            "themeId": 261,
            themeUrl: "https://img.mservice.com.vn/app/img/transfer/theme/trasua-750x260.png",
            "message": "💲 Chuyển tiền cho vay",
            "ranking": -1,
            categoryName: "Cho vay"
        },
        {
            "categoryId": 78,
            "themeId": 261,
            themeUrl: "https://img.mservice.com.vn/app/img/transfer/theme/trasua-750x260.png",
            "message": "📦 Trả tiền hàng",
            "ranking": -1,
            categoryName: "Mua sắm"
        },
        {
            "categoryId": 78,
            "themeId": 261,
            themeUrl: "https://img.mservice.com.vn/app/img/transfer/theme/trasua-750x260.png",
            "message": "🛍️ Mình thanh toán nhé",
            "ranking": -1,
            categoryName: "Mua sắm"
        },
        {
            "categoryId": 78,
            "themeId": 261,
            themeUrl: "https://img.mservice.com.vn/app/img/transfer/theme/trasua-750x260.png",
            "message": "🚚 Chuyển tiền shipper",
            "ranking": -1,
            categoryName: "Mua sắm"
        },
        {
            "categoryId": 13,
            "themeId": 261,
            themeUrl: "https://img.mservice.com.vn/app/img/transfer/theme/trasua-750x260.png",
            "message": "🎦 Chuyển tiền xem phim",
            "ranking": -1,
            categoryName: "Giải trí"
        },
        {
            "categoryId": 13,
            "themeId": 261,
            themeUrl: "https://img.mservice.com.vn/app/img/transfer/theme/trasua-750x260.png",
            "message": "🧳 Chuyển tiền du lịch",
            "ranking": -1,
            categoryName: "Giải trí"
        },
    ];
    return listComment[Math.floor(Math.random() * listComment.length)];
}

exports.randomString = (length, characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ') => {
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

exports.diffHours = (date, otherDate) => Math.abs(date - otherDate) / (1000 * 60 * 60);

exports.getToken = () => `${this.randomString(22)}:${this.randomString(9)}-${this.randomString(20)}-${this.randomString(12)}-${this.randomString(7)}-${this.randomString(7)}-${this.randomString(53)}-${this.randomString(9)}_${this.randomString(11)}-${this.randomString(4)}`;

exports.sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");

exports.decryptString = (data, key) => {
    let iv = Buffer.alloc(16);
    let cipher = crypto.createDecipheriv("aes-256-cbc", key.substring(0, 32), iv);
    return cipher.update(data, "base64") + cipher.final("utf8");
}

exports.encryptString = (data, key) => {
    let iv = Buffer.alloc(16);
    let cipher = crypto.createCipheriv("aes-256-cbc", key.substr(0, 32), iv);
    return Buffer.concat([cipher.update(data, "utf8"), cipher.final()]).toString("base64");
}

exports.encryptRSA = (data, publicKey) => crypto.publicEncrypt({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_PADDING
}, Buffer.from(data)).toString("base64");

exports.checkSum = (phone, type, times, setupKey) => this.encryptString(`${phone}${times}000000${type}${times / 1000000000000.0}E12`, setupKey);

exports.convertPhone = (number) => {
    let arrPrefix = {
        "016966": "03966",
        "0169": "039",
        "0168": "038",
        "0167": "037",
        "0166": "036",
        "0165": "035",
        "0164": "034",
        "0163": "033",
        "0162": "032",
        "0120": "070",
        "0121": "079",
        "0122": "077",
        "0126": "076",
        "0128": "078",
        "0123": "083",
        "0124": "084",
        "0125": "085",
        "0127": "081",
        "0129": "082",
        "01992": "059",
        "01993": "059",
        "01998": "059",
        "01999": "059",
        "0186": "056",
        "0188": "058"
    }
    try {
        number = number.replace(/\D/g, '');
        for (let prefix in arrPrefix) {
            if (number.includes(prefix) && number.substr(0, prefix.length) == prefix) {
                number = `${arrPrefix[prefix]}${number.substr(prefix.length, (number.length - prefix.length))}`;
                break;
            }
        }
        return number;
    } catch (err) {
        console.log(err);
        return number;
    }
}

exports.regexPhone = (phone) => /(84|0[3|5|7|8|9])+([0-9]{8})\b/g.test(phone);

exports.getVSignEncrypted = async (string) => {
    try {
        const {data: result} = await axios.post('https://vsign.pro/api/v2/getVSign', {encrypted: string}, {
            headers: {
                key: process.env.vsignKey,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 Edg/117.0.2045.31',
                os: 'android',
                version: process.env.appCode,
            },
            timeout: 10000,
        });
        return result && result.data;
    } catch (e) {
        console.log('Có lỗi khi lấy vSIGN');
        return ''
    }
}

exports.curlMomo = async (url, phone, data, header = null) => {
    try {
        // kiem tra proxy
        const dataSetting = await settingModel.findOne().lean();

        if (dataSetting.curlProxy == 'active') {

            const dataProxy = await this.checkProxy(phone);
            const proxy = dataProxy.proxy;

            if (!dataProxy.success) {
                return {
                    success: false,
                    message: dataProxy.message
                }
            }

            console.log('Proxy ' + phone + ' là ' + proxy.ipAddress);

            const proxyUrl = `http://${proxy.username}:${proxy.password}@${proxy.ipAddress}:${proxy.port}`;
            const agent = new HttpsProxyAgent(proxyUrl); // Use the correct casing

            const options = {
                method: 'post',
                maxBodyLength: Infinity,
                httpsAgent: agent,
                url: url,
                headers: {
                    'Content-Type': 'application/json',
                    ...header
                },
                data: data
            }

            const {data: response} = await axios(options);

            return response;
        } else {

            const options = {
                method: 'post',
                maxBodyLength: Infinity,
                url: url,
                headers: {
                    'Content-Type': 'application/json',
                    ...header
                },
                data: data
            }
            const {data: response} = await axios(options);

            return response;
        }

    } catch (e) {
        console.log(e);
    }
}

exports.commonHeader = {
    app_code: process.env.APP_CODE,
    app_version: process.env.APP_VER,
    lang: 'vi',
    channel: 'APP',
    env: 'production',
    timezone: 'Asia/Ho_Chi_Minh',
    'accept-language': 'vi-VN,vi;q=0.9',
    device_os: 'ANDROID',
    'accept-charset': 'UTF-8',
    accept: 'application/json',
    agent_id: 0,
    'content-type': 'application/json',
}

exports.generateUserAgent = async (appCode, appVer, codename, buildNumber, osVersion = 10) => {
    return `momotransfer/${appCode}.${appVer} Dalvik/2.1.0 (Linux; U; Android ${osVersion}; ${codename} ${buildNumber}) AgentID/`;
}

exports.doRequestEncryptMoMo = async (link, body, account, msgType, {agentid, phone, devicecode, secureid}) => {
    const requestSecretKey = utilVsign.generateSecretKey();
    const requestKey = utilVsign.rsaEncryptWithPublicKey(requestSecretKey, account.publicKey);

    const encryptedRequestString = utilVsign.aes256cbcEncrypt(
        JSON.stringify(body),
        requestSecretKey,
    );

    const { vsign, tbid, vversion, ftv, vcs, vts, mtd, mky } = await this.getVSign({ encrypted: encryptedRequestString }, {agentid, phone, devicecode, secureid});

    if (!vsign) {
        // Trường hợp không lấy được vsign
        return {
            success: false,
            message: 'Có lỗi khi lấy vSign Endpoint' + link,
        }
    }

    const headers = {
        ...this.commonHeader,
        'content-type': 'text/plain', // fix bug auto add "" to body
        requestkey: requestKey,
        vsign,
        tbid,
        vts, vcs, vversion, ftv, mtd, mky,
        agent_id: account.agentId,
        sessionkey: account.sessionKey,
        userid: account.phone,
        user_phone: account.phone,
        'platform-timestamp': Date.now(),
        'momo-session-key-tracking': account.momoSessionKeyTracking,
        'user-agent': `${account.userAgent}${account.agentId}`,
        Authorization: `Bearer ${account.accessToken}`,
    }
    if (msgType) {
        headers['msgtype'] = msgType;
    }
    console.log('Header là', headers);
    const { data: resultMoMo } = await axios.post(link, encryptedRequestString, {
        headers,
        transformRequest: [function (data, headers) {
            // Do whatever you want to transform the data
            headers['content-type'] = 'application/json'; // sửa lại content-type cho giống momo gửi, nếu để content-type là json thì nó sẽ bị bug tự thêm 2 dấu ""
            return data;
        }],
    });

    const decryptedResponseData = utilVsign.aes256cbcDecrypt(
        resultMoMo,
        requestSecretKey,
    );

    try {
        return JSON.parse(decryptedResponseData);
    } catch (e) {
        return decryptedResponseData;
    }

}

exports.checkProxy = async (phone) => {
    try {

        // so luong proxy
        const countProxy = await proxyModel.findOne({
            $or: [
                {phone: phone},
                {phone: null}
            ]
        }).lean();

        if (countProxy <= 0 || !countProxy) {
            return {
                success: false,
                message: 'Vui lòng thêm proxy'
            }
        }

        const proxy = await proxyModel.findOne({
            $or: [
                {phone: phone},
                {phone: null}
            ]
        }).lean();

        const proxyUrl = `http://${proxy.username}:${proxy.password}@${proxy.ipAddress}:${proxy.port}`;
        const agent = new HttpsProxyAgent(proxyUrl); // Use the correct casing

        // Make the request with the proxy agent
        const {data: response} = await axios.get('https://api.ipify.org?format=json', {
            httpsAgent: agent,
        });

        if (response.ip === proxy.ipAddress) {

            console.log('Proxy số ' + phone + ' ' + proxy.ipAddress);

            if (proxy.phone == null) {
                await proxyModel.findOneAndUpdate({ipAddress: proxy.ipAddress}, {$set: {phone}});
            }

            return {
                success: true,
                message: 'Lấy proxy thành công!',
                proxy
            }
        }

        return {
            success: false,
            message: 'Proxy bị lỗi'
        }


    } catch (err) {
        console.log(err);
        return ({
            success: false,
            message: 'Có lỗi xảy ra CHECK_PROXY ' + err.message || err,
            dataResult: err
        })
    }
}

exports.getVSign = async (data, { agentid, phone, devicecode, secureid }) => {
    try {
        const {data: result} = await axios.post('https://vsign.pro/api/v4/getVSign', data, {
            headers: {
                key: process.env.VSIGN_APIKEY,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 Edg/117.0.2045.31',
                os: 'android',
                version: process.env.APP_CODE,
                agentid,
                phone,
                devicecode,
                secureid,
            },
            timeout: 10000,
        });

        return result;
    } catch (e) {
        console.log('Có lỗi khi lấy vSIGN', e.message);
        return ''
    }
}

exports.relogin = async (phone, password) => {
    const currentAccount = await momoModel.findOne({ phone }).lean();
    if (!currentAccount) {
        return {success: false, message: 'Account not found'};
    }
    if (currentAccount.status === "lock") {
        return {success: false, message: 'Tài khoản đã bị khóa'};
    }
    const dataDevice = JSON.parse(currentAccount.dataDevice);

    let loginPassword = currentAccount.password || password;

    const time = Date.now();

    const checkSumCalculated = utilVsign.calculateCheckSum(phone, 'USER_LOGIN_MSG', time, currentAccount.setupKey);
    const pHash = utilVsign.calculatePHash(currentAccount.imei, password, currentAccount.setupKey);

    if (currentAccount.complexPassword) {
        const loginNewLink = 'https://api.momo.vn/public/signin';
        const bodyLogin = {
            "user": phone,
            "pass": pHash,
            "msgType": "USER_LOGIN_MSG",
            "momoMsg": {
                "_class": "mservice.backend.entity.msg.LoginMsg",
                "isSetup": false
            },
            "extra": {
                "pHash": pHash,
                "IDFA": "",
                "SIMULATOR": false,
                "TOKEN": dataDevice.dummyFcmToken,
                "ONESIGNAL_TOKEN": dataDevice.dummyFcmToken,
                "SECUREID": dataDevice.secureId,
                "MODELID": dataDevice.modelId,
                "DEVICE_TOKEN": "",
                "checkSum": checkSumCalculated,
                "isNFCAvailable": false,
                "sHash": null
            },
            "appVer": process.env.APP_VER,
            "appCode": process.env.APP_CODE,
            "lang": "vi",
            "deviceName": dataDevice.deviceName,
            "deviceOS": "android",
            "channel": "APP",
            "buildNumber": 0,
            "appId": "vn.momo.platform",
            "cmdId": `${time}000000`,
            "time": time,
        }

        const headers = {
            ...this.commonHeader,
            sessionkey: '',
            userid: phone,
            msgtype: 'USER_LOGIN_MSG',
            user_phone: phone,
            agent_id: 0,
            authorization: 'Bearer',
            'user-agent': `${currentAccount.userAgent}/0`,
        }

        const {data: result} = await axios.post(loginNewLink, bodyLogin, {
            headers,
        });

        console.log(result)

        if (result.errorCode === 0) {
            console.log('Login momo thành công');
            const accessToken = result.extra.AUTH_TOKEN;
            const refreshToken = result.extra.REFRESH_TOKEN;
            const sessionKey = result.extra.SESSION_KEY;
            const agentId = result.momoMsg.agentId;
            const requestEncryptKey = result.extra.REQUEST_ENCRYPT_KEY;
            const update = {
                username: phone,
                pHash,
                accessToken: accessToken,
                refreshToken,
                sessionKey,
                agentId,
                publicKey: requestEncryptKey,
                password,
                lastLogined: new Date().toISOString(),
                loginStatus: "active",
            }


            await momoModel.findOneAndUpdate({phone}, {
                $set: {
                    ...update
                },
            }, {upsert: true})

            return {
                message: 'Đăng nhập thành công',
            };

        }
        throw new Error(result.errorDesc || 'Có lỗi khi login')

    }

    const bodyLogin = {
        "user": phone,
        "pass": loginPassword,
        "msgType": "USER_LOGIN_MSG",
        "momoMsg": {
            "_class": "mservice.backend.entity.msg.LoginMsg",
            "isSetup": false,
        },
        "extra": {
            "pHash": pHash,
            "IDFA": "",
            "SIMULATOR": false,
            "TOKEN": "",
            "ONESIGNAL_TOKEN": "",
            "SECUREID": dataDevice.secureId,
            "MODELID": dataDevice.modelId,
            "DEVICE_TOKEN": "",
            "checkSum": checkSumCalculated,
            "isNFCAvailable": true,
        },
        "appVer": process.env.APP_VER,
        "appCode": process.env.APP_CODE,
        "lang": "vi",
        "deviceOS": "android",
        "deviceName": dataDevice.deviceName,
        "channel": "APP",
        "buildNumber": 0,
        "appId": "vn.momo.platform",
        "cmdId": `${time}000000`,
        "time": time,
    }

    console.log('ok');
    const { vsign, tbid: tbidRight, vts, vcs, vversion, ftv, mtd, mky } = await this.getVSign(bodyLogin, {
        agentid: 0,
        phone: '',
        devicecode: dataDevice.deviceCode,
        secureid: dataDevice.secureId,
    });
    console.log('vsign', vsign, tbidRight, vts, vcs, vversion, ftv, mtd, mky)

    const headers = {
        ...this.commonHeader,
        sessionkey: '',
        userid: phone,
        msgtype: 'USER_LOGIN_MSG',
        user_phone: phone,
        agent_id: 0,
        authorization: 'Bearer',
        vsign,
        tbid: tbidRight,
        vts, vcs, vversion, ftv, mtd, mky,
        'user-agent': `${currentAccount.userAgent}/0`,
    }

    const { data: result } = await axios.post(LOGIN_LINK, bodyLogin, {
        headers,
    });

    console.log(result);

    if (result.errorCode === 0) {
        console.log('Login momo thành công');
        const accessToken = result.extra.AUTH_TOKEN;
        const refreshToken = result.extra.REFRESH_TOKEN;
        const sessionKey = result.extra.SESSION_KEY;
        const agentId = result.momoMsg.agentId;
        const requestEncryptKey = result.extra.REQUEST_ENCRYPT_KEY;

        const update = {
            username: phone,
            pHash,
            accessToken: accessToken,
            refreshToken,
            sessionKey,
            agentId,
            publicKey: requestEncryptKey,
            password,
            pin: password,
            lastLogined: new Date().toISOString(),
            loginStatus: "active",
        }

        await momoModel.findOneAndUpdate({ phone }, {
            $set: update,
        }, { upsert: true })

        return {
            success: true,
            message: 'Đăng nhập thành công',
        };

    }
    throw new Error(result.errorDesc || 'Có lỗi khi login')
}

exports.sendOTP = async (phone, password) => {
    try {

        await this.checkUserBeMsg(phone);

        const currentAccount = await momoModel.findOne({phone}).lean();
        if (!currentAccount) {
            return {
                success: false,
                message: 'Không tìm thấy tài khoản!'
            }
        }
        const dataDevice = JSON.parse(currentAccount.dataDevice);

        const params = {
            riskId: currentAccount.riskId,
            methodCode: currentAccount.riskErrorCode,
            imei: currentAccount.imei,
        }

        const headers = {
            sessionkey: '',
            user_id: phone,
            'user-id': phone,
            'userId': phone,
            MsgType: 'GEN_METHOD_TOKEN_MSG',
            'option-key': currentAccount.riskOptionKey,
            user_phone: '',
            'platform-timestamp': Date.now(),
            'momo-session-key-tracking': currentAccount.momoSessionKeyTracking,
            'user-agent': `${currentAccount.userAgent}/0`,
            ...this.commonHeader,
        }
        console.log('Header là', headers);
        // momoData cần phải minify trước khi gửi lên momo, ở đây dùng trick JSON.parse(JSON.stringify(momoData))
        const {data: resultMoMo} = await axios.get(TOKEN_GENERATE_LINK, {
            params,
            headers,
        });

        if (resultMoMo.errorCode === 881200002) {

            const aToken = _.get(resultMoMo, 'riskMsg.token');
            const rKey = utilVsign.generateRandomString(20);
            const queryParams = {
                cmdId: `${Date.now()}000000`,
                rkey: rKey,
                firmware: dataDevice.firmware
            }

            const vsignDataLink = `${SEND_OTP_MSG_LINK}?cmdId=${queryParams.cmdId}&rkey=${queryParams.rkey}&firmware=${queryParams.firmware}`;


            const {vsign, vts, vcs, vversion, tbid, ftv, mtd, mky} = await this.getVSign({encrypted: vsignDataLink}, {
                agentid: 0,
                phone: '',
                devicecode: dataDevice.deviceCode,
                secureid: dataDevice.secureId,
            });
            console.log('VSign là', vsign);
            if (!vsign) {
                // Trường hợp không lấy được vsign
                return {
                    success: false,
                    message: 'Có lỗi khi lấy vSign INIT_OTP_MSG',
                }
            }

            const {data: resultMoMo1} = await axios.get(SEND_OTP_MSG_LINK, {
                params: queryParams,
                headers: {
                    authorization: aToken,
                    sessionkey: '',
                    'userId': phone,
                    user_phone: '',
                    'platform-timestamp': Date.now(),
                    'momo-session-key-tracking': currentAccount.momoSessionKeyTracking,
                    'user-agent': `${currentAccount.userAgent}/0`,
                    ...this.commonHeader,
                    vsign, vts, vcs, vversion, tbid, ftv, mtd, mky
                },
            });

            if (resultMoMo1.errorCode === 0) {
                await momoModel.findOneAndUpdate({phone}, {
                    $set: {
                        aToken,
                        rkeyOTP: queryParams.rkey,
                        loginStatus: "waitOTP",
                    },
                }, {upsert: true});


                return {
                    success: true,
                    message: 'Gửi OTP thành công',
                }
            } else {
                throw new Error(resultMoMo1.errorDesc || 'Có lỗi khi gọi INIT_OTP_MSG');
            }


        }

        throw new Error(resultMoMo.errorDesc || 'Có lỗi khi gọi CHECK_USER_BE_MSG');

    } catch (err) {
        console.log(err);
        return ({
            success: false,
            message: 'Có lỗi xảy ra SEND_OTP VSIGN ' + err.message || err,
            dataResult: err
        })
    }
}

exports.checkUserBeMsg = async (phone) => {
    try {

        const randomDevice = _.sample(DEVICE_LIST);
        const osVersion = _.sample([10]); // 9 => firmware 28
        const firmware = osVersion + 19;
        const buildNumber = utilVsign.generateRandomBuildId();
        const userAgentNoEndingZero = await this.generateUserAgent(process.env.appCode, process.env.appVer, randomDevice.code, buildNumber, _.sample([9, 10, 11, 12, 13]));
        const momoSessionKeyTracking = utilVsign.generateUUIDv4().toLowerCase();
        const dummyFcmToken = utilVsign.getDummyFcmToken();

        const secureId = utilVsign.generateSecureId();
        const modelId = utilVsign.generateModelId();
        const imei = utilVsign.getImeiFromSecureAndModel(secureId, modelId);

        const random20Characters = utilVsign.generateRandomString(20, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVXZ');

        const rkey = utilVsign.sha256(`${phone}${random20Characters}`).slice(0, 32);

        const momoData = {
            "userId": phone,
            "msgType": "AUTH_USER_MSG",
            "cmdId": `${Date.now()}000000`,
            "time": Date.now(),
            "appVer": process.env.APP_VER,
            "appCode": process.env.APP_CODE,
            "deviceOS": "android",
            "buildNumber": process.env.APP_VER,
            "imei": imei,
            "device": randomDevice.name,
            "firmware": `${firmware}`,
            "hardware": randomDevice.manufacture,
            "rkey": rkey,
            "isNFCAvailable": true,
        }

        const {vsign, vts, vcs, vversion, tbid, ftv, mtd, mky} = await this.getVSign(momoData, {
            agentid: 0,
            phone: '',
            devicecode: randomDevice.code,
            secureid: secureId,
        });

        const headers = {
            sessionKey: '',
            userid: '',
            user_phone: '',
            vsign, vts, vcs, vversion, tbid, ftv, mtd, mky,
            'platform-timestamp': Date.now(),
            'momo-session-key-tracking': momoSessionKeyTracking,
            'user-agent': `${userAgentNoEndingZero}/0`,
            ...this.commonHeader,
        }

        console.log('Header là', headers);

        const {data: resultMoMo} = await axios.post(CHECK_USER_BE_MSG_LINK, momoData, {
            headers,
        }, phone);

        // Trường hợp momo imei đang login thì đăng nhập lại không cần lấy OTP
        if (resultMoMo.errorCode === 0 && _.get(resultMoMo, 'setupKey')) {
            // TODO: relogin
            return {message: 'Đã đăng nhập lại thành công không cần lấy OTP mới', success: false};
        }

        if (resultMoMo.setupKey === "" && resultMoMo.atoken === "") {
            const riskId = resultMoMo.riskId;
            const riskErrorOTPCode = 881200002; //
            const riskOptionKey = _.find(_.get(resultMoMo, 'popupData.items'), (a) => a.errorCode === riskErrorOTPCode).optionKey;
            // save to DB
            const device = {
                osVersion,
                deviceName: randomDevice.name,
                deviceCode: randomDevice.code,
                manufacture: randomDevice.manufacture,
                buildNumber,
                firmware,
                modelId,
                secureId,
                rKey: rkey,
                dummyFcmToken: dummyFcmToken,

            }
            await momoModel.findOneAndUpdate({phone}, {
                $set: {
                    userAgent: userAgentNoEndingZero,
                    phone: phone,
                    momoSessionKeyTracking,
                    dataDevice: JSON.stringify(device),
                    riskId,
                    riskErrorCode: riskErrorOTPCode,
                    riskOptionKey,
                    imei,
                },
            }, {upsert: true})
            return {
                success: true,
                message: 'Check user thành công',
            }
        }

        throw new Error(resultMoMo.errorDesc || 'Có lỗi khi gọi CHECK_USER_BE_MSG');

    } catch (err) {
        console.log(err);
    }
}

exports.regDeviceMsg = async (phone, password, pin, otp) => {
    try {
        const currentAccount = await momoModel.findOne({phone}).lean();
        if (!currentAccount) {
            return {
                success: false,
                message: 'Không tìm thấy tài khoản!'
            }
        }
        const dataDevice = JSON.parse(currentAccount.dataDevice);
        const parsedAToken = utilVsign.parseJwt(currentAccount.aToken);
        const otpValue = utilVsign.calculateOHash(parsedAToken.user, currentAccount.rkeyOTP, otp);

        const time = Date.now();
        // momo data cần gửi
        const momoData = {
            "msgType": "VERIFY_OTP_MSG",
            "cmdId": `${time}000000`,
            "otpValue": otpValue,
            "publicKey": null,
        }

        console.log('BODY cần lấy vsign', momoData);
        const {vsign, vts, vcs, vversion, tbid, ftv, mtd, mky} = await this.getVSign(momoData, {
            agentid: 0,
            phone: '',
            devicecode: dataDevice.deviceCode,
            secureid: dataDevice.secureId,
        });
        console.log('VSign là', vsign);
        if (!vsign) {
            // Trường hợp không lấy được vsign
            return {
                success: false,
                message: 'Có lỗi khi lấy vSign VERIFY_OTP_MSG',
            }
        }
        // Trường hợp có vsign tiến hành gửi đến api momo

        const headers = {
            authorization: currentAccount.aToken,
            sessionKey: '',
            userid: '',
            user_phone: '',
            vsign: vsign,
            tbid,
            vts, vcs, vversion, ftv, mtd, mky,
            'platform-timestamp': Date.now(),
            'momo-session-key-tracking': currentAccount.momoSessionKeyTracking,
            'user-agent': `${currentAccount.userAgent}/0`,
            ...this.commonHeader,
        }
        console.log('Header là', headers);
        // momoData cần phải minify trước khi gửi lên momo, ở đây dùng trick JSON.parse(JSON.stringify(momoData))
        const {data: resultMoMo} = await axios.post(REG_DEVICE_MSG_LINK, momoData, {
            headers,
        }, phone);

        if (resultMoMo.errorCode === 0) {

            // momo data cần gửi
            const momoData1 = {
                "userId": phone,
                "msgType": "AUTH_USER_MSG",
                "cmdId": `${Date.now()}000000`,
                "time": Date.now(),
                "appVer": process.env.APP_VER,
                "appCode": process.env.APP_CODE,
                "deviceOS": "android",
                "buildNumber": process.env.APP_VER,
                "imei": currentAccount.imei,
                "device": dataDevice.deviceName,
                "firmware": `${dataDevice.firmware}`,
                "hardware": dataDevice.manufacture,
                "rkey": dataDevice.rKey,
                "isNFCAvailable": true,
            }
            console.log('BODY cần lấy vsign', momoData);
            const {vsign, vts, vcs, vversion, tbid, ftv, mtd, mky} = await this.getVSign(momoData1, {
                agentid: 0,
                phone: '',
                devicecode: dataDevice.deviceCode,
                secureid: dataDevice.secureId,
            });
            console.log('VSign là', vsign);
            if (!vsign) {
                // Trường hợp không lấy được vsign
                return {
                    success: false,
                    message: 'Có lỗi khi lấy vSign AUTH_USER_MSG',
                }
            }


            const headers = {
                'risk-id': currentAccount.riskId,
                sessionKey: '',
                userid: '',
                user_phone: '',
                vsign, vts, vcs, vversion, tbid, ftv, mtd, mky,
                'platform-timestamp': Date.now(),
                'momo-session-key-tracking': currentAccount.momoSessionKeyTracking,
                'user-agent': `${currentAccount.userAgent}/0`,
                ...this.commonHeader,
            }
            console.log('Header là', headers);
            // momoData cần phải minify trước khi gửi lên momo, ở đây dùng trick JSON.parse(JSON.stringify(momoData))
            const {data: resultMoMo1} = await axios.post(CHECK_USER_BE_MSG_LINK, momoData1, {
                headers,
            }, phone);

            if (resultMoMo1.setupKey) {
                const setupKey = utilVsign.aes256cbcDecrypt(resultMoMo1.setupKey, dataDevice.rKey);
                const name = resultMoMo1.userInfo.name;

                const complexPassword = !!resultMoMo1.userInfo.complexPassword;
                let bodyUpdate = {
                    phone: phone,
                    setupKey,
                    name,
                    loginStatus: "waitLogin",
                    complexPassword
                }
                if (complexPassword) {
                    bodyUpdate.pin = pin;
                }

                await momoModel.findOneAndUpdate({phone}, {
                    $set: {
                        ...bodyUpdate
                    },
                }, {upsert: true});

                return {
                    success: true,
                    message: 'OTP hợp lệ, đang tiến hành login',
                }
            }


        } else {
            throw new Error(resultMoMo.errorDesc || 'Có lỗi khi gọi VERIFY_OTP_MSG');
        }


    } catch (e) {
        throw e;
    }
}

exports.login = async (phone) => {
    try {

        const currentAccount = await momoModel.findOne({phone}).lean();

        if (!currentAccount) {
            return {
                success: false,
                message: 'Không tìm thấy tài khoản!'
            }
        }

        if (currentAccount.status === "lock") {
            return {
                success: false,
                message: 'Tài khoản đã bị khóa'
            }
        }

        const dataDevice = JSON.parse(currentAccount.dataDevice);

        const time = Date.now();

        const checkSumCalculated = utilVsign.calculateCheckSum(phone, 'USER_LOGIN_MSG', time, currentAccount.setupKey);
        const pHash = utilVsign.calculatePHash(currentAccount.imei, currentAccount.password, currentAccount.setupKey);
        let loginPassword = currentAccount.password;

        // momo data cần gửi
        const momoData = {
            "user": phone,
            "pass": loginPassword,
            "msgType": "USER_LOGIN_MSG",
            "momoMsg": {
                "_class": "mservice.backend.entity.msg.LoginMsg",
                "isSetup": false,
            },
            "extra": {
                "pHash": pHash,
                "IDFA": "",
                "SIMULATOR": false,
                "TOKEN": dataDevice.dummyFcmToken,
                "ONESIGNAL_TOKEN": dataDevice.dummyFcmToken,
                "SECUREID": dataDevice.secureId,
                "MODELID": dataDevice.modelId,
                "DEVICE_TOKEN": "",
                "checkSum": checkSumCalculated,
            },
            "appVer": process.env.appVer,
            "appCode": process.env.appCode,
            "lang": "vi",
            "deviceOS": "android",
            "deviceName": dataDevice.deviceName,
            "channel": "APP",
            "buildNumber": 0,
            "appId": "vn.momo.platform",
            "cmdId": `${time}000000`,
            "time": time,
        }

        const {vsign, tbid: tbidRight, vts, vcs, vversion, ftv} = await this.getVSign(momoData);

        if (!vsign) {
            // Trường hợp không lấy được vsign
            return {
                success: false,
                message: 'Có lỗi khi lấy vSign RE_LOGIN',
            }
        }

        const headers = {
            app_version: process.env.appVer,
            app_code: process.env.appCode,
            sessionkey: '',
            userid: phone,
            msgtype: 'USER_LOGIN_MSG',
            user_phone: phone,
            agent_id: 0,
            authorization: 'Bearer',
            vsign,
            tbid: tbidRight,
            vts, vcs, vversion, ftv,
            'user-agent': `${currentAccount.userAgent}/0`,
            ...this.commonHeader,
        }


        // momoData cần phải minify trước khi gửi lên momo, ở đây dùng trick JSON.parse(JSON.stringify(momoData))
        const result = await this.curlMomo('https://owa.momo.vn/public/login', phone, momoData, headers);


        if (result.errorCode === 0) {
            const accessToken = result.extra.AUTH_TOKEN;
            const refreshToken = result.extra.REFRESH_TOKEN;
            const sessionKey = result.extra.SESSION_KEY;
            const agentId = result.momoMsg.agentId;
            const requestEncryptKey = result.extra.REQUEST_ENCRYPT_KEY;
            await momoModel.findOneAndUpdate({phone}, {
                $set: {
                    phone,
                    phash: pHash,
                    accessToken: accessToken,
                    refreshToken,
                    sessionKey,
                    agentId,
                    publicKey: requestEncryptKey,
                    loginAt: new Date().toISOString(),
                    loginStatus: "active",
                },
            }, {upsert: true})

            return {
                success: true,
                message: 'Đăng nhập thành công',
            };

        }


    } catch (e) {
        console.log('Có lỗi xảy ra khi gọi API momo LOGIN_MSG', e);
        return {
            success: false,
            message: 'Có lỗi xảy ra khi gọi API momo LOGIN_MSG',
        }
    }
}

exports.refreshToken = async (phone) => {
    try {

        const currentAccount = await momoModel.findOne({ phone }).lean();
        const dataDevice = JSON.parse(currentAccount.dataDevice);
        const timeToRequest = Date.now();

        const body = {
            "user": currentAccount.phone,
            "msgType": "REFRESH_TOKEN_MSG",
            "momoMsg": {
                "_class": "mservice.backend.entity.msg.RefreshAccessTokenMsg",
                "accessToken": currentAccount.accessToken,
            },
            "extra": {
                "IDFA": "",
                "SIMULATOR": false,
                "TOKEN": dataDevice.dummyFcmToken,
                "ONESIGNAL_TOKEN": dataDevice.dummyFcmToken,
                "SECUREID": dataDevice.secureId,
                "MODELID": dataDevice.modelId,
                "DEVICE_TOKEN": "",
                "DEVICE_IMEI": currentAccount.imei,
                "checkSum": utilVsign.calculateCheckSum(currentAccount.phone, 'REFRESH_TOKEN_MSG', timeToRequest, currentAccount.setupKey),
            },
            "appVer": process.env.APP_VER,
            "appCode": process.env.APP_CODE,
            "lang": "vi",
            "deviceName": dataDevice.deviceName,
            "deviceOS": "android",
            "channel": "APP",
            "buildNumber": 0,
            "appId": "vn.momo.platform",
            "cmdId": `${timeToRequest}000000`,
            "time": timeToRequest,
        };

        const headers = {
            ...this.commonHeader,
            sessionkey: currentAccount.sessionKey,
            userid: currentAccount.phone,
            msgtype: 'REFRESH_TOKEN_MSG',
            user_phone: currentAccount.phone,
            'platform-timestamp': Date.now(),
            'momo-session-key-tracking': currentAccount.momoSessionKeyTracking,
            'user-agent': `${currentAccount.userAgent}${currentAccount.agentId}`,
            Authorization: `Bearer ${currentAccount.refreshToken}`,
        }
        console.log('Header là', headers);
        // momoData cần phải minify trước khi gửi lên momo, ở đây dùng trick JSON.parse(JSON.stringify(momoData))
        const { data: resultMoMo } = await axios.post(REFRESH_TOKEN_LINK, body, {
            headers,
        });

        if (resultMoMo.errorCode === 0) {
            await momoModel.findOneAndUpdate({ phone }, {
                $set: {
                    accessToken: resultMoMo.momoMsg.accessToken,
                    lastLogined: new Date().toISOString(),
                },
            });
            return {
                success: true,
                message: 'Lấy lại token thành công!'
            }
        }
        return false;

    } catch (e) {
        this.login(phone);
        console.log('Có lỗi xảy ra khi gọi API momo REFRESH_TOKEN', e);
        return {
            success: false,
            message: 'Có lỗi xảy ra khi gọi API momo REFRESH_TOKEN',
        }
    }
}

exports.confirmOTP = async (phone, password, otp) => {
    try {

        const data = {
            phone,
            password,
            otp,
            receiver: '0922163273'
        }

        // const {data: response} = await axios(options);
        const options = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://vsign.pro/api/v3/meomeo/confirmOTP',
            headers: {
                'key': process.env.VSIGN_APIKEY,
                'Content-Type': 'application/json'
            },
            data: data
        }
        const {data: response} = await axios(options);

        if (!response.status) {

            return {
                success: true,
                // proxy: proxy.ipAddress,
                imei: response.data.imei,
                message: 'Xác minh thành công!'
            }
        } else {
            return {
                success: false,
                message: response.message
            }
        }


    } catch (err) {
        console.log(err);
        return ({
            success: false,
            message: 'Có lỗi xảy ra CONFORM_OTP VSIGN ' + err.message || err,
            dataResult: err
        })
    }
}

exports.balance = async (phone, returnSofInfo = false) => {
    try {

        const currentAccount = await momoModel.findOne({phone}).lean();

        if (!currentAccount) {
            return {
                success: false,
                message: 'Không tìm thấy tài khoản!'
            }
        }

        if (currentAccount.status === "lock") {
            return {
                success: false,
                message: 'Tài khoản đã bị khóa'
            }
        }

        const dataDevice = JSON.parse(currentAccount.dataDevice);
        const timeToRequest = Date.now();

        const pHash = utilVsign.calculatePHash(currentAccount.imei, currentAccount.password, currentAccount.setupKey);

        // momo data cần gửi
        const body = {
            "appCode": process.env.APP_CODE,
            "appId": "",
            "appVer": process.env.APP_VER,
            "buildNumber": 0,
            "channel": "APP",
            "cmdId": `${timeToRequest}000000`,
            "time": timeToRequest,
            "deviceName": dataDevice.deviceName,
            "deviceOS": "android",
            "errorCode": 0,
            "errorDesc": "",
            "extra": {
                "checkSum": utilVsign.calculateCheckSum(currentAccount.phone, 'SOF_LIST_MANAGER_MSG', timeToRequest, currentAccount.setupKey),
            },
            "lang": "vi",
            "user": currentAccount.phone,
            "msgType": "SOF_LIST_MANAGER_MSG",
            "momoMsg": {
                "phone": currentAccount.phone,
                "_class": "mservice.backend.entity.msg.ListDefaultMoneyMsg",
            },
            "pass": "",
        }

        const resultMoMo = await this.doRequestEncryptMoMo(BALANCE, body, currentAccount, "SOF_LIST_MANAGER_MSG", {agentid: currentAccount.agentId, secureid: dataDevice.secureId, devicecode: dataDevice.deviceCode, phone: currentAccount.phone});

        if (resultMoMo.errorCode === 0) {
            const momoWaller = _.find(_.get(resultMoMo, 'momoMsg.sofInfo'), (a) => a.type === 1);
            await momoModel.findOneAndUpdate({phone}, {
                $set: {
                    balance: returnSofInfo ? resultMoMo.momoMsg.sofInfo : parseInt(momoWaller?.balance)
                },
            }, {upsert: true})

            return {
                success: true,
                balance: momoWaller?.balance,
                message: 'Số dư tài khoản là ' + parseInt(momoWaller?.balance)
            };
        }
        return -1;

    } catch (e) {
        console.log('Có lỗi xảy ra khi gọi API momo BALANCE_MSG', e);
        return {
            success: false,
            message: 'Có lỗi xảy ra khi gọi API momo BALANCE_MSG',
        }
    }
}

exports.isJwtExpired = async (token) => {
// Decode the token without verifying the signature
    const decoded = await jwt.decode(token, {complete: true});

    if (!decoded) {
        throw new Error('Invalid token');
    }

    const exp = decoded.payload.exp;

    if (!exp) {
        throw new Error('Token does not contain exp claim');
    }

    const now = Math.floor(Date.now() / 1000); // Current time in seconds

    return now >= exp;
}

exports.checkSession = async (phone, refresh = false) => {
    const dataPhone = await momoModel.findOne({phone, accessToken: {$exists: true}});

    if (!dataPhone) {
        return ({
            success: false,
            message: 'Không tìm thấy dữ liệu số điện thoại này hoặc lỗi'
        })
    }

    try {
        if (this.isJwtExpired(dataPhone.accessToken)) {
            return ({
                success: true,
                message: 'Session is vaild',
                data: dataPhone
            });
        } else {
            await this.refreshToken(phone);
        }
    } catch (error) {

        console.error('Error checking token:', error.message);
    }
}

exports.setupNoti = async (phone) => {
    try {

        const dataPhone = await momoModel.findOne({phone}).lean();

        const decodedData = this.decodeData(dataPhone.accessToken);
        console.log(decodedData);

        if (!decodedData) {
            return {
                success: false,
                message: 'Token không hợp lệ!'
            }
        }

        if (decodedData.agent_id && decodedData.imei && decodedData.user) {
            if (decodedData.exp < Math.floor(Date.now() / 1000)) {
                console.log('Token hết hạn');
                return {
                    success: false,
                    message: 'Token hết hạn'
                }
                return res.status(400).send({message: 'Token hết hạn'})
            }
        }


    } catch (err) {

    }
}

exports.decodeData = (token) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace('-', '+').replace('_', '/');
        return JSON.parse(Buffer.from(base64, 'base64').toString('binary'));
    } catch (error) {
        return null;
    }
}

exports.loginBusiness = async (phone) => {
    try {

        const momoData = await momoModel.findOne({phone}).lean();

        if (!momoData) {
            return {
                success: false,
                message: 'Đăng nhập momo business thất bại!',
            }
        }

        const options = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://business.momo.vn/api/authentication/login?language=vi',
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'vi,vi-VN;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5',
                // 'Authorization': `Bearer ${token}`,
                'Connection': 'keep-alive',
                // 'Referer': 'https://business.momo.vn/portal/onboard/merchants-choose',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                'X-API-REQUEST-ID': 'M4BWeb_1726594214004_0.3tfzcdecx6q',
                'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
            },
            data: {
                username: momoData.phone,
                password: momoData.passwordBusiness,
            }
        }

        const {data: response} = await axios(options);

        console.log(response);

        if (response.status === 0) {

            await momoModel.findOneAndUpdate({phone}, {
                $set: {
                    phone,
                    loginStatus: 'active',
                    accessTokenBusiness: response.data.token,
                }
            }, {upsert: true});

            return {
                success: true,
                message: 'Đăng nhập thành công!'
            }
        } else {
            await logHelper.create('momoLogin', `Đăng nhập business thất bại!\n* [ ${phone} ]\n* [ Có lỗi xảy ra ${response} ]`);
        }


    } catch (err) {
        console.log(err);
        await logHelper.create('momoLogin', `Đăng nhập business thất bại!\n* [ ${phone} ]\n* [ Có lỗi xảy ra ${err.message || err} ]`);
    }
}

exports.getMerchantsBusiness = async (phone) => {
    try {

        await this.loginBusiness(phone);

        const momoData = await momoModel.findOne({phone}).lean();

        if (!momoData) {
            return {
                success: false,
                message: 'Đăng nhập momo business thất bại!',
            }
        }

        const options = {
            method: 'get',
            maxBodyLength: Infinity,
            url: 'https://business.momo.vn/api/profile/v2/merchants?requestType=LOGIN_MERCHANTS&language=vi',
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'vi,vi-VN;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5',
                'Authorization': `Bearer ${momoData.accessTokenBusiness}`,
                'Connection': 'keep-alive',
                'Referer': 'https://business.momo.vn/portal/onboard/merchants-choose',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                'X-API-REQUEST-ID': 'M4BWeb_1726594214004_0.3tfzcdecx6q',
                'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
            }
        }

        const {data: response} = await axios(options);


        if (response.status === 0) {

            for (let i = 0; i < response.data.merchantResponseList.length; i++) {

                await momoModel.findOneAndUpdate({phone}, {
                    $set: {
                        phone,
                        typeBusiness: response.data.merchantResponseList[i].type,
                        businessForms: response.data.merchantResponseList[i].businessForms,
                        merchantId: response.data.merchantResponseList[i].id,
                        brandName: response.data.merchantResponseList[i].brandName
                    }
                }, {upsert: true});
            }

            return {
                success: false,
                message: 'Lấy merchant thành công!'
            }
        } else {
            await logHelper.create('momoLogin', `Lấy merchant business thất bại!\n* [ ${phone} ]\n* [ Có lỗi xảy ra ${response} ]`);
            return {
                success: false,
                message: 'Lấy merchant thất bại!'
            }
        }


    } catch (err) {
        console.log(err);
        await logHelper.create('momoLogin', `Lấy merchant business thất bại!\n* [ ${phone} ]\n* [ Có lỗi xảy ra ${err.message || err} ]`);
    }
}

exports.getInfoBusiness = async (phone) => {
    try {

        await this.getMerchantsBusiness(phone);

        const momoData = await momoModel.findOne({phone}).lean();

        if (!momoData) {
            return {
                success: false,
                message: 'Đăng nhập momo business thất bại!',
            }
        }

        const options = {
            method: 'get',
            maxBodyLength: Infinity,
            url: 'https://business.momo.vn/api/profile/v2/merchants/' + momoData.merchantId + '?language=vi',
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'vi,vi-VN;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5',
                'Authorization': `Bearer ${momoData.accessTokenBusiness}`,
                'Connection': 'keep-alive',
                'Referer': 'https://business.momo.vn/portal/onboard/merchants-choose',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                'X-API-REQUEST-ID': 'M4BWeb_1726594214004_0.3tfzcdecx6q',
                'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
            }
        }

        const {data: response} = await axios(options);


        if (response.status === 0) {

            for (let i = 0; i < response.data.stores.length; i++) {

                await momoModel.findOneAndUpdate({phone}, {
                    $set: {
                        phone,
                        storeId: response.data.stores[i].id
                    }
                }, {upsert: true});
            }

            return {
                success: false,
                message: 'Lấy merchant thành công!'
            }
        } else {
            await logHelper.create('momoLogin', `Lấy merchant business thất bại!\n* [ ${phone} ]\n* [ Có lỗi xảy ra ${response} ]`);
            return {
                success: false,
                message: 'Lấy merchant thất bại!'
            }
        }


    } catch (err) {
        console.log(err);
        await logHelper.create('momoLogin', `Lấy merchant business thất bại!\n* [ ${phone} ]\n* [ Có lỗi xảy ra ${err.message || err} ]`);
    }
}

exports.getQrBusiness = async (phone) => {
    try {

        await this.getInfoBusiness(phone);

        const momoData = await momoModel.findOne({phone}).lean();

        if (!momoData) {
            return {
                success: false,
                message: 'Đăng nhập momo business thất bại!',
            }
        }

        const options = {
            method: 'get',
            maxBodyLength: Infinity,
            url: 'https://business.momo.vn/api/qr-code/v1/stores/' + momoData.storeId + '/qr-codes?language=vi',
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'vi,vi-VN;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5',
                'Authorization': `Bearer ${momoData.accessTokenBusiness}`,
                'Connection': 'keep-alive',
                'Referer': 'https://business.momo.vn/portal/app/offline-stores',
                'Sec-Fetch-Dest': 'empty',
                'MerchantId': `${momoData.merchantId}`,
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                'X-API-REQUEST-ID': 'M4BWeb_1726594214004_0.3tfzcdecx6q',
                'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
            }
        }

        const {data: response} = await axios(options);

        if (response.status === 0) {

            await momoModel.findOneAndUpdate({phone}, {
                $set: {
                    phone,
                    qrCode: response.data.emvco,
                    baseQr: response.data.base64Data
                }
            }, {upsert: true});

            return {
                success: true,
                message: 'Lấy qr thành công!'
            }
        } else {
            await logHelper.create('momoLogin', `Lấy qr business thất bại!\n* [ ${phone} ]\n* [ Có lỗi xảy ra ${response} ]`);
            return {
                success: false,
                message: 'Lấy qr thất bại!'
            }
        }


    } catch (err) {
        console.log(err);
        await logHelper.create('momoLogin', `Lấy qr business thất bại!\n* [ ${phone} ]\n* [ Có lỗi xảy ra ${err.message || err} ]`);
        return {
            success: false,
            message: 'Lấy qr thất bại!'
        }
    }
}

exports.getHistoryBusiness = async (phone) => {
    try {

        const momoData = await momoModel.findOne({phone}).lean();

        if (!momoData) {
            return {
                success: false,
                message: 'Đăng nhập momo business thất bại!',
            }
        }

        const now = new Date();

        const dateString = now.toISOString().split('T')[0];

        const fromDate = `${dateString}T00:00:00.00`;
        const toDate = `${dateString}T23:59:59.00`;


        const options = {
            method: 'get',
            maxBodyLength: Infinity,
            url: 'https://business.momo.vn/api/transaction/v2/transactions?isDefaultSearchMode=true&pageSize=50&pageNumber=0&merchantId=' + momoData.merchantId + '&language=vi',
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'vi,vi-VN;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5',
                'Authorization': `Bearer ${momoData.accessTokenBusiness}`,
                'Connection': 'keep-alive',
                'MerchantId': `${momoData.merchantId}`,
                'Referer': 'https://business.momo.vn/portal/app/dashboard',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                'X-API-REQUEST-ID': 'M4BWeb_1726594214004_0.3tfzcdecx6q',
                'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
            }
        }

        const {data: response} = await axios(options);

        if (response.status === 0) {

            return {
                success: true,
                message: 'Lấy lịch sử thành công!',
                history: response.data.content
            }

        } else {
            await this.loginBusiness(phone);
            await logHelper.create('momoLogin', `Lấy lịch sử business thất bại!\n* [ ${phone} ]\n* [ Có lỗi xảy ra ${response} ]`);
            return {
                success: false,
                message: 'Lấy lịch sử business thất bại!',
            }
        }


    } catch (err) {
        console.log(err);
        await this.loginBusiness(phone);
        await logHelper.create('momoLogin', `Lấy lịch sử business thất bại!\n* [ ${phone} ]\n* [ Có lỗi xảy ra ${err.message || err} ]`);
    }
}

exports.getPayment = async (phone, transId) => {
    try {

        const momoData = await momoModel.findOne({phone}).lean();

        if (!momoData) {
            return {
                success: false,
                message: 'Đăng nhập momo business thất bại!',
            }
        }

        const now = new Date();

        const options = {
            method: 'get',
            maxBodyLength: Infinity,
            url: 'https://business.momo.vn/api/transaction/v2/transactions/PAYMENT-' + transId + '?language=vi',
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'vi,vi-VN;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5',
                'Authorization': `Bearer ${momoData.accessTokenBusiness}`,
                'Connection': 'keep-alive',
                'MerchantId': `${momoData.merchantId}`,
                // 'Referer': 'https://business.momo.vn/portal/app/dashboard',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                'X-API-REQUEST-ID': 'M4BWeb_1726594214004_0.3tfzcdecx6q',
                'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
            }
        }

        const {data: response} = await axios(options);

        console.log(response);

        return response;

        // if (response.status === 0) {
        //
        //     return {
        //         success: true,
        //         message: 'Lấy lịch sử thành công!',
        //         history: response.data.content
        //     }
        //
        // } else {
        //     await this.loginBusiness(phone);
        //     await logHelper.create('momoLogin', `Lấy lịch sử business thất bại!\n* [ ${phone} ]\n* [ Có lỗi xảy ra ${response} ]`);
        //     return {
        //         success: false,
        //         message: 'Lấy lịch sử business thất bại!',
        //     }
        // }


    } catch (err) {
        console.log(err);
        await this.loginBusiness(phone);
        await logHelper.create('momoLogin', `Lấy lịch sử business thất bại!\n* [ ${phone} ]\n* [ Có lỗi xảy ra ${err.message || err} ]`);
    }
}

exports.checkName = async (phone, receiver) => {
    try {
        const times = new Date().getTime();
        const checkSession = await this.checkSession(phone);

        if (!checkSession.success) {
            return checkSession;
        }

        const currentAccount = checkSession.data;

        const dataDevice = JSON.parse(currentAccount.dataDevice);
        const timeToRequest = Date.now();

        const body = {
            "appCode": process.env.appCode,
            "appId": "vn.momo.transfer",
            "appVer": process.env.appVer,
            "buildNumber": 9968,
            "channel": "APP",
            "cmdId": `${timeToRequest}000000`,
            "time": timeToRequest,
            "deviceName": dataDevice.deviceName,
            "deviceOS": "android",
            "errorCode": 0,
            "errorDesc": "",
            "extra": {"checkSum": utilVsign.calculateCheckSum(currentAccount.phone, 'FIND_RECEIVER_PROFILE', timeToRequest, currentAccount.setupKey)},
            "lang": "vi",
            "user": currentAccount.phone,
            "msgType": "FIND_RECEIVER_PROFILE",
            "momoMsg": {
                "callerId": "FE_transfer_p2b",
                "targetUserId": receiver,
                "_class": "mservice.backend.entity.msg.ForwardMsg",
                "fieldNames": ["userId", "agentId", "name", "avatarUrl", "isShop", "passTT23"],
            },
            "pass": "",
        }

        const resultMoMo = await this.doRequestEncryptMoMo('https://owa.momo.vn/api/FIND_RECEIVER_PROFILE', body, currentAccount, "FIND_RECEIVER_PROFILE")

        return _.get(resultMoMo, 'momoMsg.receiverProfile');
    } catch (err) {
        await momoModel.findOneAndUpdate({phone}, {$set: {description: 'FIND_RECEIVER_PROFILE| Có lỗi xảy ra ' + err.message || err}})
        return ({
            success: false,
            message: 'Có lỗi xảy ra ' + err.message || err
        })
    }
}

exports.M2MU_INIT = async (phone, dataTransfer) => {
    try {
        const timeToRequest = Date.now();
        const checkSession = await this.checkSession(phone);

        if (!checkSession.success) {
            return checkSession;
        }

        const currentAccount = checkSession.data;

        const profile = await this.checkName(currentAccount, dataTransfer.receiver);
        if (!profile) {
            return {
                message: 'Người dùng MoMo nhận tiền không tồn tại.',
                success: false,
            }
        }

        const {agentId, name} = profile;

        const dataDevice = JSON.parse(currentAccount.dataDevice);

        const initBody = {
            "appCode": process.env.appCode,
            "appId": "vn.momo.payment",
            "appVer": process.env.appVer,
            "buildNumber": 3791,
            "channel": "APP",
            "cmdId": `${timeToRequest}000000`,
            "time": timeToRequest,
            "deviceName": dataDevice.deviceName,
            "deviceOS": "android",
            "errorCode": 0,
            "errorDesc": "",
            "extra": {"checkSum": utilVsign.calculateCheckSum(currentAccount.phone, 'M2MU_INIT', timeToRequest, currentAccount.setupKey)},
            "lang": "vi",
            "user": currentAccount.phone,
            "msgType": "M2MU_INIT",
            "momoMsg": {
                "tranType": 2018,
                "tranList": [{
                    "themeUrl": "https://img.mservice.com.vn/app/img/transfer/theme/trasua-750x260.png",
                    "stickers": "",
                    "partnerName": name,
                    "serviceId": "transfer_p2p",
                    "originalAmount": dataTransfer.amount,
                    "receiverType": 1,
                    "partnerId": dataTransfer.phone,
                    "serviceCode": "transfer_p2p",
                    "_class": "mservice.backend.entity.msg.M2MUInitMsg",
                    "tranType": 2018,
                    "comment": dataTransfer.comment,
                    "moneySource": 1,
                    "partnerCode": "momo",
                    "rowCardId": null,
                    "sourceToken": "SOF-1",
                    "extras": "{\"avatarUrl\":\"\",\"aliasName\":\"\",\"appSendChat\":false,\"stickers\":\"\",\"themeId\":261,\"source\":\"search_p2p\",\"expenseCategory\":\"16\",\"categoryName\":\"Cà phê, đồ uống khác\",\"agentId\":" + agentId + ",\"bankCustomerId\":\"\"}",
                }],
                "clientTime": Date.now(),
                "serviceId": "transfer_p2p",
                "_class": "mservice.backend.entity.msg.M2MUInitMsg",
                "defaultMoneySource": 1,
                "sourceToken": "SOF-1",
                "giftId": "",
                "useVoucher": 0,
                "discountCode": null,
                "prepaidIds": "",
                "usePrepaid": 0,
            },
            "pass": "",
        }

        const resultMoMo = await this.doRequestEncryptMoMo('https://owa.momo.vn/api/M2MU_INIT', initBody, currentAccount, "M2MU_INIT")

        return resultMoMo;

    } catch (err) {
        await momoModel.findOneAndUpdate({phone}, {$set: {description: 'M2MU_INIT| Có lỗi xảy ra ' + err.message || err}})
        return ({
            success: false,
            message: 'Có lỗi xảy ra ' + err.message || err
        })
    }
}

exports.moneyTransfer = async (phone, dataTransfer) => {
    try {
        // phone, amount, comment
        console.log(dataTransfer);
        const timeToRequest = Date.now();
        const checkSession = await this.checkSession(phone);

        if (!checkSession.success) {
            return {
                success: false,
                message: 'Thực hiện lấy lại accessToken',
            };
        }

        const currentAccount = checkSession.data;
        const dataDevice = JSON.parse(currentAccount.dataDevice);
        const checkBalance = await this.balance(phone);

        if (!checkBalance.success) {
            return checkBalance;
        }

        if (checkBalance.balance < dataTransfer.amount) {
            return ({
                success: false,
                message: `Số dư ${phone} không đủ ${Intl.NumberFormat('en-US').format(dataTransfer.amount)}đ để chuyển khoản!`
            })
        }

        const init = await this.M2MU_INIT(phone, dataTransfer);
        console.log('Ket qua tao phien chuyen tien', init);

        if (_.get(init, 'result') && _.get(init, 'momoMsg.replyMsgs.0')) {
            // confirm giao dịch
            const confirmId = _.get(init, 'momoMsg.replyMsgs.0.id');
            const transId = _.get(init, 'momoMsg.replyMsgs.0.transId');
            console.log('Confirming transaction', transId, 'with ID', confirmId);

            const confirmBody = {
                "appCode": process.env.appCode,
                "appId": "vn.momo.payment",
                "appVer": process.env.appVer,
                "buildNumber": 3791,
                "channel": "APP",
                "cmdId": `${timeToRequest}000000`,
                "time": timeToRequest,
                "deviceName": dataDevice.deviceName,
                "deviceOS": "android",
                "errorCode": 0,
                "errorDesc": "",
                "extra": {"checkSum": utilVsign.calculateCheckSum(currentAccount.phone, 'M2MU_CONFIRM', timeToRequest, currentAccount.setupKey)},
                "lang": "vi",
                "user": currentAccount.phone,
                "msgType": "M2MU_CONFIRM",
                "momoMsg": {
                    "otpType": "NA",
                    "ipAddress": "N/A",
                    "enableOptions": {"voucher": true, "discount": false, "prepaid": false, "desc": ""},
                    "_class": "mservice.backend.entity.msg.M2MUConfirmMsg",
                    "quantity": 1,
                    "idFirstReplyMsg": confirmId,
                    "isOtp": false,
                    "moneySource": 1,
                    "sourceToken": "SOF-1",
                    "desc": "Thành công",
                    "error": 0,
                    "tranType": 2018,
                    "serviceId": "transfer_p2p",
                    "ids": [confirmId],
                    "amount": dataTransfer.amount,
                    "originalAmount": dataTransfer.amount,
                    "fee": 0,
                    "otp": "",
                    "extras": "{}",
                },
                "pass": currentAccount.password,
            }

            const resultTransfer = await this.doRequestEncryptMoMo('https://owa.momo.vn/api/M2MU_CONFIRM', confirmBody, currentAccount, "M2MU_CONFIRM")

            console.log('Ket qua chuyen tien', resultTransfer);

            if (resultTransfer.result) {

                let balanceNew = await this.balance(phone);

                await momoModel.findOneAndUpdate({phone}, {balance: balanceNew.balance});
                await new transferModel({
                    transId: resultTransfer.momoMsg.replyMsgs[0].transId,
                    phone,
                    receiver: dataTransfer.phone,
                    firstMoney: checkBalance.balance,
                    lastMoney: balanceNew.balance,
                    amount: dataTransfer.amount,
                    comment: dataTransfer.comment
                }).save();

                return {
                    success: true,
                    message: 'Chuyển tiền thành công!',
                    data: {
                        transId: resultTransfer.momoMsg.replyMsgs[0].transId,
                        phone,
                        firstMoney: checkBalance.balance,
                        lastMoney: parseInt(balanceNew.balance),
                        dataTransfer,
                    }
                }
            } else {
                return {
                    success: false,
                    message: resultTransfer.errorDesc
                }
            }
        }

        if (init.errorDesc !== 'success') {
            return {
                success: false,
                message: init.errorDesc
            }
        }


    } catch (err) {
        await momoModel.findOneAndUpdate({phone}, {$set: {description: 'M2MU_CONFIRM| Có lỗi xảy ra ' + err.message || err}})
        return ({
            success: false,
            message: 'Có lỗi xảy ra ' + err.message || err
        })
    }
}

exports.getQR = async (phone) => {
    try {
        const currentAccount = await momoModel.findOne({phone: phone}).lean();
        const dataDevice = JSON.parse(currentAccount.dataDevice);
        const timeToRequest = Date.now();

        const body = {}

        const resultMoMo = await this.doRequestEncryptMoMo("https://api.momo.vn/p2p/gateway/user-setting/GET_AIO_QR_INFO", body, currentAccount, "GET_AIO_QR_INFO", {agentid: currentAccount.agentId, secureid: dataDevice.secureId, devicecode: dataDevice.deviceCode, phone: currentAccount.phone})

        if (resultMoMo.success) {
            await momoModel.findOneAndUpdate({phone}, {$set: {accountNumber: resultMoMo.data.accountNumber, accountName: resultMoMo.data.accountName}})
            return {
                success: true,
                message: 'Lấy thành công [ ' + resultMoMo.data.bankName + ' - ' + resultMoMo.data.accountName + ' - ' + resultMoMo.data.accountNumber + ' ]',
                data: resultMoMo.data
            };
        }

        return {
            success: false,
            message: resultMoMo.errorCode
        };
    } catch (err) {
        await momoModel.findOneAndUpdate({phone}, {$set: {description: 'GET QR BANK| Có lỗi xảy ra ' + err.message || err}})
        return ({
            success: false,
            message: 'Có lỗi xảy ra ' + err.message || err
        })
    }
}

exports.findBankAccount = async (phone, dataTransfer) => {
    try {
        const checkSession = await this.checkSession(phone);

        if (!checkSession.success) {
            return {
                success: false,
                message: 'Thực hiện lấy lại accessToken',
            };
        }

        const currentAccount = checkSession.data;
        const dataDevice = JSON.parse(currentAccount.dataDevice);

        const listBankFound = _.find(utilVsign.BANK_LIST, (a) => a.bankCode === dataTransfer.bankCode);
        if (!listBankFound) {
            return {
                message: 'Ngân hàng nhận không hỗ trợ.',
                success: false,
            }
        }

        const randomRequestId = utilVsign.generateRandomString(32, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVXZ');
        let data = JSON.stringify({
            "appCode": process.env.APP_CODE,
            "appId": "vn.momo.bank",
            "appVer": process.env.APP_VER,
            "buildNumber": 0,
            "channel": "APP",
            "lang": "vi",
            "deviceName": dataDevice.deviceName,
            "deviceOS": "android",
            "requestId": randomRequestId,
            "agent": "0929003157",
            "agentId": 103308183,
            "coreBankCode": "2001",
            "serviceId": "2001",
            "transHisServiceId": "transfer_p2b",
            "benfAccount": {
                "accId": dataTransfer.accountNumber,
                "napasBank": {
                    "bankCode": listBankFound.bankCode,
                    "bankName": listBankFound.displayName,
                },
                "nickName": "",
                "sessionId": "",
                "accountName": ""
            },
            "msgType": "CheckAccountRequestMsg",
            "paymentChannel": "bank_popular",
            "typeQR": ""
        });

        // console.log('body la', body);

        // const { vsign, tbid, vts, vcs, vversion, ftv, mtd, mky } = await this.getVSign(body, {agentid: currentAccount.agentId, secureid: dataDevice.secureId, devicecode: dataDevice.deviceCode, phone: currentAccount.phone});

        // const headers = {
        //     ...this.commonHeader,
        //     vsign,
        //     tbid,
        //     vts,
        //     vcs,
        //     vversion,
        //     ftv, mtd, mky,
        //     sessionkey: currentAccount.sessionKey,
        //     userid: currentAccount.phone,
        //     user_phone: currentAccount.phone,
        //     'platform-timestamp': Date.now(),
        //     'momo-session-key-tracking': currentAccount.momoSessionKeyTracking,
        //     'user-agent': `${currentAccount.userAgent}${currentAccount.agentId}`,
        //     Authorization: `Bearer ${currentAccount.accessToken}`,
        // }
        // console.log('Header là', headers);
        // momoData cần phải minify trước khi gửi lên momo, ở đây dùng trick JSON.parse(JSON.stringify(momoData))
        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://api.momo.vn/bank/check-account',
            headers: {
                'Host': 'api.momo.vn',
                'userId': currentAccount.phone,
                'app_code': process.env.APP_CODE,
                'user_phone': currentAccount.phone,
                'lang': 'vi',
                'app_version': process.env.APP_CODE,
                'channel': 'APP',
                'Authorization': `Bearer ${currentAccount.accessToken}`,
                'timezone': 'Asia/Ho_Chi_Minh',
                'env': 'production',
                'device_os': 'ANDROID',
                'http-process-timestamp': '1747766347548',
                'app_type': 'production',
                'Accept-Charset': 'UTF-8',
                'Accept': 'application/json',
                'Accept-Language': 'vi-VN,vi;q=0.9',
                'Content-Type': 'application/json'
            },
            data : data
        };

        const { data: response } = await axios(config);

        return response;
    } catch (err) {
        console.log(err);
        await momoModel.findOneAndUpdate({phone}, {$set: {description: 'CHECK_INFO_BANK| Có lỗi xảy ra ' + err.message || err}})
        return {
            message: 'Lỗi kiểm tra thông tin ngân hàng!',
            success: false,
        }
    }
}

exports.INIT_TOBANK = async (phone, dataTransfer) => {
    try {

        const currentAccount = await momoModel.findOne({ phone }).lean();
        const listBankFound = _.find(utilVsign.BANK_LIST, (a) => a.bankCode === dataTransfer.bankCode);
        if (!listBankFound) {
            return {
                message: 'Ngân hàng nhận không hỗ trợ.',
                success: false,
            }
        }
        // tìm user nhận
        const profile = await this.findBankAccount(phone, dataTransfer);
        if (profile.resultCode === -9999) {
            return {
                message: 'Số tài khoản nhận tiền không tồn tại.',
                success: false,
            }
        }

        const checkBalance = await this.balance(phone);

        if (!checkBalance.success) {
            return checkBalance;
        }

        if (checkBalance.balance < dataTransfer.amount) {
            return ({
                success: false,
                message: `Số dư ${phone} không đủ ${Intl.NumberFormat('en-US').format(dataTransfer.amount)}đ để chuyển khoản!`
            })
        }

        const bankName = listBankFound.displayName;
        const bankNameServer = listBankFound.bankName;
        const checkAccountRefNumber = _.get(profile, 'benfAccount.checkAccountRefNumber');
        const accountName = _.get(profile, 'benfAccount.accName');
        const logo = _.get(profile, 'data.contactInfo.logo');

        const bankData = {
            bankName,
            bankNameServer,
            checkAccountRefNumber,
            accountName,
            logo,
            ...dataTransfer
        }

        console.log(bankData);

        const result = await this.moneyTransferBank(phone, bankData);
        return result;

    } catch (err) {
        console.log(err);
        await momoModel.findOneAndUpdate({phone}, {$set: {description: 'INIT_TOBANK| Có lỗi xảy ra ' + err.message || err}})
        return {
            message: 'Xác nhận chuyển tiền thất bại!',
            success: false,
        }
    }
}

exports.moneyTransferBank = async (phone, dataTransfer) => {
    try {
        const currentAccount = await momoModel.findOne({ phone }).lean();

        const dataDevice = JSON.parse(currentAccount.dataDevice);
        const timeToRequest = Date.now();
        const {
            bankName,
            bankNameServer,
            checkAccountRefNumber,
            accountName,
            bankCode,
            accountNumber,
            comment,
            amount,
            logo,
        } = dataTransfer;


        const initBody = {
            "appCode": hardCodedAppCode,
            "appId": "vn.momo.payment",
            "appVer": hardCodedAppVer,
            "buildNumber": 3791,
            "channel": "APP",
            "cmdId": `${timeToRequest}000000`,
            "time": timeToRequest,
            "deviceName": dataDevice.deviceName,
            "deviceOS": "android",
            "errorCode": 0,
            "errorDesc": "",
            "extra": {
                "checkSum": utilVsign.calculateCheckSum(currentAccount.phone, 'TRAN_HIS_INIT_MSG', timeToRequest, currentAccount.setupKey),
            },
            "lang": "vi",
            "user": currentAccount.phone,
            "msgType": "TRAN_HIS_INIT_MSG",
            "momoMsg": {
                "tranType": 8,
                "clientTime": Date.now(),
                "extras": JSON.stringify({
                    "saveCard": false,
                    "bankNumber": accountNumber,
                    "bankName": bankName,
                    "benfPhoneNumberInput": checkAccountRefNumber,
                    "checkFeeCacheRefNumber": "",
                    "bankLogo": {
                        "uri": "https://api.vietqr.io/img/TCB.png",
                    },
                    "receiverName": accountName,
                    "nickName": "",
                    "themeP2P": "default",
                    "informCardSOF": {
                        "refId": "funds_manager",
                        "ctaTitle": "Thử ngay",
                        "isShow": true,
                        "title": "Thiết lập tài khoản ưu tiên",
                        "description": "Bạn sẽ không cần mất thời gian kiểm tra, lựa chọn tài khoản mỗi khi chuyển tiền/thanh toán.",
                    },
                    "renderType": "REFERRAL_BANNER",
                    "source": "bank_list",
                    "paymentChannel": "bank_list",
                    "categoryId": null,
                    "categoryGroupName": "",
                    "receiverNumber": "",
                    "receiverId": "",
                    "beneficialId": accountNumber,
                    "enableCheckPayLaterVietQr": false,
                    "bankCustomerId": "",
                }),
                "comment": comment,
                "partnerRef": "",
                "serviceId": "transfer_p2b",
                "partnerName": bankNameServer,
                "rowCardNum": accountNumber,
                "amount": amount,
                "ownerName": accountName,
                "_class": "mservice.backend.entity.msg.TranHisMsg",
                "partnerId": bankCode,
                "serviceCode": "transfer_p2b",
                "moneySource": 1,
                "defaultMoneySource": 1,
                "sourceToken": "SOF-1",
                "partnerCode": "momo",
                "rowCardId": "",
                "giftId": "",
                "useVoucher": 0,
                "discountCode": null,
                "prepaidIds": "",
                "usePrepaid": 0,
            },
            "pass": "",
        }

        const result = await this.doRequestEncryptMoMo(TRAN_HIS_INIT_MSG, initBody, currentAccount, "TRAN_HIS_INIT_MSG", {agentid: currentAccount.agentId, secureid: dataDevice.secureId, devicecode: dataDevice.deviceCode, phone: currentAccount.phone})
        console.log(result);
        if (result.errorCode === '-818') {
            await this.verifyTransferBank(phone, dataTransfer);
            await Promise.delay(1000);
            await this.INIT_TOBANK(phone, dataTransfer);
        }

        if (_.get(result, 'result')) {

            // confirm giao dịch
            const confirmId = _.get(result, 'momoMsg.tranHisMsg.ID');
            const transId = _.get(result, 'momoMsg.tranHisMsg.tranId');
            console.log('Confirming transaction', transId, 'with ID', confirmId);
            const confirmResult = await this.confirmMoMoToBank(phone, result.momoMsg.tranHisMsg, dataTransfer.amount, confirmId);
            if (confirmResult.success) {
                return confirmResult;
            } else {
                // console.log(confirmResult);

                const riskId = confirmResult.momoMsg.tranHisMsg.ID;
                const {otpValue} = await this.getSmartOTP(phone, riskId);
                console.log('riskID', riskId, 'otp is', otpValue);

                const authFaceJwt = _.get(confirmResult, 'riskMsg.token')

                const { data: result1 } = await axios.post(MOMO_VERIFY_SMARTOTP_LINK, {
                        "msgType": "VERIFY_SMART_OTP_MSG",
                        "cmdId": `${Date.now()}000000`,
                        "otpValue": otpValue}, {
                        headers: {
                            ...this.commonHeader,
                            sessionkey: currentAccount.sessionKey,
                            userid: currentAccount.phone,
                            user_phone: currentAccount.phone,
                            'platform-timestamp': Date.now(),
                            'momo-session-key-tracking': currentAccount.momoSessionKeyTracking,
                            'user-agent': `${currentAccount.userAgent}${currentAccount.agentId}`,
                            Authorization: authFaceJwt
                        }

                    },
                );
                console.log(result1);
                await Promise.delay(2000);

                const confirmResult1 = await this.confirmMoMoToBank(phone, result.momoMsg.tranHisMsg, amount, confirmId);

                console.log(confirmResult1)

                return confirmResult1;

            }
        }

    } catch (err) {
        console.log(err);
        await momoModel.findOneAndUpdate({phone}, {$set: {description: 'CONFIRM_TRANSFER_BANK| Có lỗi xảy ra ' + err.message || err}})
        return {
            message: 'Chuyển tiền thất bại!',
            success: false,
        }
    }
}

exports.verifyTransferBank = async (phone, dataTransfer) => {

    const currentAccount = checkSession.data;
    const dataDevice = JSON.parse(currentAccount.dataDevice);

    const listBankFound = _.find(utilVsign.BANK_LIST, (a) => a.bankCode === dataTransfer.bankCode);
    if (!listBankFound) {
        return {
            message: 'Ngân hàng nhận không hỗ trợ.',
            success: false,
        }
    }

    const randomRequestId = utilVsign.generateRandomString(13, '0123456789');
    let data = JSON.stringify({
        "appCode": process.env.APP_CODE,
        "appId": "vn.momo.bank",
        "appVer": process.env.APP_VER,
        "buildNumber": 0,
        "channel": "APP",
        "lang": "vi",
        "deviceName": dataDevice.deviceName,
        "deviceOS": "android",
        "requestId": randomRequestId,
        "partnerId": `w2b_${dataTransfer.accountNumber}_${dataTransfer.bankCode}`
    });


    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://api.momo.vn/transhis/api/transhis/recent-amount-partner',
        headers: {
            'Host': 'api.momo.vn',
            'userId': currentAccount.phone,
            'app_code': process.env.APP_CODE,
            'user_phone': currentAccount.phone,
            'lang': 'vi',
            'app_version': process.env.APP_CODE,
            'channel': 'APP',
            'Authorization': `Bearer ${currentAccount.accessToken}`,
            'timezone': 'Asia/Ho_Chi_Minh',
            'env': 'production',
            'device_os': 'ANDROID',
            'http-process-timestamp': '1747766347548',
            'app_type': 'production',
            'Accept-Charset': 'UTF-8',
            'Accept': 'application/json',
            'Accept-Language': 'vi-VN,vi;q=0.9',
            'Content-Type': 'application/json'
        },
        data : data
    };

    const { data: response } = await axios(config);

    return response;
}


exports.confirmMoMoToBank = async (phone, initTransHisMsg, amount, confirmId) => {
    const currentAccount = await momoModel.findOne({ phone }).lean();

    const dataDevice = JSON.parse(currentAccount.dataDevice);
    const timeToRequest = Date.now();

    const confirmBody = {
        "appCode": hardCodedAppCode,
        "appId": "vn.momo.payment",
        "appVer": hardCodedAppVer,
        "buildNumber": 3791,
        "channel": "APP",
        "cmdId": `${timeToRequest}000000`,
        "time": timeToRequest,
        "deviceName": dataDevice.deviceName,
        "deviceOS": "android",
        "errorCode": 0,
        "errorDesc": "",
        "extra": { "checkSum": utilVsign.calculateCheckSum(currentAccount.phone, 'TRAN_HIS_CONFIRM_MSG', timeToRequest, currentAccount.setupKey) },
        "lang": "vi",
        "user": currentAccount.phone,
        "msgType": "TRAN_HIS_CONFIRM_MSG",
        "momoMsg": {
            ...initTransHisMsg,
            "otp": "",
        },
        "pass": currentAccount.pin || currentAccount.password,
    }


    const resultMoMo = await this.doRequestEncryptMoMo(TRAN_HIS_CONFIRM_MSG, confirmBody, currentAccount, "TRAN_HIS_CONFIRM_MSG",{agentid: currentAccount.agentId, secureid: dataDevice.secureId, devicecode: dataDevice.deviceCode, phone: currentAccount.phone})

    console.log(resultMoMo);

    if (resultMoMo.result) {

        // return _.get(confirmResult, 'momoMsg.tranHisMsg')
        // await momoModel.findOneAndUpdate({phone}, {balance: }balance);
        // await new transferModel({
        //     transId: confirmResult.momoMsg.transId,
        //     phone,
        //     receiver: dataTransfer.bankAccountNumber + ' | ' + dataTransfer.bankCode,
        //     firstMoney: checkBalance.balance,
        //     lastMoney: confirmResult.momoMsg.tranHisMsg.originalAmount,
        //     amount: dataTransfer.amount,
        //     comment: dataTransfer.comment
        // }).save();

        return {
            success: true,
            message: 'Chuyển tiền thành công! ' + resultMoMo.momoMsg.transId,
            data: {
                transId: resultMoMo.momoMsg.transId,
                phone,
            }
        }

    } else {
        return resultMoMo
    }

}

exports.getSmartOTP = async (phone, transactionId) => {
    try {
        const { data: result } = await axios.post(SMART_GETOTP_LINK, {
            "phone": phone,
            "transactionId": transactionId
        }, {
            headers: {
                key: process.env.VSIGN_APIKEY,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 Edg/117.0.2045.31',
                version: APP_CODE,
            },
            timeout: 10000,
        });
        return result;
    } catch (e) {
        console.log('Có lỗi khi đăng kí smart otp', e);
        return ''
    }
}

exports.getDetails = async (phone, transId, serviceId) => {
    try {
        const currentAccount = await momoModel.findOne({phone}).lean();

        const dataDevice = JSON.parse(currentAccount.dataDevice);
        const timeToRequest = Date.now();

        const body = {
            "appCode": process.env.appCode,
            "appId": "vn.momo.transactionhistory",
            "appVer": process.env.appVer,
            "buildNumber": 9863,
            "channel": "transaction_app",
            "lang": "vi",
            "deviceName": dataDevice.deviceName,
            "deviceOS": "android",
            "requestId": `${timeToRequest}`,
            "transId": transId,
            "serviceId": serviceId,
            "miniAppId": "vn.momo.transactionhistory",
        }


        const response = await this.doRequestEncryptMoMo('https://api.momo.vn/transhis/api/transhis/detail', body, currentAccount);

        console.log(response);

        if (response.resultCode != 0 || response.momoMsg.status == 6) {
            return ({
                success: false,
                message: `Không tìm thấy chi tiết lịch sử #${transId}!`
            })
        }

        let comment = response.momoMsg.serviceData ? JSON.parse(response.momoMsg.serviceData).COMMENT_VALUE : (response.momoMsg.oldData ? JSON.parse(response.momoMsg.oldData).commentValue : null);

        if (response.statusCode === 200) {
            return ({
                success: true,
                message: 'Lấy thành công!',
                data: {
                    io: response.momoMsg.io,
                    status: response.momoMsg.status,
                    phone,
                    transId: response.momoMsg.transId,
                    partnerId: response.momoMsg.sourceId,
                    partnerName: response.momoMsg.sourceName,
                    targetId: response.momoMsg.targetId,
                    targetName: response.momoMsg.targetName,
                    amount: response.momoMsg.totalOriginalAmount,
                    postBalance: response.momoMsg.postBalance,
                    comment,
                    time: response.momoMsg.lastUpdate,
                }
            })
        }
    } catch (err) {
        console.log(err);
        await momoModel.findOneAndUpdate({phone}, {$set: {description: 'getDetails| Có lỗi xảy ra ' + err.message || err}})
        return ({
            success: false,
            message: 'Có lỗi xảy ra ' + err.message || err
        })
    }
}
