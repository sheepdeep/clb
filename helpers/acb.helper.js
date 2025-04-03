const axios = require("axios");
const bankModel = require("../models/bank.model");
const {v4: uuidv4} = require("uuid");
const moment = require("moment/moment");
const {HttpsProxyAgent} = require("https-proxy-agent");

exports.login = async (accountNumber, bankType) => {
    try {
        const bankData = await bankModel.findOne({ accountNumber, bankType }).lean();

        // Giải captcha

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
        const {response: data} = await axios(config);

        console.log(data);

        if (resultDecode.code == '00') {

            await bankModel.findOneAndUpdate({ accountNumber, bankType }, {
                $set: {
                    name: resultDecode.data.name,
                    accountNumber,
                    bankType,
                    status: 'pending',
                    loginStatus: 'waitOTP',
                    otpToken: resultDecode.data.otpToken,
                    accessToken: response.headers['authorization'],
                    dataDevice,
                    otp: null,
                    reward: false
                }
            }, { upsert: true });

            return {
                message: "Thêm tài khoản thành công. Đang thực hiện lấy OTP xác thực!",
                success: true
            };
        } else {
            return {
                message: resultDecode.des,
                success: false
            };
        }
    } catch (e) {
        console.log(e);
        return {
            success: false,
            message: 'Đăng nhập thất bại'
        };
    }
};

