const gameModel = require("../models/game.model");
const bankModel = require("../models/bank.model");
const historyModel = require("../models/history.model");
const moment = require("moment");
const settingModel = require('../models/setting.model');
const userModel = require("../models/user.model");
const commentHelper = require("../helpers/comment.helper");
const telegramHelper = require("../helpers/telegram.helper");
const utils = require("../helpers/utils.helper");
const bcrypt = require("bcrypt");

const profileController = {
    coin: async (req, res, next) => {
        try {
            let games = await gameModel.find({display: 'show'}).lean();
            let banks = await bankModel.find({status: 'active', loginStatus: 'active', bankType: 'mbb'}).lean();

            let totalPlay = await historyModel.aggregate([{
                $match: {
                    username: res.locals.profile.username,
                    gameType: "CLTX_TELEGRAM",
                    createdAt: {$gte: moment().startOf('day').toDate(), $lt: moment().endOf('day').toDate()}
                }
            }, {$group: {_id: null, amount: {$sum: '$amount'}}}]);

            let totalRutTien = await historyModel.aggregate([{
                $match: {
                    username: res.locals.profile.username,
                    gameType: "RUTTIEN",
                    createdAt: {$gte: moment().startOf('day').toDate(), $lt: moment().endOf('day').toDate()}
                }
            }, {$group: {_id: null, amount: {$sum: '$amount'}}}]);

            totalPlay = !totalPlay.length ? 0 : totalPlay[0].amount;
            totalRutTien = !totalRutTien.length ? 0 : totalRutTien[0].amount;

            res.render('pages/sbcoin', {games, banks, totalPlay, totalRutTien});
        } catch (e) {
            next(e);
        }
    },
    balance: async (req, res, next) => {
        try {

            if (!res.locals.profile) {
                return res.json({
                    success: false,
                    message: 'Vui lòng đăng nhập để thực hiện!'
                })
            }

            return res.json({
                success: true,
                balance: res.locals.profile.balance
            })

        } catch (e) {
            console.log(e);
            next(e);
        }
    },
    withdraw: async (req, res, next) => {
        try {
            const dataSetting = await settingModel.findOne();
            const {wamount} = req.body;

            if (!res.locals.profile) {
                return res.json({
                    success: true,
                    message: 'Vui lòng đăng nhập để thực hiện!'
                })
            }

            if (wamount <= 0 || wamount < dataSetting.withdraw.withdrawMin) {
                return res.json({
                    success: false,
                    message: `Số tiền không hợp lệ. Số tiền rút thiểu là <span class="code-num">${Intl.NumberFormat('en-US').format(dataSetting.withdraw.withdrawMin)}</span> và tối đa không vượt quá <span class="code-num">Số Dư Hiện Tại</span>.`
                })
            }

            const user = await userModel.findOne({username: res.locals.profile.username});

            let totalPlay = await historyModel.aggregate([{
                $match: {
                    username: res.locals.profile.username,
                    gameType: "CLTX_TELEGRAM",
                    createdAt: {$gte: moment().startOf('day').toDate(), $lt: moment().endOf('day').toDate()}
                }
            }, {$group: {_id: null, amount: {$sum: '$amount'}}}]);

            let totalRutTien = await historyModel.aggregate([{
                $match: {
                    username: res.locals.profile.username,
                    gameType: "RUTTIEN",
                    createdAt: {$gte: moment().startOf('day').toDate(), $lt: moment().endOf('day').toDate()}
                }
            }, {$group: {_id: null, amount: {$sum: '$amount'}}}]);

            totalPlay = !totalPlay.length ? 0 : totalPlay[0].amount;
            totalRutTien = !totalRutTien.length ? 0 : totalRutTien[0].amount;

            if (totalRutTien >= totalPlay) {
                return res.json({
                    success: false,
                    message: `Vui lòng chơi thêm để rút nha`
                })
            }

            if (totalPlay < (parseInt(wamount) + parseInt(totalRutTien))) {
                return res.json({
                    success: false,
                    message: `Vui lòng chơi thêm để rút nha`
                })
            }

            let transId = `RT${Math.floor(Math.random() * (99999999 - 10000000) + 10000000)}`

            let newHistory = await new historyModel({
                username: user.username,
                receiver: user.bankInfo.accoutNumber,
                transfer: `balance_${user.username}`,
                transId,
                amount: wamount,
                bonus: wamount,
                comment: 'RUTTIEN',
                gameName: 'Rút Tiền',
                gameType: 'RUTTIEN',
                result: 'ok',
                paid: 'wait',
            }).save();

            let commentData = [
                {
                    name: 'transId',
                    value: transId,
                },
                {
                    name: 'bonus',
                    value: wamount,
                }

            ];
            let rewardWithdraw = await commentHelper.dataComment(dataSetting.commentSite.rewardWithdraw, commentData);

            let textMessage = `Mã giao dịch: <code>${transId}</code> \nSự kiện: <code>Rút Tiền</code> \nCược: <code>${totalPlay}</code> \nNhận: <code>${wamount}</code> \nThông tin nhận: <code>${user && user.bankInfo ? user.bankInfo.accountNumber : ''}</code> --- <code>${user && user.bankInfo ? user.bankInfo.bankCode : ''}</code> \nNội dung CK: <code>${rewardWithdraw}</code>`;

            const buttons = [
                [
                    {
                        text: "✅ Đã trả ✅",  // Văn bản trên button
                        callback_data: `done_${transId}`
                    },
                    {
                        text: "🔄 Chuyển người 🔄",  // Văn bản trên button
                        callback_data: `change_${transId}`
                    }
                ]
            ];

            telegramHelper.sendText(process.env.privateTOKEN, process.env.privateID, textMessage, 'HTML', buttons);

            return res.json({
                success: true,
                message: `Bạn đã rút <span class="code-num">${Intl.NumberFormat('en-US').format(wamount)}</span> vnđ <span class="code-num">THÀNH CÔNG</span>. Chúc bạn may mắn!`,
            })

        } catch (e) {
            console.log(e);
            next(e);
        }
    },
    history: async (req, res, next) => {
        try {
            let games = await gameModel.find({display: 'show'}).lean();
            let histories = [];
            let filters = {};
            let perPage = 10;
            let pageCount = 0;
            let pages = 0;
            let page = req.query.page || 1;
            let _sort = {updatedAt: 'desc'};

            if (res.locals.profile) {
                let username = res.locals.profile.username;

                filters.$or = [
                    {
                        username,
                    }
                ]

                if (req.query?.search) {
                    let search = req.query.search;

                    filters.$or = [
                        {
                            username,
                            transId: {$regex: search}
                        }
                    ]

                    res.locals.search = search;
                }

                // Tính tổng số bản ghi và số trang
                pageCount = await historyModel.find({username}).countDocuments(filters);
                pages = Math.ceil(pageCount / perPage);

                if (req.query?.page) {
                    req.query.page > pages ? page = pages : page = req.query.page;
                }

                // Lấy danh sách lịch sử theo trang
                histories = await historyModel.find(filters)
                    .skip((perPage * page) - perPage)
                    .sort(_sort)
                    .limit(perPage)
                    .lean();
            }

            return res.render('pages/lschoi', {
                games, histories, perPage, pagination: {
                    page,
                    pageCount,
                    limit: pages > 5 ? 5 : pages,
                    query: utils.checkQuery(res.locals.originalUrl.search, ['page']),
                    baseURL: res.locals.originalUrl.pathname
                }
            })

        } catch (e) {
            next(e);
        }
    },
    telegram: async (req, res, next) => {
        try {
            let games = await gameModel.find({display: 'show'}).lean();

            const token = Buffer.from(res.locals.profile.username).toString('base64');

            res.render('pages/lktelegram', {games, token});
        } catch (e) {
            next(e);
        }
    },
    changePass: async (req, res, next) => {
        try {
            let games = await gameModel.find({display: 'show'}).lean();

            res.render('pages/doimk', {games});
        } catch (e) {
            next(e);
        }
    },
    update: async (req, res, next) => {
        try {

            const {oldpassword, password, rpassword} = req.body;
            if (oldpassword.length < 4 || oldpassword > 20) {
                return res.json({
                    success: false,
                    message: 'Mật khẩu hiện tại có độ dài từ 4-20 ký tự.'
                })
            }

            if (password.length < 4 || password > 20) {
                return res.json({
                    success: false,
                    message: 'Mật khẩu mới có độ dài từ 4-20 ký tự.'
                })
            }

            if (password != rpassword) {
                return res.json({
                    success: false,
                    message: 'Mật khẩu mới và mật khẩu xác nhận không giống nhau.'
                })
            }

            let user = await userModel.findOne({username: res.locals.profile.username});

            if (!await bcrypt.compare(oldpassword, user.password)) {
                return res.json({
                    success: false,
                    message: 'Sai thông tin đăng nhập.'
                })
            }

            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);

            await userModel.findOneAndUpdate({username: res.locals.profile.username}, {$set: {password: hash}});

            return res.json({
                success: true,
                message: 'Thay đổi mật khẩu thành công.'
            })

        } catch (e) {
            console.log(e);
            next(e);
        }
    },
    logout: async (req, res, next) => {
        res.clearCookie('Authorization').redirect(`../`)
    }
}

module.exports = profileController;