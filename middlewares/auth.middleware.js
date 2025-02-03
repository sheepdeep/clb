"use strict"
const userModel = require('../models/user.model');
const authService = require('../services/auth.service');
const blockModel = require('../models/block.model');

exports.loggedInAdmin = async (req, res, next) => {
    try {
        if (!req.cookies?.['Authorization']) return res.redirect(`../dangnhap`);
        let token = req.cookies['Authorization'];
        let user = await authService.checkAuth(token);
        if (!user) throw new Error('User not found!');

        if (user.admin != 1) {
           return res.redirect(`../`)
        }

        res.locals.profile = user;
        next();
    } catch (err) {
        // console.log(err);
        return res.clearCookie('Authorization').redirect(`../dangnhap`);
    }
}

exports.loggedIn = async (req, res, next) => {
    try {
        if (!req.cookies?.['Authorization']) return next();

        let token = req.cookies['Authorization'];
        let user = await authService.checkAuth(token);

        if (!user) throw new Error('User not found!');

        if (await blockModel.findOne({username: user.username, status: 'active'})) {
            return res.clearCookie('Authorization').redirect(`../dangnhap`);
        }

        res.locals.profile = user;
        next();
    } catch (err) {
        console.log(err);
        return res.clearCookie('Authorization');
    }
}


exports.isAuth = async (req, res, next) => {
    try {
        if (!req.cookies?.['Authorization']) return next();

        let token = req.cookies['Authorization'];
        let user = await authService.checkAuth(token);

        if (!user) throw new Error('User not found!');

        res.locals.profile = user;
        res.redirect(`../`);
    } catch (err) {
        console.log(err);
        res.clearCookie('Authorization');
        return next();
    }
}

exports.isAdmin = async (req, res, next) => {
    try {
        if (!req.cookies?.['Authorization'] && !req.headers.token) {
            return res.json({
                success: false,
                message: 'Không có quyền truy cập!'
            })
        }

        if (req.headers.token) {
            let user = await userModel.findOne({ token: req.headers.token });

            if (!user) {
                res.clearCookie('Authorization').json({ success: false, message: 'Không có quyền truy cập!' });
                return;
            }

            res.locals.profile = user;

            return next()
        }

        let token = req.cookies['Authorization'];
        let user = await authService.checkAuth(token);

        if (!user) throw new Error('User not found!');

        res.locals.profile = user;
        next();
    } catch (err) {
        console.log(err);
        return res.clearCookie('Authorization').json({ success: false, message: 'Không có quyền truy cập!' })
    }
}
