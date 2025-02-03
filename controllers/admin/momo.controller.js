const moment = require('moment');
const momoModel = require('../../models/momo.model');
const momoService = require('../../services/momo.service');
const utils = require('../../helpers/utils.helper');

const momoController = {
    index: async (req, res, next) => {
        try {
            let threads = [];
            let filters = {};
            let perPage = 10;
            let page = req.query.page || 1;
            let _sort = { updatedAt: 'desc' };

            if (req.query?.perPage) {
                perPage = req.query.perPage;
            }

            if (req.query?.search) {
                let search = req.query.search;

                filters.$or = [
                    {
                        phone: { $regex: search }
                    },
                    {
                        name: { $regex: search }
                    }
                ]

                if (!isNaN(search)) {
                    filters.$or.push(...[
                        { amount: search },
                        { betMax: search },
                        { betMin: search },
                        { number: search },
                        { limitDay: search },
                        { limitMonth: search }
                    ])
                }

                res.locals.search = search;
            }

            if (req.query?.status) {
                let vaildStatus = ['active', 'limit', 'pending', 'error'];

                vaildStatus.includes(req.query.status) && (filters.status = req.query.status) && (res.locals.status = req.query.status)
            }

            if (req.query?.loginStatus) {
                let loginVaild = ['refreshError', 'waitLogin', 'errorLogin', 'active', 'waitOTP', 'waitSend', 'error'];

                loginVaild.includes(req.query.loginStatus) && (filters.loginStatus = req.query.loginStatus) && (res.locals.loginStatus = req.query.loginStatus)
            }

            if (req.query.hasOwnProperty('_sort')) {
                _sort = {
                    [req.query.column]: req.query._sort
                }
            }

            let pageCount = await momoModel.countDocuments(filters);
            let pages = Math.ceil(pageCount / perPage);

            if (req.query?.page) {
                req.query.page > pages ? page = pages : page = req.query.page;
            }

            let count = await momoModel.aggregate([{ $group: { _id: null, balance: { $sum: '$balance' } } }]);
            let data = await momoModel.find(filters).skip((perPage * page) - perPage).sort(_sort).limit(perPage).lean();

            for (let momo of data) {
                threads.push(momoService.dataInfo(momo, true));
            }

            let list = await Promise.all(threads);
            res.render('admin/momo', {
                title: 'Quản Lý Momo', list, count: !count.length ? 0 : count[0].balance, perPage, pagination: {
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
    business: async (req, res, next) => {
        try {
            let threads = [];
            let filters = {};
            let perPage = 10;
            let page = req.query.page || 1;
            let _sort = { updatedAt: 'desc' };

            if (req.query?.perPage) {
                perPage = req.query.perPage;
            }

            if (req.query?.search) {
                let search = req.query.search;

                filters.$or = [
                    {
                        phone: { $regex: search }
                    },
                    {
                        name: { $regex: search }
                    }
                ]

                if (!isNaN(search)) {
                    filters.$or.push(...[
                        { amount: search },
                        { betMax: search },
                        { betMin: search },
                        { number: search },
                        { limitDay: search },
                        { limitMonth: search }
                    ])
                }

                res.locals.search = search;
            }

            if (req.query?.status) {
                let vaildStatus = ['active', 'limit', 'pending', 'error'];

                vaildStatus.includes(req.query.status) && (filters.status = req.query.status) && (res.locals.status = req.query.status)
            }

            if (req.query?.loginStatus) {
                let loginVaild = ['refreshError', 'waitLogin', 'errorLogin', 'active', 'waitOTP', 'waitSend', 'error'];

                loginVaild.includes(req.query.loginStatus) && (filters.loginStatus = req.query.loginStatus) && (res.locals.loginStatus = req.query.loginStatus)
            }

            if (req.query.hasOwnProperty('_sort')) {
                _sort = {
                    [req.query.column]: req.query._sort
                }
            }

            let pageCount = await momoModel.countDocuments(filters);
            let pages = Math.ceil(pageCount / perPage);

            if (req.query?.page) {
                req.query.page > pages ? page = pages : page = req.query.page;
            }

            let count = await momoModel.aggregate([{ $group: { _id: null, amount: { $sum: '$amount' } } }]);
            let data = await momoModel.find(filters).skip((perPage * page) - perPage).sort(_sort).limit(perPage).lean();

            for (let momo of data) {
                threads.push(momoService.dataInfo(momo, true));
            }

            let list = await Promise.all(threads);
            res.render('admin/momo-business', {
                title: 'Quản Lý Momo Business', list, count: !count.length ? 0 : count[0].amount, perPage, pagination: {
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
    lite: async (req, res, next) => {
        try {
            let filters = {};
            let perPage = 10;
            let page = req.query.page || 1;
            let _sort = { updatedAt: 'desc' };

            if (req.query?.perPage) {
                perPage = req.query.perPage;
            }

            if (req.query?.search) {
                let search = req.query.search;

                filters.$or = [
                    {
                        phone: { $regex: search }
                    },
                    {
                        name: { $regex: search }
                    }
                ]

                if (!isNaN(search)) {
                    filters.$or.push(...[
                        { amount: search },
                        { betMax: search },
                        { betMin: search },
                        { number: search },
                        { limitDay: search },
                        { limitMonth: search }
                    ])
                }

                res.locals.search = search;
            }

            if (req.query?.status) {
                let vaildStatus = ['active', 'limit', 'pending', 'error'];

                vaildStatus.includes(req.query.status) && (filters.status = req.query.status) && (res.locals.status = req.query.status)
            }

            if (req.query?.loginStatus) {
                let loginVaild = ['refreshError', 'waitLogin', 'errorLogin', 'active', 'waitOTP', 'waitSend', 'error'];

                loginVaild.includes(req.query.loginStatus) && (filters.loginStatus = req.query.loginStatus) && (res.locals.loginStatus = req.query.loginStatus)
            }

            if (req.query.hasOwnProperty('_sort')) {
                _sort = {
                    [req.query.column]: req.query._sort
                }
            }

            let pageCount = await momoModel.countDocuments(filters);
            let pages = Math.ceil(pageCount / perPage);

            if (req.query?.page) {
                req.query.page > pages ? page = pages : page = req.query.page;
            }

            let count = await momoModel.aggregate([{ $group: { _id: null, amount: { $sum: '$amount' } } }]);
            let list = await momoModel.find(filters).skip((perPage * page) - perPage).sort(_sort).limit(perPage).lean();
            res.render('admin/momo-lite', {
                title: 'Quản Lý Momo Lite', list, count: !count.length ? 0 : count[0].amount, perPage, pagination: {
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
            const  {phone, storeKey, partnerCode, accessKey, secretKey} = req.body;
            if (!phone || !storeKey || !partnerCode || !accessKey || !secretKey) {
                return res.json({
                    success: false,
                    message: 'Vui lòng điền đầy đủ thông tin'
                })
            }

            const newMomoBusiness = new momoModel({
                phone,
                storeKey,
                partnerCode,
                accessKey,
                secretKey,
                receiver: true
            }).save();

            res.json({
                success: true,
                message: 'Thêm momo business thành công'
            })

        } catch (err) {
            next(err);
        }
    },
    data: async (req, res, next) => {
        try {
            let phone = req.params.phone;

            let data = await momoModel.findOne({ phone }).lean();

            if (!data) {
                return res.json({
                    success: false,
                    message: 'Không tìm thấy #' + phone
                })
            }

            data = await momoService.dataInfo(data);

            res.json({
                success: true,
                message: 'Lấy thành công!',
                data
            })
        } catch (err) {
            next(err);
        }
    },
    update: async (req, res, next) => {
        try {
            let id = req.params.id;

            let data = await momoModel.findByIdAndUpdate(id, { $set: { ...req.body } });

            if (!data) {
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
            let data = await momoModel.findByIdAndDelete(id);

            if (!data) {
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

module.exports = momoController;