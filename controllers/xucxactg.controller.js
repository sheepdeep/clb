const gameModel = require("../models/game.model");
const telegramHelper = require("../helpers/telegram.helper");
const settingModel = require("../models/setting.model");
const userModel = require("../models/user.model");
const historyModel = require('../models/history.model');
const telgramHelper = require('../helpers/telegram.helper');

const xucxactgController = {
    index: async (req, res, next) => {
        try {
            userHistories = []
            if (res.locals.profile) {
                userHistories = await historyModel.find({username: res.locals.profile.username}, {_id: 0, transId: 1, amount: 1, comment: 1, gameType: 1, result: 1, paid: 1, description: 1, createdAt: 1}).sort({ createdAt: -1 }).limit(10).lean();
            }
            let games = await gameModel.find({ display: 'show' }).lean();
            res.render('pages/xxtg', {games, userHistories});
        } catch (e) {
            next(e);
        }
    },
    bet: async (req, res, next) => {
        try {
            const {comment, amount} = req.body;

            if (!amount || amount < 10000) {
                return res.json({
                    success: false,
                    message: 'Số tiền không hợp lệ. Số tiền cược tối thiểu là <span class="code-num">10,000</span> và tối đa không vượt quá <span class="code-num">Số Dư Phòng</span>.'
                })
            }

            if (!res.locals.profile) {
                return res.json({
                    success: false,
                    message: 'Vui lòng <a href="/dangnhap" target="_blank">ĐĂNG NHẬP</a> để tiếp tục chơi.'
                })
            }

            const user = await userModel.findOne({username: res.locals.profile.username});

            if (!user?.telegram?.chatId) {
                return res.json({
                    success: false,
                    message: 'Vui lòng <a href="/lktelegram" target="_blank">LIÊN KẾT TELEGRAM</a> để tiếp tục chơi.'
                })
            }

            if (user.balance === 0) {
                return res.json({
                    success: false,
                    message: 'Số dư của bạn không đủ. Vui lòng <a href="/sbcoin" target="_blank">NẠP THÊM</a> để tiếp tục chơi.'
                })
            }

            if (amount > user.balance) {
                return res.json({
                    success: false,
                    message: 'Số dư của bạn không đủ. Vui lòng <a href="/sbcoin" target="_blank">NẠP THÊM</a> để tiếp tục chơi.'
                })
            }

            if (!comment) {
                return res.json({
                    success: false,
                    message: 'Vui lòng chọn <code>C</code> hoặc <code>L</code> hoặc <code>T</code> hoặc <code>X</code>.'
                })
            }

            req.session.xxtg = 'batdau';

            let balance = user.balance - amount;


            let newHistory = await new historyModel({
                username: user.username,
                receiver: 'system',
                transfer: `balance_${user.username}`,
                transId: `CLTX${Math.floor(Math.random() * (99999999 - 10000000) + 10000000)}`,
                amount,
                bonus: 0,
                comment,
                gameName: 'CLTX TELEGRAM',
                gameType: 'CLTX_TELEGRAM',
                description: `Bạn đã đặt cược <span class="code-num">${Intl.NumberFormat('en-US').format(amount)}</span> vnđ tại phòng chơi của <span class="code-num">CLTX TELEGRAM</span>. (SB: ${Intl.NumberFormat('en-US').format(user.balance)} -&gt; ${Intl.NumberFormat('en-US').format(balance)})`,
                result: 'wait',
                paid: 'wait',
            }).save();

            let histories = await historyModel.find({username: user.username}, {_id: 0, transId: 1, amount: 1, comment: 1, gameType: 1, result: 1, paid: 1, description: 1, createdAt: 1}).sort({ createdAt: -1 }).limit(10).lean();

            res.json({
                success: true,
                message: `Bạn đã đặt cược <span class="code-num">${Intl.NumberFormat('en-US').format(amount)}</span> vnđ <span class="code-num">THÀNH CÔNG</span>. Kết quả sẽ có trong giây lát. Chúc bạn may mắn!`,
                balance,
                histories
            })

            setTimeout(() => {
                req.session.xxtg = null;
            }, 10 * 1000);


            // Chạy các tác vụ sau khi đã gửi phản hồi
            setImmediate(async () => {
                await telgramHelper.cltx(user.username, amount, comment, newHistory);
            });


        } catch (e) {
            next(e);
        }
    }
}

module.exports = xucxactgController;
