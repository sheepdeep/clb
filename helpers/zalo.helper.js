const axios = require('axios');
const crypto = require('crypto');
const {v4: uuidv4} = require("uuid");
const moment = require("moment/moment");
const {HttpsProxyAgent} = require("https-proxy-agent");
const zaloModel = require("../models/zalo.model");


exports.checkBank = async (phone, dataTransfer) => {
    try {

        const data = await zaloModel.findOne({phone});

        const bodyData = {
            "bank_code": dataTransfer.bankCode,
            "bank_number": dataTransfer.accountNumber,
            "type": 0
        }

        const config = {
            url: "https://scard.zalopay.vn/v1/mt/ibft-switch/tof/inquiry",
            method: "POST",
            headers: {
                'Host': 'scard.zalopay.vn',
                'Accept': '*/*',
                'Cookie': "has_device_id=0; zalo_id=203246111917024153; zalopay_id=200803000987973; zalo_oauth=Y3GJzx5FxYVe67IudqcyBj4bGhJORgaibYCtiejycbM5D7-qx6Nr6AWrFkxWMSP_w1CkvATQitpQ11ETrqxxVBCPPEB0J9PqYIXQyPXHdstI6W32st6R9jWzTyE-RhzPop0TYxvawnhgU02EyMUU6waK8i_r2OeyW79j_hz_m2IODJcfcM_BIePt2B7FIz0FpHL4ikKMWZ-0ObofYLImKfWVMgFNKQy1mo95fuem_IEpD1pdWd_eOlCq5zxqRkKxma42ujConLs1AJZ9k2pv2zHeUzNWOjeJ_YapZe5ygLkzAIBUvJ6UVz3t1jAKixzbujHJmjA3k2oc-2QPaggDIulN49JNkPe-aSGuSx21yj21hzSQCzHzZmwcXnbW-n_kRhZX7NBwTO5zj_OB79niya6YuZLPfHUw9jL3HIMnQRWX; zlp_token=2NFrJR9QjFJFBMfhY8WQgaHtbPkGALkJrxcB5vZkjiZ35ugNksZmvVvi4VfGfdmCVcWviDvFyqSASXuzYNMvFEyVEzzhzr2Exq7GbWoWNB864VfPLQ9mQySzo8MqKNTB7v58WczxjusHU29s1k4HbPozTWVgDhbHvUhALCBnTBVAguPAnQA2T; _ga=GA1.1.757400904.1744528154; _ga_XWW4JEB21X=GS1.1.1744650906.6.1.1744651836.10.0.0; useragent=TW96aWxsYS81LjAgKE1hY2ludG9zaDsgSW50ZWwgTWFjIE9TIFggMTBfMTVfNykgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzEzMy4wLjAuMCBTYWZhcmkvNTM3LjM2; _uafec=Mozilla%2F5.0%20(Macintosh%3B%20Intel%20Mac%20OS%20X%2010_15_7)%20AppleWebKit%2F537.36%20(KHTML%2C%20like%20Gecko)%20Chrome%2F133.0.0.0%20Safari%2F537.36;",
                // 'Content-Length': Buffer.byteLength(bodyData).toString(),
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive',
                // 'Content-Type': 'text/plain;charset=UTF-8',
                'Origin': 'https://social.zalopay.vn',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
            },
            data: bodyData
        }

        const {data: response} = await axios(config);

        if (response.error) {
            return {
                success: false,
                message: response.error.details.localized_message.message,
            }
        } else {
            return {
                success: true,
                message: "Lấy thông tin ngân hàng thành công!",
                data: response
            }
        }

    } catch (e) {
        console.log(e);
    }
}

exports.createOrderBank = async (phone, dataTransfer) => {
    try {

        const data = await zaloModel.findOne({phone});

        const bodyData = {
            "bank_code": dataTransfer.bankCode,
            "bank_number": dataTransfer.accountNumber,
            "save": false,
            "inquiry_info": dataTransfer.inquiry_info,
            "amount": dataTransfer.amount,
            "bank_holder_name": dataTransfer.fullName,
            "message": dataTransfer.comment,
            "ii_type": 0,
            "nickname": "",
            "type": 2
        }

        const config = {
            url: "https://scard.zalopay.vn/v1/mt/ibft-switch/tof/create-order",
            method: "POST",
            headers: {
                'Host': 'scard.zalopay.vn',
                'Accept': '*/*',
                'Cookie': data.accessToken,
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive',
                'Origin': 'https://social.zalopay.vn',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
            },
            data: bodyData
        }

        const {data: response} = await axios(config);

        console.log(response);

        if (response.error) {
            return {
                success: false,
                message: response.error.details.localized_message.message,
            }
        } else {

            return {
                success: true,
                message: "Lấy thông tin ngân hàng thành công!",
                data: response
            }
        }
    } catch (e) {
        console.log(e);
    }
}

exports.precheck = async (phone) => {
    try {

        const data = await zaloModel.findOne({phone});

        const config = {
            url: "https://api.zalopay.vn/v2/cashier/pre-check",
            method: "GET",
            headers: {
                'Host': 'sapi.zalopay.vn',
                'Accept': '*/*',
                'Cookie': data.accessToken,
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive',
                'Origin': 'https://social.zalopay.vn',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
            },
        }

        const {data: response} = await axios(config);

        if (response.error) {
            return {
                success: false,
                message: response.error.details.localized_message.message,
            }
        } else {

            return {
                success: true,
                message: "Lấy thông tin ngân hàng thành công!",
                data: response
            }
        }
    } catch (e) {
        console.log(e);
    }
}

exports.confirmBank = async (phone, order) => {
    try {

        const data = await zaloModel.findOne({phone});

        const bodyData = {
            "order_type": "FULL_ORDER",
            "full_assets": true,
            "order_data": {
                "app_id": order.data.app_id,
                "app_trans_id": order.data.app_trans_id,
                "app_time": order.data.app_time,
                "app_user": order.data.app_user,
                "amount": order.data.amount,
                "item": order.data.item,
                "description": order.data.description,
                "embed_data": order.data.embeddata,
                "mac": order.data.mac,
                "trans_type": 1,
                "product_code": "TF007",
                "service_fee": {
                    "fee_amount": order.data.fee_amount,
                    "total_free_trans": 0,
                    "remain_free_trans": 0
                }
            },
            "token_data": {
                "trans_token": "",
                "app_id": order.data.app_id,
            },
            "campaign_code": "",
            "display_mode": 1
        }

        const config = {
            url: "https://sapi.zalopay.vn/v1/cashier/assets",
            method: "GET",
            headers: {
                'Host': 'sapi.zalopay.vn',
                'Accept': '*/*',
                'Cookie': data.accessToken,
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive',
                'Origin': 'https://social.zalopay.vn',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
            },
            data: bodyData
        }

        const {data: response} = await axios(config);

        console.log(response);

        if (response.error) {
            return {
                success: false,
                message: response.error.details.localized_message.message,
            }
        } else {

            return {
                success: true,
                message: "Xác nhận chuyển tiền thành công!",
                data: response
            }
        }
    } catch (e) {
        console.log(e);
    }
}

exports.payBank = async (phone) => {
    try {

        const data = await zaloModel.findOne({phone});

        const bodyData = {
            "order_type": "FULL_ORDER",
            "full_assets": true,
            "order_data": {
                "app_id": order.data.app_id,
                "app_trans_id": order.data.app_trans_id,
                "app_time": order.data.app_time,
                "app_user": order.data.app_user,
                "amount": order.data.amount,
                "item": order.data.item,
                "description": order.data.description,
                "embed_data": order.data.embeddata,
                "mac": order.data.mac,
                "trans_type": 1,
                "product_code": "TF007",
                "service_fee": {
                    "fee_amount": order.data.fee_amount,
                    "total_free_trans": 0,
                    "remain_free_trans": 0
                }
            },
            "token_data": {
                "trans_token": "",
                "app_id": order.data.app_id,
            },
            "campaign_code": "",
            "display_mode": 1
        }

        const config = {
            url: "https://sapi.zalopay.vn/v2/cashier/assets",
            method: "GET",
            headers: {
                'Host': 'sapi.zalopay.vn',
                'Accept': '*/*',
                'Cookie': data.accessToken,
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive',
                'Origin': 'https://social.zalopay.vn',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
            },
            data: bodyData
        }

        const {data: response} = await axios(config);

        if (response.error) {
            return {
                success: false,
                message: response.error.details.localized_message.message,
            }
        } else {

            return {
                success: true,
                message: "Xác nhận chuyển tiền thành công!",
                data: response
            }
        }
    } catch (e) {
        console.log(e);
    }
}

exports.sendMoneyBank = async (phone, dataTransfer) => {
    try {
        const checkBank = await this.checkBank(phone, dataTransfer);

        if (!checkBank.success) {
            return {
                success: false,
                error: 'checkBank failed',
                message: checkBank.message,
            }
        }

        dataTransfer.inquiry_info = checkBank.data.inquiry_info;
        dataTransfer.fullName = checkBank.data.bank_holder_name;

        const order = await this.createOrderBank(phone, dataTransfer);

        if (!order) {

        }

        await this.precheck(phone);

        const result = await this.confirmBank(phone, order);

        console.log(result);

    } catch (e) {
        console.log(e);
    }
}

exports.balance = async (phone) => {
    try {

        const data = await zaloModel.findOne({phone});

        const bodyData = {
            "bank_code": "TCB",
            "bank_number": "9927112005",
            "type": 0
        }

        const config = {
            url: "https://api.zalopay.vn/v2/user/balance",
            method: "GET",
            headers: {
                'Host': 'api.zalopay.vn',
                'Accept': '*/*',
                'Cookie': data.accessToken,
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive',
                'Origin': 'https://social.zalopay.vn',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
            },
            data: bodyData
        }

        const {data: response} = await axios(config);

        if (response.error) {
            return {
                success: false,
                message: response.error.details.localized_message.message,
            }
        } else {

            await zaloModel.findOneAndUpdate({phone}, {
                $set: {
                    balance: response.data.balance,
                }
            }, {upsert: true})

            return {
                success: true,
                message: "Lấy thông tin ngân hàng thành công!",
                balance: response.data.balance,
                data: response
            }
        }
    } catch (e) {
        console.log(e);
    }
}
