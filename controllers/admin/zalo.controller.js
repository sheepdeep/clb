const zaloModel = require("../../models/zalo.model");
const utils = require("../../helpers/utils.helper");

const zaloController = {
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

            let pageCount = await zaloModel.countDocuments(filters);
            let pages = Math.ceil(pageCount / perPage);

            if (req.query?.page) {
                req.query.page > pages ? page = pages : page = req.query.page;
            }

            let count = await zaloModel.aggregate([{ $group: { _id: null, balance: { $sum: '$balance' } } }]);
            let data = await zaloModel.find(filters).skip((perPage * page) - perPage).sort(_sort).limit(perPage).lean();

            for (let zlp of data) {
                threads.push(zlp);
            }

            let list = await Promise.all(threads);

            res.render('admin/zalopay', {
                title: 'Quản Lý ZaloPay', list, count: !count.length ? 0 : count[0].balance, perPage, pagination: {
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
            const {phone, password, cookie} = req.body;

            await zaloModel.findOneAndUpdate({phone}, {
                $set: {
                    phone,
                    password,
                    accessToken: cookie,
                    status: 'pending'
                }
            }, {upsert: true})

            return res.json({
                success: true,
                message: 'Thêm tài khoản thành công!'
            })
        } catch (e) {
            console.log(e);
        }
    },
    update: async (req, res, next) => {
        try {
            let id = req.params.id;

            let data = await zaloModel.findByIdAndUpdate(id, { $set: { ...req.body } });

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
}

module.exports = zaloController;
