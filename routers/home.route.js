const express = require('express');
const validateColor = require("validate-color").default;
const {isActive, isInstalled} = require('../middlewares/system.middleware');
const settingModel = require('../models/setting.model');
const gameModel = require('../models/game.model.js');
const historyService = require('../services/history.service');
const installRoute = require('../routers/install.route');
const {notInstalled} = require('../middlewares/system.middleware');
const router = express.Router();
const apiRoute = require('../routers/api.route');
const adminRoute = require('../routers/admin.route');
const authController = require('../controllers/auth.controller');
const {isAuth, isAdmin, loggedIn, isUser} = require("../middlewares/auth.middleware");
const giftcodeController = require('../controllers/giftcode.controller');
const bankModel = require("../models/bank.model");
const xucxactgController = require('../controllers/xucxactg.controller');
const missionController = require('../controllers/mission.controller');
const historyModel = require("../models/history.model");
const cronRoute = require('../routers/cron.route');
const fanController = require('../controllers/fan.controller');
const bankController = require('../controllers/bank.controller');
const profileController = require('../controllers/profile.controller');
const xssieutocController = require('../controllers/xssieutoc.controller');
const xsmbController = require('../controllers/xsmb.controller');
const taixiuController = require('../controllers/taixiu.controller');
const tableSort = require("../middlewares/sort.middleware");
const moment = require("moment/moment");

router.use(async (req, res, next) => {
    res.locals.settings = await settingModel.findOne().lean();
    res.locals.originalUrl = req._parsedUrl;
    res.locals.adminPath = process.env.adminPath;
    // res.locals.baseURL = `${req.protocol}://${req.hostname}`;
    next();
})

router.use('/cronJobs', cronRoute);

router.use('/install', installRoute);

router.use('/api/v2', apiRoute);

router.use(process.env.adminPath, adminRoute);

router.get('/', notInstalled, loggedIn, async (req, res) => {

    if (res.locals.settings.siteStatus === 'maintenance') {
        return res.render('errors/maintenance');
    }

    let games = await gameModel.find({display: 'show'}).lean();
    let bank = await bankModel.findOne({status: 'active', loginStatus: 'active',}, {
        _id: 0,
        bankType: 1,
        accountNumber: 1,
        name: 1,
        bonus: 1,
        number: 1,
        betMin: 1,
        betMax: 1,
        status: 1
    }).lean();
    userHistories = []
    if (res.locals.profile) {
        userHistories = await historyModel.find({username: res.locals.profile.username}, {
            _id: 0,
            transId: 1,
            amount: 1,
            comment: 1,
            gameType: 1,
            result: 1,
            paid: 1,
            description: 1,
            createdAt: 1,
            timeTLS: 1,
            isCheck: 1
        }).sort({createdAt: -1}).limit(10).lean();
    }

    let historys = await historyModel.find({result: 'win'}).sort({createdAt: 'desc'}).limit(5);
    let list = [];

    for (const histor of historys) {
        list.push({
            username: `${histor.username.slice(0, 4)}****`,
            amount: histor.amount,
            bonus: histor.bonus,
            gameName: histor.gameName,
            gameType: histor.gameType,
            comment: histor.comment,
            result: histor.result,
            time: moment(histor.timeTLS).format('YYYY-MM-DD HH:mm:ss')
        })
    }

    let tops = await historyService.getTOP();

    res.render(`pages/home`, {games, tops, bank, userHistories, list});
});

router.route('/dangky')
    .get(notInstalled, async (req, res) => {

        res.render(`pages/register`);
    })
    .post(notInstalled, authController.register);

router.route('/dangnhap')
    .get([notInstalled, isAuth], async (req, res) => {
        res.render(`pages/login`);
    })
    .post([notInstalled, isAuth], authController.login);

router.route('/giftcode')
    .get([notInstalled, loggedIn], giftcodeController.index)
    .post([notInstalled, loggedIn], giftcodeController.check);

router.route('/xxtg')
    .get([notInstalled, loggedIn], xucxactgController.index)
    .post([notInstalled, loggedIn], xucxactgController.bet);

router.route('/nvngay')
    .get([notInstalled, loggedIn], missionController.index)
    .post([notInstalled, loggedIn], missionController.accept);

router.route('/fan')
    .get([notInstalled, loggedIn], fanController.index)
// .post([notInstalled, loggedIn], missionController.accept);

router.route('/caidatbank')
    .get([notInstalled, loggedIn], bankController.index)
    .post([notInstalled, loggedIn], bankController.update);

router.route('/sbcoin')
    .get([notInstalled, loggedIn], profileController.coin)
    .post([notInstalled, loggedIn], profileController.balance);

router.route('/ruttien')
    .post([notInstalled, loggedIn], profileController.withdraw)

router.route('/lschoi')
    .get([notInstalled, loggedIn, tableSort], profileController.history)

router.route('/lktelegram')
    .get([notInstalled, loggedIn], profileController.telegram);

router.route('/xssieutoc')
    .get([notInstalled, loggedIn], xssieutocController.index)
    .post([notInstalled, isUser], xssieutocController.bet);

router.route('/xsmb')
    .get([notInstalled, loggedIn], xsmbController.index)
    .post([notInstalled, isUser], xsmbController.bet);

router.route('/phongtx')
    .get([notInstalled, loggedIn], taixiuController.index)
    .post([notInstalled, isUser], xsmbController.bet);

router.route('/doimk')
    .get([notInstalled, loggedIn], profileController.changePass)
    .post([notInstalled, loggedIn], profileController.update);

router.route('/dangxuat')
    .get([notInstalled, loggedIn], profileController.logout)

router.use((req, res, next) => {
    next({status: 404, message: `404 page not found!`});
})

module.exports = router;
