const gameModel = require("../models/game.model");
const bankModel = require("../models/bank.model");
const settingModel = require("../models/setting.model");
const historyModel = require("../models/history.model");
const turnTaiXiuModel = require("../models/turn.taixiu-rong.model");
const userModel = require("../models/user.model");
const moment = require("moment/moment");
const securityHelper = require("../helpers/security.helper");

const taixiuController = {
    index: async (req, res, next) => {
        try {
            let games = await gameModel.find({display: 'show'}).lean();

            res.render('pages/phongtx', {games});
        } catch (e) {
            next(e);
        }
    },
    bet: async (req, res, next) => {
        try {
            const dataSetting = await settingModel.findOne({});
            const {amount, type}  = req.body;

            if (amount < 0) {
                return res.json({
                    success: false,
                    message: "Số tiền không hợp lệ!"
                })
            }

            if (type != 'SRT' && type != 'SRX') {
                return res.json({
                    success: false,
                    message: 'Vui lòng chọn tài hoặc xỉu!'
                })
            }

            if (amount > res.locals.profile.balance) {
                return res.json({
                    success: false,
                    message: "Số dư không đủ để thực hiện đặt cược!"
                })
            }

            if (!res.locals.profile) {
                return res.json({
                    success: false,
                    message: "Vui lòng đăng nhập tài khoản!"
                })
            }
            const turn = await turnTaiXiuModel.findOne({status: 'running'}).lean();
            const user = await userModel.findOne({username: res.locals.profile.username});
            const checkHistory = await historyModel.findOne({username: user.username, gameType: "TXRONG", result: 'wait'});
            let balance = user.balance - amount;

            if (checkHistory && checkHistory.comment != type) {
                // const newHistory =  await new historyModel({
                //     transId: `TXR${Math.floor(Math.random() * (99999 - 10000) + 10000)}_${turn.turn}`,
                //     username: user.username,
                //     comment: type,
                //     receiver: 'system',
                //     amount: amount,
                //     bonus: 0,
                //     gameName: 'TXRONG',
                //     gameType: 'TXRONG',
                //     result: 'lose',
                //     description: 'Bạn không thể đặt cược 2 cửa!'
                // }).save()

                return res.json({
                    success: false,
                    message: "Bạn không thể đặt 2 cửa cùng lúc!"
                })
            } else {
                user.balance = balance;
                user.save();
                const newHistory =  await new historyModel({
                    transId: `TXR${Math.floor(Math.random() * (99999 - 10000) + 10000)}_${turn.turn}`,
                    username: user.username,
                    comment: type,
                    receiver: 'system',
                    amount: amount,
                    bonus: 0,
                    gameName: 'TXRONG',
                    gameType: 'TXRONG',
                    result: 'wait',
                    description: `Bạn đã đặt cược <span class="code-num">${Intl.NumberFormat('en-US').format(amount)}</span> vnđ tại phòng chơi của <span class="code-num">TX Rồng</span>. (SB: ${Intl.NumberFormat('en-US').format(parseInt(user.balance) + parseInt(amount))} -&gt; ${Intl.NumberFormat('en-US').format(balance)})`,
                }).save()

                const histories = await historyModel.find({username: user.username}, {
                    _id: 0,
                    transId: 1,
                    amount: 1,
                    comment: 1,
                    gameType: 1,
                    result: 1,
                    paid: 1,
                    description: 1,
                    createdAt: 1
                }).sort({createdAt: -1}).limit(10).lean();

                const historys = await historyModel.find({result: 'win'}).sort({createdAt: 'desc'}).limit(5);
                const list = [];

                for (const histor of historys) {
                    list.push({
                        username: `${histor.username.slice(0, 4)}****`,
                        amount: histor.amount,
                        bonus: histor.bonus,
                        gameName: histor.gameName,
                        comment: histor.comment,
                        result: histor.result,
                        time: moment(histor.timeTLS).format('YYYY-MM-DD HH:mm:ss')
                    })
                }

                let dataPost = {
                    success: true,
                    username: user.username,
                    histories,
                    allHistories: list
                };

                let dataEncode = await securityHelper.encrypt(JSON.stringify(dataPost));

                socket.emit('cltx', dataEncode);

                return res.json({
                    success: true,
                    message: `Đặt cược vào ${type == 'SRT' ? 'cửa tài':'cửa xỉu'} thành công!`
                })
            }

        } catch (e) {
            console.log(e)
        }
    }
}

module.exports = taixiuController;
