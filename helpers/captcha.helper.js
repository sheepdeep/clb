const axios = require('axios');
const logHelper = require('../helpers/log.helper');

exports.thueapibank = async (type, img_base64) => {
    try {

        let options = {
            method: 'POST',
            url: 'https://thueapibank.vn/api/captcha',
            headers: {
                'Content-Type': 'application/json'
            },
            data: {
                "access_token": process.env.apiKeyCaptcha,
                type,
                img_base64: img_base64
            }
        };

        let { data: response } = await axios(options);

        if (response.status) {
            return {
                success: true,
                message: 'Giải captcha thành công!',
                captcha: response.data.captcha
            }
        } else {
            return {
                success: false,
                message: 'Giải captcha thất bại!'
            }
        }

    } catch (e) {
        console.log(e);
        await logHelper.create('byPassCaptcha', 'Xảy ra lỗi khi giải captcha từ thueapibank ' + e.message);
        return {
            success: false,
            message: 'Giải captcha thất bại!'
        }
    }
}

exports.captchaMbbankDVD = async (img_base64) => {
    try {

        let options = {
            method: 'POST',
            url: 'https://dvd.vn/api/captcha/mbbank',
            headers: {
                'Content-Type': 'application/json'
            },
            data: {
                "api_key": process.env.apiKeyCaptcha,
                "username": "102380179255627991170",
                img_base64: img_base64
            }
        };

        let { data: response } = await axios(options);

        console.log(response);

    } catch (e) {
        console.log(e);
        await logHelper.create('byPassCaptcha', 'Xảy ra lỗi khi giải captcha từ thueapibank ' + e.message);
        return {
            success: false,
            message: 'Giải captcha thất bại!'
        }
    }
}