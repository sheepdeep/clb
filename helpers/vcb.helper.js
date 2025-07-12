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
        const response = await axios.get(`https://digiapp.vietcombank.com.vn/utility-service/v2/captcha/MASS/${captchaToken}`, { responseType: 'arraybuffer' });

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
            url: "https://ecaptcha.sieuthicode.net/api/captcha/vcb",
            method: "POST",
            data: {
                api_key: 'ec7c869ea3d96b88df2a153e3cad7545',
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

        const dataCaptcha = await this.getCaptcha();

        const newDevice = {
            "browserId": crypto.createHash('md5').update(bankData.username).digest('hex')
        }

        const bodyData = {
            "DT": "Windows",
            "OV": "10",
            "PM": "Chrome 111.0.0.0",
            "E": this.getE() || "",
            "browserId": newDevice.browserId,
            "captchaToken": dataCaptcha.key,
            "captchaValue": dataCaptcha.captcha,
            "checkAcctPkg": "1",
            "lang": "vi",
            "mid": 6,
            "password": bankData.password,
            "user": bankData.username,
        }

        await bankModel.findOneAndUpdate({accountNumber, bankType}, {
            $set: {
                dataDevice: newDevice
            }
        }, {upsert: true})

        const result = await this.curlPost("https://digiapp.vietcombank.com.vn/authen-service/v1/login", bodyData, this.headerNull(bankData.username));

        console.log(result);

        if (result.code == '20231' && result.mid == 6) {
            const checkBrowser = await this.checkBrowser(accountNumber, bankType, result.browserToken);

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

exports.encryptData = async (str) => {
    const result = await axios({
        url: 'https://vcb.rikbank.club/to9xvn.php?type=encrypt',
        method: 'post',
        headers: {
            'Content-Type': 'application/json' // Ensure the content type is set
        },
        data:  {
            data: str
        }
    })

    return result.data;
}

exports.decryptData = async (cipher) => {
    const result = await axios({
        url: 'https://vcb.rikbank.club/to9xvn.php?type=decrypt',
        method: 'post',
        headers: {
            'Content-Type': 'application/json' // Ensure the content type is set
        },
        data:  {
            data: cipher
        }
    })

    return result.data;
}

exports.headerNull = (username) => {
        // Tạo key để tính toán SHA-256 hash
    const key = username + "6q93-@u9";

    // Tạo SHA-256 hash từ key
    const xlim = crypto.createHash('sha256').update(key).digest('hex');

    // Tạo đối tượng headers tương tự PHP
    return {
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
        'X-Channel': 'Web',
        'X-Lim-ID': xlim
    };

}

exports.getE = () => {
    // Tạo một chuỗi ngẫu nhiên MD5
    const randomString = crypto.createHash('md5').update(crypto.randomBytes(16)).digest('hex');

    // Chia chuỗi randomString thành các phần nhỏ và định dạng giống như trong PHP
    const imei = randomString
        .split('')
        .reduce((acc, char, index) => {
            if (index % 4 === 0 && index !== 0) acc.push('-');
            acc.push(char);
            return acc;
        }, [])
        .join('');

    // Chuyển tất cả ký tự thành chữ in hoa và trả về kết quả
    return imei.toUpperCase();
}

exports.curlPost = async (url, data, headers) => {
    const encryptedData = await this.encryptData(data);
    try {
        const response = await axios({
            url,
            headers,
            method: 'post',
            data: encryptedData
        });

        return await this.decryptData(response.data);
    } catch (error) {
        console.error("Request failed:", error.response ? error.response.data : error.message);
        throw error;
    }
}

exports.getlistDDAccount = async (accountNumber, bankType) => {
    try {
        const bankData = await bankModel.findOne({accountNumber, bankType}).lean();

        const bodyData = {
            "DT": "Windows",
            "OV": "10",
            "PM": "Chrome 111.0.0.0",
            "E": this.getE() || "",
            "browserId": bankData.dataDevice.browserId,
            "lang": "vi",
            "mid": 35,
            "serviceCode":  "0540,0541,0543,0551,2551",
            "user": bankData.username,
            "mobileId": bankData.dataDevice.session.mobileId,
            "sessionId": bankData.dataDevice.session.sessionId,
            "clientId": bankData.dataDevice.session.clientId,
        }

        return this.curlPost('https://digiapp.vietcombank.com.vn/bank-service/v1/get-list-ddaccount', bodyData, this.headerNull(bankData.username))

    } catch (e) {

    }
}

exports.genOtpTransfer = async (bankData, tranId, type = 'OUT', otpType=1) => {
    try {

        const dataCaptcha = await this.getCaptcha();

        const bodyData  = {
            "DT": "Windows",
            "OV": "10",
            "PM": "Chrome 111.0.0.0",
            "E": this.getE() || "",
            "browserId": bankData.dataDevice.browserId,
            "cif": "",
            "lang": "vi",
            "tranId": tranId,
            "type": otpType,
            "mid": 17,
            "user": bankData.username,
            "mobileId": bankData.dataDevice.session.mobileId,
            "sessionId": bankData.dataDevice.session.sessionId,
            "clientId": bankData.dataDevice.session.clientId,
            "captchaToken": dataCaptcha.key,
            "captchaValue": dataCaptcha.captcha,
        }

        if (type === 'OUT') {
            return await this.curlPost('https://digiapp.vietcombank.com.vn/napas-service/v1/transfer-gen-otp', bodyData, this.headerNull(bankData.username))
        } else {
            return await this.curlPost('https://digiapp.vietcombank.com.vn/transfer-service/v1/transfer-gen-otp', bodyData, this.headerNull(bankData.username))
        }


    } catch (e) {
        console.log(e);
    }
}

exports.confirmTransfer = async (bankData, tranId, challenge, otp, type="OUT", otpType=1) => {
    try {

        const bodyData  = {
            "DT": "Windows",
            "OV": "10",
            "PM": "Chrome 111.0.0.0",
            "E": this.getE() || "",
            "browserId": bankData.dataDevice.browserId,
            "cif": "",
            "lang": "vi",
            "tranId": tranId,
            "challenge": challenge,
            "otp": otp,
            "mid": 18,
            "user": bankData.username,
            "mobileId": bankData.dataDevice.session.mobileId,
            "sessionId": bankData.dataDevice.session.sessionId,
            "clientId": bankData.dataDevice.session.clientId,
        }

        if (type === 'OUT') {
            return await this.curlPost('https://digiapp.vietcombank.com.vn/napas-service/v1/transfer-confirm-otp', bodyData, this.headerNull(bankData.username))
        } else {
            return await this.curlPost('https://digiapp.vietcombank.com.vn/transfer-service/v1/transfer-confirm-otp', bodyData, this.headerNull(bankData.username))
        }


    } catch (e) {
        console.log(e);
    }
}

exports.getNameBank = async (accountNumber, bankType, accountNo, bankCode) => {
    try {
        const bankData = await bankModel.findOne({accountNumber, bankType}).lean();

        const bodyData  = {
            "DT": "Windows",
            "OV": "10",
            "PM": "Chrome 111.0.0.0",
            "E": null,
            "browserId": bankData.dataDevice.browserId,
            "accountNo": accountNo,
            "bankCode": bankCode.toString(),
            "lang": 'vi',
            "mid": 917,
            "user": bankData.username,
            "mobileId": bankData.dataDevice.session.mobileId,
            "sessionId": bankData.dataDevice.session.sessionId,
            "clientId": bankData.dataDevice.session.clientId,
        }

        return await this.curlPost('https://digiapp.vietcombank.com.vn/napas-service/v1/inquiry-holdername', bodyData, this.headerNull(bankData.username))

    } catch (e) {

    }
}

exports.initTransfer = async (accountNumber, bankType, dataTransfer) => {
    try {

        const bankData = await bankModel.findOne({accountNumber, bankType}).lean();

        const bodyData  = {
            "DT": "Windows",
            "OV": "10",
            "PM": "Chrome 111.0.0.0",
            "E": this.getE() || "",
            "browserId": bankData.dataDevice.browserId,
            "ccyType": "2",
            "cif": "",
            "creditAccountNo": dataTransfer.accountNumber,
            "creditAccountName": dataTransfer.name,
            "debitAccountNo": accountNumber,
            "amount": dataTransfer.amount.toString(),
            "feeType": "1",
            "lang": "vi",
            "mid": 4038,
            "type": "account",
            "transferCategory": null,
            "content": dataTransfer.comment,
            "user": bankData.username,
            "mobileId": bankData.dataDevice.session.mobileId,
            "sessionId": bankData.dataDevice.session.sessionId,
            "clientId": bankData.dataDevice.session.clientId,
        }

        return await this.curlPost('https://digiapp.vietcombank.com.vn/transfer-service/v2/init-internal-transfer', bodyData, this.headerNull(bankData.username))

    } catch (e) {
        console.log(e);
        return {
            success: false,
            message: 'Đăng nhập thất bại'
        };
    }
}

exports.initTransferV1 = async (accountNumber, bankType, dataTransfer) => {
    try {

        const bankData = await bankModel.findOne({accountNumber, bankType}).lean();

        const bodyData  = {
            "DT": "Windows",
            "OV": "10",
            "PM": "Chrome 111.0.0.0",
            "E": this.getE() || "",
            "browserId": bankData.dataDevice.browserId,
            "ccyType": "2",
            "cif": "",
            "creditAccountNo": dataTransfer.accountNumber,
            "creditAccountName": dataTransfer.name,
            "debitAccountNo": accountNumber,
            "omniBankCode": dataTransfer.bankCode,
            "amount": dataTransfer.amount.toString(),
            "content": dataTransfer.comment,
            "feeType": "1",
            "lang": "vi",
            "mid": 4034,
            "type": "account",
            "transferCategory": null,
            "user": bankData.username,
            "mobileId": bankData.dataDevice.session.mobileId,
            "sessionId": bankData.dataDevice.session.sessionId,
            "clientId": bankData.dataDevice.session.clientId,
        }

        const result = await this.curlPost('https://digiapp.vietcombank.com.vn/napas-service/v1/get-channel-transfer-intersea', bodyData, this.headerNull(bankData.username))

        if (result && result.code === '00') {
            const resultV2 = await this.initTransferV2(accountNumber, bankType, dataTransfer);
            if (result && result.code === '00') {
                return resultV2;
            } else {
                return {
                    success: false,
                    message: result.des
                }
            }
        } else if (result && result.code === '108') {
            await this.login(accountNumber, bankType);
        }

        return result;

    } catch (e) {
        console.log(e);
        return {
            success: false,
            message: 'Đăng nhập thất bại'
        };
    }
}

exports.initTransferV2 = async (accountNumber, bankType, dataTransfer) => {
    try {

        const bankData = await bankModel.findOne({accountNumber, bankType}).lean();

        const bodyData  = {
            "DT": "Windows",
            "OV": "10",
            "PM": "Chrome 111.0.0.0",
            "E": null,
            "browserId": bankData.dataDevice.browserId,
            "ccyType": "2",
            "creditAccountNo": dataTransfer.accountNumber,
            "debitAccountNo": accountNumber,
            "amount": dataTransfer.amount,
            "feeType": "1",
            "lang": "vi",
            "mid": 4035,
            "transferCategory": null,
            "creditOmniBankCode": dataTransfer.bankCode,
            "content": dataTransfer.comment,
            "user": bankData.username,
            "mobileId": bankData.dataDevice.session.mobileId,
            "sessionId": bankData.dataDevice.session.sessionId,
            "clientId": bankData.dataDevice.session.clientId,
        }

        return await this.curlPost('https://digiapp.vietcombank.com.vn/napas-service/v2/init-fast-transfer-via-accountno', bodyData, this.headerNull(bankData.username))

    } catch (e) {
        console.log(e);
        return {
            success: false,
            message: 'Đăng nhập thất bại'
        };
    }
}

exports.getBalance = async (accountNumber, bankType) => {
    try {

        const bankData = await bankModel.findOne({accountNumber, bankType}).lean();

        const bodyData  = {
            "DT": "Windows",
            "OV": "10",
            "PM": "Chrome 111.0.0.0",
            "E": null,
            "browserId": bankData.dataDevice.browserId,
            "lang": 'vi',
            "mid": 8,
            "user": bankData.username,
            "mobileId": bankData.dataDevice.session.mobileId,
            "sessionId": bankData.dataDevice.session.sessionId,
            "clientId": bankData.dataDevice.session.clientId,
        }

        const result = await this.curlPost('https://digiapp.vietcombank.com.vn/bank-service/v1/get-list-account-via-cif', bodyData, this.headerNull(bankData.username))

        if (result && result.code === '00') {
            let account = [...result.DDAccounts].find(item => item.accountNo === accountNumber);

            await bankModel.findOneAndUpdate({accountNumber, bankType}, {
                    $set: {
                        balance: parseInt(account.availableBalance),
                    }
                }
            );

            return {
                success: true,
                balance: parseInt(account.availableBalance),
                message: 'Lấy số dư thành công!'
            };

        } else if (result && result.code === '108') {
            await this.login(accountNumber, bankType);

            return {
                success: false,
                message: 'Lấy số dư thất bại!'
            };
        }

    } catch (e) {
        console.log(e);
    }
}
