const userModel = require('../models/user.model');
const gameModel = require("../models/game.model");

const bankController = {
    index: async (req, res, next) => {
        try {
            let games = await gameModel.find({ display: 'show' }).lean();

            res.render('pages/caidatbank', {games});
        } catch (e) {
            next(e);
        }
    },
    update: async (req, res, next) => {
        try {
            const {bin, number, name} = req.body;

            if (!bin || !number || !name) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập đầy đủ thông tin'
                })
            }

            const checkBank = await userModel.findOne({"bankInfo.accountNumber": number, "bankInfo.bankCode": bin});

            if (checkBank) {
                return res.json({
                    success: false,
                    message: 'Thông tin ngân hàng đã tồn tại!'
                })
            }

            const user = await userModel.findOne({username: res.locals.profile.username});

            if (user.guard) {
                return res.json({
                    success: false,
                    message: 'Bạn đã được bảo vệ ngân hàng'
                })
            }

            user.bankInfo.accountNumber = number;
            user.bankInfo.bankCode = bin;
            user.bankInfo.accountName = name;
            user.save();

            return res.json({
                success: true,
                message: 'Cập nhật thông tin ngân hàng thành công!'
            })

        } catch (e) {
            next(e);
        }
    }
}

module.exports = bankController;