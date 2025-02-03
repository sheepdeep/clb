"use strict";
const userModel = require('../models/user.model');

exports.isInstalled = async (req, res, next) => res.locals.settings && await userModel.findOne() ? res.redirect('../') : next();
exports.notInstalled = async (req, res, next) => !res.locals.settings || !await userModel.findOne() ? res.redirect('../install') : next();
exports.isActive = async (req, res, next) => (res.locals.settings && res.locals.settings.siteStatus == 'active') ? next() : res.json({ success: false, message: 'Hệ thống đang tạm bảo trì!' })