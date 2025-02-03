const express = require('express');
const { isInstalled } = require('../middlewares/system.middleware');
const installController = require('../controllers/install.controller');
const router = express.Router();

router.get('/', isInstalled, installController.index);

router.post('/token', isInstalled, installController.token);

router.post('/users', isInstalled, installController.user);

router.post('/settings', isInstalled, installController.setting);

module.exports = router;