const express = require('express');
const momoController = require('../controllers/momo.controller');
const { isAdmin } = require('../middlewares/auth.middleware');
const router = express.Router();

router.post('/otp', isAdmin, momoController.otp);

router.post('/confirm', isAdmin, momoController.confirm);

router.post('/login', isAdmin, momoController.login);

router.post('/refresh', isAdmin, momoController.refresh);

router.post('/history', isAdmin, momoController.history);

router.post('/details', isAdmin, momoController.details);

router.post('/balance', isAdmin, momoController.balance);

router.post('/transfer', isAdmin, momoController.transfer);

router.post('/export', isAdmin, momoController.export);

router.post('/qr', isAdmin, momoController.qr);

router.post('/noti', isAdmin, momoController.noti);

module.exports = router;