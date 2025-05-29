const express = require('express');
const moment = require('moment');
const { isAdmin, loggedInAdmin } = require('../middlewares/auth.middleware');
const logModel = require('../models/log.model');
const historyModel = require('../models/history.model');
const revenueService = require('../services/revenue.service');
const systemController = require('../controllers/admin/system.controller');
const gameController = require('../controllers/admin/game.controller');
const rewardController = require('../controllers/admin/reward.controller');
const bankController = require('../controllers/admin/bank.controller');
const giftController = require('../controllers/admin/gift.controller');
const historyController = require('../controllers/admin/history.controller');
const transferController = require('../controllers/admin/transfer.controller');
const blockController = require('../controllers/admin/block.controller');
const momoController = require('../controllers/admin/momo.controller');
const transferBankController = require('../controllers/admin/transfer-bank.controller');
const userModel = require('../models/user.model');
const zaloModel = require('../models/zalo.model');
const bankModel = require('../models/bank.model');
const blockModel = require('../models/block.model');
const tableSort = require('../middlewares/sort.middleware');
const memberController = require('../controllers/admin/member.controller');
const utils = require('../helpers/utils.helper');
const payController = require("../controllers/admin/pay.controller");
const vpsController = require('../controllers/admin/vps.controller');
const sendController = require('../controllers/admin/send.controller');
const zaloController = require('../controllers/admin/zalo.controller');
const refundController = require('../controllers/admin/refund.controller');
const topController = require('../controllers/admin/top.controller');
const taiXiuController = require('../controllers/admin/taixiu.controller');
const telegramController = require('../controllers/telegram.controller');
const momoModel = require("../models/momo.model");

const router = express.Router();

router.get(['/', '/home', '/dashboard'], loggedInAdmin, async (req, res, next) => {
    try {
        let _username, gameType;
        let _revenueTime = moment().format('YYYY-MM-DD');
        let typeDate = 'day';

        req.query?._username && /[a-zA-Z0-9]{8}\b/.test(req.query._username) && (_username = req.query._username);
        req.query?.gameType && (gameType = req.query.gameType);

        if (req.query?.typeDate) {
            let vaild = ['day', 'month', 'all'];
            vaild.includes(req.query.typeDate) && (typeDate = req.query.typeDate);
        }

        if (req.query?._revenueTime) {
            let regexTime = [
                {
                    type: 'day',
                    regex: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/,
                    format: 'YYYY-MM-DD'
                }, {
                    type: 'month',
                    regex: /^\d{4}-(0[1-9]|1[0-2])$/,
                    format: 'YYYY-MM'
                },
                {
                    type: 'all',
                    regex: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/,
                    format: 'YYYY-MM-DD'
                }
            ];

            let dataTime = regexTime.find(e => e.type == typeDate);
            req.query._revenueTime.match(dataTime.regex) && (_revenueTime = moment(req.query._revenueTime).format(dataTime.format))
        }

        let logs = await logModel.find().sort({ time: 'desc' }).limit(30).lean();
        let revenueData = {
            ...await revenueService.revenueBet(_revenueTime, typeDate, _username, gameType),
            ...await revenueService.revenueMoney(_revenueTime, typeDate, _username, gameType)
        }

        const countUser = await userModel.countDocuments();
        const countBlockUser = await blockModel.countDocuments();

        let countMomo = await momoModel.aggregate([{ $group: { _id: null, balance: { $sum: '$balance' } } }]);
        let countZalo = await zaloModel.aggregate([{ $group: { _id: null, balance: { $sum: '$balance' } } }]);
        let countBank = await bankModel.aggregate([{ $group: { _id: null, balance: { $sum: '$balance' } } }]);

        res.render('admin/dashboard', { title: 'Quản Trị Hệ Thống',
            countMomo: !countMomo.length ? 0 : countMomo[0].balance,
            countZalo: !countZalo.length ? 0 : countZalo[0].balance,
            countBank: !countBank.length ? 0 : countBank[0].balance,
            revenueData, countBlockUser, _revenueTime, typeDate, logs, countUser })
    } catch (err) {
        next(err);
    }
});

router.delete('/logSystem/:id', isAdmin, async (req, res, next) => {
    try {
        let id = req.params.id;
        id == 'all' ? await logModel.deleteMany() : await logModel.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Xóa thành công!'
        })

    } catch (err) {
        next(err);
    }
})

router.route('/system')
    .get(loggedInAdmin, systemController.index)
    .put(isAdmin, systemController.update);

router.route('/game')
    .get(loggedInAdmin, tableSort, gameController.index)
    .post(isAdmin, gameController.add);

router.route('/game/:id')
    .put(loggedInAdmin, gameController.update)
    .delete(isAdmin, gameController.remove);

router.route('/reward')
    .get(loggedInAdmin, tableSort, rewardController.index)
    .post(isAdmin, rewardController.checkPer, rewardController.add);

router.route('/reward/:id')
    .put(loggedInAdmin, rewardController.checkPer, rewardController.update)
    .delete(isAdmin, rewardController.checkPer, rewardController.remove);

router.route('/bank').get(loggedInAdmin, tableSort, bankController.index).post(loggedInAdmin, bankController.add);

router.route(['/bank/:id', '/bank/:id'])
    .put(loggedInAdmin, bankController.update)
    .delete(loggedInAdmin, bankController.remove);

router.route('/bank-checkTrans').get(loggedInAdmin, tableSort, bankController.checkTrans);

router.post('/bank/refresh', [loggedInAdmin, isAdmin], bankController.refresh)
router.post('/bank/balance', [loggedInAdmin, isAdmin], bankController.balance)

router.route('/gift')
    .get(loggedInAdmin, tableSort, giftController.index)
    .post(isAdmin, giftController.checkPer, giftController.add);

router.route('/gift/:id')
    .put(loggedInAdmin, isAdmin, giftController.checkPer, giftController.update)
    .delete(isAdmin, giftController.checkPer, giftController.remove);

router.route('/history-gift/:id')
    .get(loggedInAdmin, giftController.checkPer, tableSort, giftController.history)
    .post(isAdmin, giftController.checkPer, giftController.delHistory);

router.post('/sendOTP', loggedInAdmin, isAdmin, async (req, res, next) => {
    try {
        let { action } = req.body;

        if (!action) {
            return res.json({
                success: false,
                message: 'Thiếu dữ liệu đường truyền!'
            })
        }

        let vaild = ['addGift', 'useTrans'];

        if (!vaild.includes(action)) {
            return res.json({
                success: false,
                message: 'Thao tác không hợp lệ!'
            })
        }

        let send = await utils.OTP('generate', {
            username: res.locals.profile.username,
            action
        });

        return res.json(send);
    } catch (err) {
        console.log(err);
        next(err);
    }
})

router.route('/history')
    .get(loggedInAdmin, tableSort, historyController.index)
    .post(isAdmin, historyController.rework);

router.route('/history/:id')
    .put(isAdmin, historyController.update)
    .delete(isAdmin, historyController.remove);

router.post('/history/reCheck', isAdmin, historyController.reCheck);
router.post('/history/checkAction', isAdmin, historyController.checkAction);


router.route('/members')
    .get(loggedInAdmin, tableSort, memberController.index)
    .post(isAdmin, memberController.add);

router.route('/members/:id')
    .get(isAdmin, memberController.info)
    .put(isAdmin, memberController.update)
    .delete(isAdmin, memberController.remove);

router.get('/history-transfer', loggedInAdmin, tableSort, transferController.showTrans)
router.delete('/history-transfer/:id', isAdmin, transferController.delTrans)

router.route('/block')
    .get(loggedInAdmin, tableSort, blockController.index)
    .post(isAdmin, blockController.add);

router.route('/block/:id')
    .delete(isAdmin, blockController.remove);

/** Momo Router */
router.get('/momo-list', loggedInAdmin, tableSort, momoController.index);

// router.get('/zlp-list', loggedInAdmin, tableSort, zaloController.index);
router.route('/zlp-list')
    .get([loggedInAdmin, tableSort], zaloController.index)
    .post(isAdmin, zaloController.add);

router.route('/zlp-list/:id')
    .put(isAdmin, zaloController.update)
    .delete(isAdmin, zaloController.remove);

router.route('/zlp/balance')
    .post(isAdmin, zaloController.balance)

router.route('/zlp-to-bank')
    .get([isAdmin, loggedInAdmin], zaloController.transferToBank)
    .post(isAdmin, transferBankController.zaloToBank)


router.route(['/momo-list/:id', '/momo-lite/:id'])
    .put(isAdmin, momoController.update)
    .delete(isAdmin, momoController.remove);

router.route('/transfer-to-bank')
    .get(loggedInAdmin, transferBankController.index)
    .post(isAdmin, transferBankController.transfer)

router.route('/refund')
    .get(loggedInAdmin, refundController.index)
    .post(isAdmin, refundController.refund)

router.route('/top')
    .get(loggedInAdmin, topController.index)
    .post(isAdmin, topController.refund)

router.route('/transfer')
    .get(loggedInAdmin, transferController.index)
    .post(isAdmin, transferController.transfer)

router.route('/pay')
    .get(payController.index)

router.route('/pay-otp')
    .get(payController.pay)
    .post(payController.verify);

router.route('/taixiu')
    .get(loggedInAdmin, tableSort, taiXiuController.index)
    .post(payController.verify);

router.route('/vps')
    .get(loggedInAdmin, tableSort, vpsController.index)
    .post(isAdmin, vpsController.run);

router.route('/send-message')
    .get(loggedInAdmin, tableSort, sendController.index)
    .post(isAdmin, sendController.run);

// router.route('/telegram-bot')
//     .get(loggedInAdmin, tableSort, telegramController.index)

module.exports = router;
