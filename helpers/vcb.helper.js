const axios = require('axios');
const crypto = require('crypto');
const bankModel = require("../models/bank.model");
const {v4: uuidv4} = require("uuid");
const moment = require("moment/moment");
const {HttpsProxyAgent} = require("https-proxy-agent");

exports.getCaptcha = async () => {
    try {

        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const captchaToken = Array.from({ length: 30 }, () =>
            characters.charAt(Math.floor(Math.random() * characters.length))
        ).join('');

        // Get captcha image
        const response = await axios.get(`https://digiapp.vietcombank.com.vn/utility-service/v1/captcha/${captchaToken}`, { responseType: 'arraybuffer' });

        // Convert image to base64
        const base64CaptchaImg = Buffer.from(response.data, 'binary').toString('base64');

        // Send base64 image to captcha-solving service
        const task = await this.createTaskCaptcha(base64CaptchaImg); // You’ll implement this

        // If the task returns JSON with a `captcha` field
        const captchaText = task.captcha;

        return {
            status: true,
            key: captchaToken,
            captcha: captchaText
        };

    } catch (e) {

    }
}

exports.createTaskCaptcha = async(base64Img) => {
    try {

        let config = {
            url: "http://103.72.96.214:8277/api/captcha/vietcombank",
            method: "POST",
            data: {
                base64: base64Img
            }
        };

        const {data: response} = await axios(config);

        console.log(response);

        return {
            captcha: response.captcha,
            captchaToken: base64Img
        }
    } catch(err) {
        console.log(err)
    }
};

exports.login = async (accountNumber, bankType) => {
    try {
        const bankData = await bankModel.findOne({ accountNumber, bankType }).lean();

        // Giải captcha
        const dataCaptcha = await this.getCaptcha();

        const bodyData = {
            "DT": self.DT,
            "OV": self.OV,
            "PM": self.PM,
            "appVersion": self.appVersion,

            "browserId": self.browserId,
            "captchaToken": solveCaptcha["key"],
            "captchaValue": solveCaptcha["captcha"],

            "cif": self.cif,
            "clientId": self.clientId,

            "mobileId": self.mobileId,
            "lang": self.lang,
            "mid": 6,
            "password": self.password,
            "user": self.username,
            "sessionId": self.sessionId

        }

        console.log(dataCaptcha);

    } catch (e) {
        console.log(e);
        return {
            success: false,
            message: 'Đăng nhập thất bại'
        };
    }
};
