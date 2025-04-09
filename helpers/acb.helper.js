const axios = require("axios");
const bankModel = require("../models/bank.model");
const {v4: uuidv4} = require("uuid");
const moment = require("moment/moment");
const {HttpsProxyAgent} = require("https-proxy-agent");
const crypto = require("crypto");
const {data} = require("express-session/session/cookie");

exports.login = async (accountNumber, bankType) => {
    try {
        const bankData = await bankModel.findOne({ accountNumber, bankType }).lean();

        // Giải captcha
        const headers = await this.headerDefault(null);

        const bodyData = {
            username: bankData.username,
            password: bankData.password,
            clientId: "iuSuHYVufIUuNIREV0FB9EoLn9kHsDbm"
        };

        // Kiểm tra proxy và tạo agent nếu cần thiết
        let agent;
        if (bankData.proxy) {
            const proxyUrl = `http://${bankData.proxy}`;
            agent = new HttpsProxyAgent(proxyUrl); // Sử dụng proxy nếu có
        }

        let config = {
            maxBodyLength: Infinity,
            url: "https://apiapp.acb.com.vn/mb/v2/auth/tokens",
            headers,
            method: "POST",
            data: bodyData,
        };

        // Nếu có proxy, thêm httpsAgent vào cấu hình
        if (agent) {
            config.httpsAgent = agent;
        }

        // Gửi yêu cầu POST
        const {data: response} = await axios(config);

        await bankModel.findOneAndUpdate({ accountNumber, bankType }, {
            $set: {
                name: response.identity.displayName,
                accountNumber,
                bankType,
                status: 'active',
                loginStatus: 'active',
                accessToken: response.accessToken,
                reward: false
            }
        }, { upsert: true });

        return {
            message: "Thêm tài khoản thành công.",
            success: true
        };
    } catch (e) {
        console.log(e);
        return {
            success: false,
            message: 'Đăng nhập thất bại'
        };
    }
};

exports.history = async (accountNumber, bankType) => {
    try {
        const bankData = await bankModel.findOne({ accountNumber, bankType }).lean();

        // Giải captcha
        const headers = await this.headerDefault({Authorization: `bearer ${bankData.accessToken}`})


        // Kiểm tra proxy và tạo agent nếu cần thiết
        let agent;
        if (bankData.proxy) {
            const proxyUrl = `http://${bankData.proxy}`;
            agent = new HttpsProxyAgent(proxyUrl); // Sử dụng proxy nếu có
        }

        let config = {
            maxBodyLength: Infinity,
            url: `https://apiapp.acb.com.vn/mb/legacy/ss/cs/bankservice/saving/tx-history?maxRows=50&account=${accountNumber}`,
            headers,
            method: "GET",
        };

        // Nếu có proxy, thêm httpsAgent vào cấu hình
        if (agent) {
            config.httpsAgent = agent;
        }

        // Gửi yêu cầu POST
        const {data: response} = await axios(config);

        return {
            message: 'Lấy lịch sử giao dịch thành công!',
            success: true,
            histories: response.data,
        }

    } catch (e) {
        console.log(e);

        // await this.login(accountNumber, bankType);
        return {
            success: false,
            message: 'Đăng nhập thất bại'
        };
    }
};

exports.headerDefault = async(headers = null) => {
    // Generate a random 15-character string
    const randomNumberString = () => crypto.randomBytes(8).toString('hex').slice(0, 15);

    const defaultHeaders = {
        'Content-Type': 'application/json; charset=utf-8',
        'Host': 'apiapp.acb.com.vn'
    };

    if (headers) {
        // Merge additional headers
        Object.assign(defaultHeaders, headers);
    }

    return defaultHeaders;
}
