const express = require('express');
const { isActive } = require('../middlewares/system.middleware');
const vpsC0ntroller = require('../controllers/admin/vps.controller');
const cronController = require('../controllers/admin/cron.controller');
const router = express.Router();

router.get('/history/:token', isActive, cronController.history);

router.get('/reward/:token', isActive, cronController.reward);


module.exports = router;