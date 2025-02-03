"use strict";
const moment = require("moment");

const errorHandler = async (err, req, res, next) => {
    if (err) {
        if (err.status == 404 && req.method == 'GET') return res.status(404).render('errors/404');
        console.log(`${err.message}, ${req.path}`);
        res.status(err.status || 200).json({
            success: false,
            message: "Có lỗi xảy ra " + err.message || err
        })
    }
};
module.exports = errorHandler;