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

        const newDevice = {
            "browserId": crypto.createHash('md5').update(bankData.username).digest('hex')
        }

        const bodyData = {
            "DT": "Windows",
            "OV": "10",
            "PM": "Edge 127.0.0.0",
            "E": "",
            "appVersion": "",
            "browserId": newDevice.browserId,
            "captchaToken": dataCaptcha.key,
            "captchaValue": dataCaptcha.captcha,
            "cif": "",
            "clientId": "",
            "mobileId": "",
            "lang": "vi",
            "mid": 6,
            "password": bankData.password,
            "user": bankData.username,
            "sessionId": ""
        }

        await bankModel.findOneAndUpdate({accountNumber, bankType}, {
            $set: {
                dataDevice: newDevice
            }
        }, {upsert: true})

        const result = await this.curlPost("https://digiapp.vietcombank.com.vn/authen-service/v1/login", bodyData);

        if (result.code == '20231' && result.mid == 6) {
            const checkBrowser = await this.checkBrowser(accountNumber, bankType, result.browserToken);

            console.log(checkBrowser);

            if (checkBrowser.code === 200) {

                const dataDevice = {
                    browserId: newDevice.browserId,
                    browserToken: checkBrowser.result.browserToken,
                    tranId: checkBrowser.result.tranId,
                    challenge: checkBrowser.result.challenge
                }

                await bankModel.findOneAndUpdate({accountNumber, bankType}, {
                    $set: {
                        status: 'pending',
                        loginStatus: 'waitOTP',
                        dataDevice
                    }
                }, {upsert: true})

                return {
                    otp: true,
                    success: true,
                    message: 'Đăng nhập thành công vui lòng nhập mã OTP'
                }
            }
        } else {

            const dataDevice = {
                ...bankData.dataDevice,
                session: {
                    sessionId: result.sessionId,
                    mobileId: result.userInfo.mobileId,
                    clientId: result.userInfo.clientId,
                    cif: result.userInfo.cif
                }
            }

            await bankModel.findOneAndUpdate({accountNumber, bankType}, {
                $set: {
                    dataDevice,
                    name: result.userInfo.cusName,
                    status: 'active',
                    loginStatus: 'active',
                }
            }, {upsert: true})

            return {
                success: true,
                message: 'Đăng nhập thành công!'
            }
        }

    } catch (e) {
        console.log(e);
        return {
            success: false,
            message: 'Đăng nhập thất bại'
        };
    }
};

exports.checkBrowser = async (accountNumber, bankType, browserToken, type = '1') => {
    try {
        const bankData = await bankModel.findOne({ accountNumber, bankType }).lean();

        const bodyData = {
            "DT": "Windows",
            "OV": "10",
            "PM": "Edge 127.0.0.0",
            "E": "",
            "browserId": bankData.dataDevice.browserId,
            "cif": "",
            "clientId": "",
            "mobileId": "",
            "lang": "vi",
            "mid": 3008,
            "user": bankData.username,
            "sessionId": "",
            browserToken
        }

        const result = await this.curlPost("https://digiapp.vietcombank.com.vn/authen-service/v1/api-3008", bodyData);

        if (result.transaction && result.transaction.tranId) {
            const types = result.transaction.listMethods || [];

            if (type == '5') {
                return await this.chooseOtpType(accountNumber, bankType, browserToken, result.transaction.tranId, '5');
            } else {
                return await this.chooseOtpType(accountNumber, bankType, browserToken, result.transaction.tranId, '1');
            }
        } else {
            return {
                code: 400,
                success: true,
                message: "checkBrowser failed",
                param: bodyData, // assumes param is in scope
                data: result || ""
            };
        }
    } catch (e) {
        console.log(e);
    }
}

exports.chooseOtpType = async (accountNumber, bankType, browserToken, tranID, type = '1') => {
    try {

        const bankData = await bankModel.findOne({ accountNumber, bankType }).lean();

        const bodyData = {
            "DT": "Windows",
            "OV": "10",
            "PM": "Edge 127.0.0.0",
            "E": "",
            "browserId": bankData.dataDevice.browserId,
            "lang": "vi",
            "appVersion": "",
            "mid": 3010,
            "cif": "",
            "clientId": "",
            "mobileId": "",
            "sessionId": "",
            "browserToken": browserToken,
            "tranId": tranID,
            "type": 1,
            "user": bankData.username
        }

        const result = await this.curlPost("https://digiapp.vietcombank.com.vn/authen-service/v1/api-3010", bodyData);

        if (result.code === "00") {
            return {
                code: 200,
                success: true,
                message: 'Thành công',
                result: {
                    browserToken: browserToken,
                    tranId: result.tranId || tranID,
                    challenge: result.challenge || ""
                },
                param: bodyData, // assumes param is defined in scope
                data: result || ""
            };
        } else {
            return {
                code: 400,
                success: false,
                message: result.des,
                param: bodyData,
                data: result || ""
            };
        }

    } catch (e) {
        console.log(e);
    }
};

exports.submitOtpSMS = async (accountNumber, bankType, otp) => {
    try {

        const bankData = await bankModel.findOne({ accountNumber, bankType }).lean();

        const bodyData = {
            "DT": "Windows",
            "OV": "10",
            "PM": "Edge 127.0.0.0",
            "E": "",
            "browserId": bankData.dataDevice.browserId,
            "lang": "vi",
            "mid": 3011,
            "appVersion": "",
            "cif": "",
            "clientId": "",
            "mobileId": "",
            "sessionId": "",
            "browserToken": bankData.dataDevice.browserToken,
            "tranId": bankData.dataDevice.tranId,
            "otp": otp,
            "user": bankData.username
        }

        const result = await this.curlPost("https://digiapp.vietcombank.com.vn/authen-service/v1/api-3011", bodyData);

        if (result.code === "00") {
            const dataDevice = {
                ...bankData.dataDevice,
                session: {
                    sessionId: result.sessionId,
                    mobileId: result.userInfo.mobileId,
                    clientId: result.userInfo.clientId,
                    cif: result.userInfo.cif
                }
            }

            await bankModel.findOneAndUpdate({accountNumber, bankType}, {
                $set: {
                    dataDevice,
                    status: 'active',
                    loginStatus: 'active',
                }
            }, {upsert: true})

            if (result.allowSave) {
                const sv = await this.saveBrowser(accountNumber, bankType); // assume async

                console.log('sv', sv);

                if (sv.code === "00") {
                    return {
                        code: 200,
                        success: true,
                        message: 'Thành công',
                        saved_browser: true,
                        d: sv,
                        session: dataDevice.session,
                        data: result || ""
                    };
                } else {
                    return {
                        code: 400,
                        success: false,
                        message: sv.des,
                        param: bodyData, // assumes param is defined
                        data: sv || ""
                    };
                }
            } else {
                return {
                    code: 200,
                    success: true,
                    message: 'Thành công',
                    saved_browser: false,
                    session: session,
                    data: result || ""
                };
            }

        } else {
            return {
                code: 500,
                success: false,
                message: result.des,
                param: bodyData, // assumes param is in scope
                data: result || ""
            };
        }

    } catch (e) {
        console.log(e);
    }
};

exports.saveBrowser = async (accountNumber, bankType) => {
    try {

        const bankData = await bankModel.findOne({ accountNumber, bankType }).lean();

        const bodyData = {
            "DT": "Windows",
            "OV": "10",
            "PM": "Edge 127.0.0.0",
            "E": "",
            "browserName": "Edge 127.0.0.0",
            "browserId": bankData.dataDevice.browserId,
            "lang": "vi",
            "mid": 3009,
            "cif": bankData.dataDevice.session.cif,
            "clientId": bankData.dataDevice.session.clientId,
            "mobileId": bankData.dataDevice.session.mobileId,
            "sessionId": bankData.dataDevice.session.sessionId,
            "user": bankData.username
        }

        const result = await this.curlPost("https://digiapp.vietcombank.com.vn/authen-service/v1/api-3009", bodyData);

        return result;

    } catch (e) {
        console.log(e);
    }
};

exports.encryptData = async (data) => {
    const urls = [
        'https://sodo666.vip/vietcombank/encrypt',
        'https://babygroupvip.com/vietcombank/encrypt',
        'https://vcbbiz2.pay2world.vip/vietcombank/encrypt'
    ];

    const payload = JSON.stringify(data);
    const headers = {
        'Content-Type': 'application/json'
    };

    for (let url of urls) {
        try {
            const response = await axios.post(url, payload, { headers, timeout: 10000 });

            // Skip on certain HTTP status codes
            if ([404, 502].includes(response.status)) {
                continue;
            }

            return response.data;
        } catch (err) {
            // Catch timeout or other failures, move to the next URL
            continue;
        }
    }

    return {}; // All failed
};

exports.decryptData = async (cipher) => {
    const urls = [
        'https://sodo666.vip/vietcombank/decrypt',
        'https://vcbcp1.pay2world.vip/vietcombank/decrypt',
        'https://vcbbiz2.pay2world.vip/vietcombank/decrypt'
    ];

    const payload = JSON.stringify(cipher);
    const headers = {
        'Content-Type': 'application/json'
    };

    for (let url of urls) {
        try {
            const response = await axios.post(url, payload, { headers, timeout: 10000 });

            // Skip bad responses
            if ([404, 502].includes(response.status)) {
                continue;
            }

            return response.data;
        } catch (err) {
            continue; // On error (timeout, server down), try the next one
        }
    }

    return {}; // All failed
};

exports.curlPost = async (url, data) => {
    const encryptedData = await this.encryptData(data); // You need to implement this
    console.log(encryptedData);

    const headers = {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'vi',
        'Connection': 'keep-alive',
        'Content-Type': 'application/json',
        'Host': 'digiapp.vietcombank.com.vn',
        'Origin': 'https://vcbdigibank.vietcombank.com.vn',
        'Referer': 'https://vcbdigibank.vietcombank.com.vn/',
        'sec-ch-ua-mobile': '?0',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
        'X-Channel': 'Web'
    };

    try {
        const response = await axios.post(url, encryptedData, { headers });
        const decrypted = await this.decryptData(response.data); // You need to implement this
        return decrypted;
    } catch (error) {
        console.error("Request failed:", error.response ? error.response.data : error.message);
        throw error;
    }
}

exports.initTransfer = async (accountNumber, bankType, dataTransfer) => {
    try {

        const bankData = await bankModel.findOne({accountNumber, bankType}).lean();

        const bodyData = {
            "DT": "Windows",
            "OV": "10",
            "PM": "Edge 127.0.0.0",
            "E": "",
            "browserName": "Edge 127.0.0.0",
            "browserId": bankData.dataDevice.browserId,
            "lang": "vi",
            "debitAccountNo": bankData.accountNumber,
            "creditAccountNo": dataTransfer.accountNumber,
            "creditBankCode": dataTransfer.bankCode,
            "amount": dataTransfer.amount,
            "feeType": 1,
            "content": dataTransfer.comment,
            "ccyType": "1",
            "mid": 62,
            "cif": bankData.dataDevice.session.cif,
            "user": bankData.username,
            "mobileId": bankData.dataDevice.session.mobileId,
            "clientId": bankData.dataDevice.session.clientId,
            "sessionId": bankData.dataDevice.session.sessionId
        }

        const result = await this.curlPost("https://digiapp.vietcombank.com.vn/napas-service/v1/get-channel-transfer-intersea", bodyData);

        console.log(result)

        if (resultDecode.code == '00') {
            await bankModel.findOneAndUpdate({accountNumber, bankType}, {
                $set: {
                    otpToken: resultDecode.data.otpToken,
                    transType: resultDecode.data.transType,
                    token: resultDecode.data.token,
                    accessToken: response.headers['authorization'],
                }
            }, {upsert: true})

            return {
                resultDecode,
                message: "Tạo đơn chuyển tiền thành công!",
                success: true
            }
        } else {
            return {
                message: resultDecode.des,
                success: false
            }
        }
    } catch (e) {
        console.log(e);
        return {
            success: false,
            message: 'Đăng nhập thất bại'
        };
    }
}

