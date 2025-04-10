const authService = require('../services/auth.service');
const blockModel = require("../models/block.model");

const authController = {
    register: async (req, res, next) => {
        try {
            let { rpassword, username, password } = req.body;

            if (!rpassword || !username || !password) {
                return res.json({
                    success: false,
                    message: 'Vui lòng điền đầy đủ thông tin!'
                })
            }

            const regex = /^[a-zA-Z0-9_]+$/;
            if (!regex.test(username)) {
                return res.status(200).json({ success: false, message: "Tài khoản không hợp lệ!" });
            }

           if (rpassword != password) {
               return res.json({
                   success: false,
                   message: 'Nhập lại mật khẩu không chính xác!'
               })
           }

           let referral;

           // console.log(req.session.referral);

           if (req.session.referral) {
               referral = req.session.referral
           } else {
               referral = null
           }

            return res.json(await authService.register(username, password, req.ip, referral, 0));

        } catch (err) {
            console.log(err);
            next(err);
        }
    },
    login: async (req, res, next) => {
        try {
            let { username, password } = req.body;

            if (!username || !password) {
                return res.json({
                    success: false,
                    message: 'Vui lòng điền đầy đủ thông tin!'
                })
            }

            if (await blockModel.findOne({username, status: 'active'})) {
                return res.json({
                    success: false,
                    message: 'Tài khoản của bạn đã bị khóa!'
                })
            }

            let loginData = await authService.login(username, password, req.ip);

            if (loginData.success) {
                res.cookie('Authorization', loginData.token, {
                    httpOnly: true,
                    maxAge: 168 * 60 * 60 * 1000 // 7 days
                });
            }

            return res.json(loginData);

        } catch (err) {
            console.log(err);
            next(err);
        }
    },
    logout: async (req, res) => res.clearCookie('Authorization').redirect(`..${process.env.adminPath}`),
}

module.exports = authController;
