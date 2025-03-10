const express = require('express');
const apiController = require('../controllers/api.controller');
const {isActive} = require('../middlewares/system.middleware');
const router = express.Router();
const momoRoute = require('../routers/momo.route');
const telegramController = require('../controllers/telegram.controller');
const {loggedIn} = require("../middlewares/auth.middleware");

router.use('/momo', momoRoute);

router.post('/games', isActive, apiController.getGame);
//
router.get('/getPhone', isActive, apiController.getPhone);
//
router.post('/rewards', [isActive, loggedIn], apiController.getReward);

router.post('/bet', isActive, apiController.betGame);

router.get('/history', isActive, apiController.getHistory);

router.post('/telegram/webhook', telegramController.hook);

router.get('/load-choice-xsst', apiController.getGameXsst);

router.post('/send-otp', apiController.sendOTP);

router.post('/get-otp', apiController.getOTP);

router.get('/get-job', apiController.getJob);

module.exports = router;