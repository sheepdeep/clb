const gameModel = require("../models/game.model");
const rewardModel = require("../models/reward.model");
const userModel = require("../models/user.model");
const settingModel = require("../models/setting.model");
const gameData = require('../json/games.json');
const rewardData = require('../json/rewards.json');
const authService = require('../services/auth.service');

const installController = {
    index: async (req, res, next) => {
        try {
            let token;
            let user = !await userModel.findOne();
            let setting = !await settingModel.findOne();

            user && (setting = false);

            if (!req.cookies?.['TOKEN_SETUP'] || req.cookies['TOKEN_SETUP'] != process.env.TOKEN_SETUP) {
                token = true;
                user = false;
                setting = false;
            }

            res.render('pages/install', {
                token, user, setting
            });
        } catch (err) {
            next(err);
        }
    },
    token: async (req, res, next) => {
        try {
            let token = req.body.token;

            if (!token || token != process.env.TOKEN_SETUP) {
                return res.json({
                    success: false,
                    message: 'Invalid TOKEN_SETUP!'
                })
            }

            let game = await gameModel.findOne();
            let reward = await rewardModel.findOne();

            !game && await gameModel.insertMany(gameData);
            !reward && await rewardModel.insertMany(rewardData);

            return res.cookie('TOKEN_SETUP', token, {
                httpOnly: true,
                maxAge: 10 * 60 * 1000 // 10 phút
            }).json({
                success: true,
                message: 'Thành Công!'
            })
        } catch (err) {
            next(err);
        }
    },
    user: async (req, res, next) => {
        try {
            let { name, username, password } = req.body;
            let token = req.cookies['TOKEN_SETUP'];

            if (!token || token != process.env.TOKEN_SETUP) {
                return res.json({
                    success: false,
                    message: 'Invalid TOKEN_SETUP!'
                })
            }

            if (!name || !username || !password) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập đầy đủ thông tin!'
                })
            }

            let data = await authService.registerUserAdmin(name, username, password, req.ip, 1);

            if (!data.success) {
                return res.json({
                    success: false,
                    message: data.message
                })
            }

            return res.json({
                success: true,
                message: 'Thành Công!'
            })
        } catch (err) {
            next(err);
        }
    },
    setting: async (req, res, next) => {
        try {
            let token = req.cookies['TOKEN_SETUP'];

            if (!token || token != process.env.TOKEN_SETUP) {
                return res.json({
                    success: false,
                    message: 'Invalid TOKEN_SETUP!'
                })
            }

            for (let data in req.body) {
                if (data.includes('-')) {
                    let key = data.split('-');
                    let value = req.body[data];

                    req.body[key[0]] = {
                        ...req.body[key[0]],
                        ...{
                            [key[1]]: key[1] == 'numberTLS' ? value.replace(/\s+/g, '').split('-').filter(item => item) : value
                        }
                    }

                    delete req.body[data];
                }
            }

            await settingModel.findOneAndUpdate({}, { $set: { ...req.body } }, { upsert: true });

            return res.json({
                success: true,
                message: 'Thành Công!'
            })
        } catch (err) {
            next(err);
        }
    }
}

module.exports = installController;