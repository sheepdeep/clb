const moment = require('moment');
const gameModel = require('../../models/game.model');
const proxyModel = require('../../models/proxy.model');
const gameService = require('../../services/game.service');

const gameController = {
    index: async (req, res, next) => {
        try {
            let filters = {};
            let _sort = { updatedAt: 'desc' };

            if (req.query?.search) {
                filters.$or = [
                    {
                        phone: { $regex: req.query.search }
                    },
                    {
                        ipAddress: { $regex: req.query.search }
                    },
                    {
                        port: { $regex: req.query.search }
                    },
                    {
                        username: { $regex: req.query.search }
                    },
                    {
                        password: { $regex: req.query.search }
                    }
                ];
                res.locals.search = req.query.search;
            }

            if (req.query.hasOwnProperty('_sort')) {
                _sort = {
                    [req.query.column]: req.query._sort
                }
            }

            let proxys = await proxyModel.find(filters).sort(_sort).lean();

            res.render('admin/proxy', { title: 'Quản Lý Proxy', proxys })
        } catch (err) {
            console.log(err);
            next(err);
        }
    },
    add: async (req, res, next) => {
        try {
            let { proxy } = req.body;

            if (!proxy) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập đầy đủ thông tin!'
                })
            }

            const pairs = proxy.split(/\r\n|\n|\r/);

            let proxySuccess = 0;

            for (const item of pairs) {
                const proxyData = item.split('|');

                if (proxyData.length < 4) {
                    return res.json({
                        success: false,
                        message: proxyData[0] + ' vui lòng nhập lại dữ liệu proxy'
                    })
                }

                const checkProxy = await proxyModel.findOne({ ipAddress: proxyData[0] })
                if (!checkProxy) {
                    let newProxy = await new proxyModel({
                        ipAddress: proxyData[0],
                        port: proxyData[1],
                        username: proxyData[2],
                        password: proxyData[3]
                    }).save();

                    proxySuccess++;
                }
            }

            res.json({
                success: true,
                message: 'Thêm thành công ' + proxySuccess + ' proxy'
            })
        } catch (err) {
            next(err);
        }
    },
    update: async (req, res, next) => {
        try {
            let id = req.params.id;

            if (req.body.ipAddress) {
                const checkProxy = await proxyModel.findOne({ ipAddress: req.body.ipAddress })
                if (checkProxy) {
                    return res.json({
                        success: false,
                        message: 'Proxy đã có trong hệ thống'
                    })
                }
            }

            if (!await proxyModel.findByIdAndUpdate(id, { $set: { ...req.body } })) {
                return res.json({
                    success: false,
                    message: 'Không tìm thấy #' + id
                })
            }

            res.json({
                success: true,
                message: 'Lưu thành công #' + id
            })
        } catch (err) {
            next(err);
        }
    },
    remove: async (req, res, next) => {
        try {
            let id = req.params.id;

            if (!await proxyModel.findByIdAndDelete(id)) {
                return res.json({
                    success: false,
                    message: 'Không tìm thấy #' + id
                })
            }

            res.json({
                success: true,
                message: 'Xóa thành công #' + id
            })
        } catch (err) {
            next(err);
        }
    }
}

module.exports = gameController;