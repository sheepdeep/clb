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
                'Cookie': data.accessToken,
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
                message: "Lấy số dư thành công!",
                balance: response.data.balance,
                data: response
            }
        }
    } catch (e) {
        console.log(e);
        return {
            success: false,
            message: 'Vui lòng kiểm tra lại accessToken'
        }
    }
}
