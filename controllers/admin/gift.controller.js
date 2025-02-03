const moment = require('moment');
const crypto = require('crypto');
const giftModel = require('../../models/gift.model');
const utils = require('../../helpers/utils.helper');

const giftController = {
    index: async (req, res, next) => {
        try {
            let filters = {};
            let perPage = 10;
            let page = req.query.page || 1;
            let _sort = { createdAt: 'desc' };
            res.locals._sort.column = "createdAt";

            if (req.query?.perPage) {
                perPage = req.query.perPage;
            }

            if (req.query?.search) {
                let search = req.query.search;

                filters.$or = [
                    {
                        code: { $regex: search }
                    },
                    {
                        players: { $regex: search }
                    }
                ]

                if (!isNaN(search)) {
                    filters.$or.push(...[
                        { amount: search },
                        { limit: search }
                    ])
                }

                res.locals.search = search;
            }

            if (req.query?.status) {
                let vaildStatus = ['active', 'limit', 'expired'];

                vaildStatus.includes(req.query.status) && (filters.status = req.query.status) && (res.locals.status = req.query.status)
            }

            if (req.query.hasOwnProperty('_sort')) {
                _sort = {
                    [req.query.column]: req.query._sort
                }
            }

            let pageCount = await giftModel.countDocuments(filters);
            let pages = Math.ceil(pageCount / perPage);

            if (req.query?.page) {
                req.query.page > pages ? page = pages : page = req.query.page;
            }

            let giftCode = await giftModel.find(filters).skip((perPage * page) - perPage).sort(_sort).limit(perPage).lean();
            res.render('admin/giftCode', {
                title: 'Danh Sách Quà Tặng', giftCode, perPage, pagination: {
                    page,
                    pageCount,
                    limit: pages > 5 ? 5 : pages,
                    query: utils.checkQuery(res.locals.originalUrl.search, ['page']),
                    baseURL: res.locals.originalUrl.pathname
                }
            });
        } catch (err) {
            next(err);
        }
    },
    add: async (req, res, next) => {
        try {
            let { code, amount, limit, playCount, days, otp, type } = req.body;

            let dataCode = code.split(/\r\n|\n|\r/);

            if (!otp) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập mã OTP!'
                })
            }

            if (!code || !amount || !limit || !days || !type) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập đầy đủ thông tin!'
                })
            }

            if (await giftModel.findOne({ code })) {
                return res.json({
                    success: false,
                    message: 'Mã quà tặng đã tồn tại!'
                })
            }

            let verifyOTP = await utils.OTP('verify', {
                otp: crypto.createHash('md5').update(otp).digest("hex"),
                username: res.locals.profile.username,
                action: 'addGift',
            });

            if (!verifyOTP.success) {
                return res.json({
                    success: false,
                    message: verifyOTP.message
                })
            }

            for (let newCode of dataCode) {
                let newGift = await new giftModel({
                    code: newCode,
                    amount,
                    limit,
                    playCount,
                    type,
                    expiredAt: moment().add(days, 'days').toDate()
                }).save();
            }

            res.json({
                success: true,
                message: 'Thêm thành công!',
            })
        } catch (err) {
            next(err);
        }
    },
    update: async (req, res, next) => {
        try {
            let id = req.params.id;

            if (!await giftModel.findByIdAndUpdate(id, { $set: { ...req.body } })) {
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

            if (!await giftModel.findByIdAndDelete(id)) {
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
    },
    history: async (req, res, next) => {
        try {
            let id = req.params.id;
            let data = await giftModel.findById(id);

            if (!data) {
                return res.json({
                    success: false,
                    message: 'Không tìm thấy dữ liệu!'
                })
            }

            return res.json({
                success: true,
                message: 'Thành công!',
                data
            })
        } catch (err) {
            next(err);
        }
    },
    delHistory: async (req, res, next) => {
        try {
            let id = req.params.id;
            let phone = req.body.phone;

            if (id == 'all') {
                await giftModel.findOneAndUpdate({ phone }, {
                    $set: {
                        players: []
                    }
                });

                return res.json({
                    success: true,
                    message: 'Xóa thành công!'
                })
            }

            if (!phone) {
                return res.json({
                    success: false,
                    message: 'Thiếu dữ liệu!'
                })
            }

            let data = await giftModel.findById(id);

            data.players = data.players.filter(item => item.phone != phone);
            await data.save();

            res.json({
                success: true,
                message: 'Xóa thành công!'
            })
        } catch (err) {
            next(err);
        }
    },
    checkPer: async (req, res, next) => {
        if (!res.locals.profile.permission.useGift) {
            return req.method == 'GET' ? res.redirect(`..${res.locals.adminPath}/dashboard`) : res.json({
                success: false,
                message: 'Không có quyền thao tác!'
            })
        }

        next();
    }
}

module.exports = giftController;