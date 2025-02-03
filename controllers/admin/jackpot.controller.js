const jackpotModel = require('../../models/jackpot.model');
const momoModel = require('../../models/bank.model');
const historyJackpot = require('../../models/history-jackpot.model');
const jackpotHelper = require('../../helpers/jackpot.helper');
const utils = require('../../helpers/utils.helper');

const jackpotController = {
    index: async (req, res, next) => {
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
                        ip: { $regex: search }
                    }
                ]

                res.locals.search = search;
            }

            if (req.query?.isJoin) {
                filters.isJoin = req.query.isJoin;

                res.locals.isJoin = req.query.isJoin;
            }

            if (req.query.hasOwnProperty('_sort')) {
                _sort = {
                    [req.query.column]: req.query._sort
                }
            }

            let pageCount = await jackpotModel.countDocuments(filters);
            let pages = Math.ceil(pageCount / perPage);

            if (req.query?.page) {
                req.query.page > pages ? page = pages : page = req.query.page;
            }

            let jackpots = await jackpotModel.find(filters).skip((perPage * page) - perPage).sort(_sort).limit(perPage).lean();

            res.render('admin/jackpot', {
                title: 'Danh Sách Chơi Nổ Hũ', jackpots, perPage, pagination: {
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
    update: async (req, res, next) => {
        try {
            let id = req.params.id;
            let isJoin = req.body.isJoin;

            if (!isJoin) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập đầy đủ thông tin!'
                })
            }

            let data = await jackpotModel.findByIdAndUpdate(id, { $set: { isJoin } });

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
            let data = await jackpotModel.findByIdAndDelete(id);

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
    },
    history: async (req, res, next) => {
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
                        receiver: { $regex: search }
                    },
                    {
                        transId: { $regex: search }
                    }
                ]

                res.locals.search = search;
            }

            if (req.query.status) {
                let vaildStatus = ['wait', 'error', 'success'];

                vaildStatus.includes(req.query.status) && (filters.status = req.query.status) && (res.locals.status = req.query.status)
            }

            if (req.query.hasOwnProperty('_sort')) {
                _sort = {
                    [req.query.column]: req.query._sort
                }
            }

            let pageCount = await historyJackpot.countDocuments(filters);
            let pages = Math.ceil(pageCount / perPage);

            if (req.query?.page) {
                req.query.page > pages ? page = pages : page = req.query.page;
            }

            let historys = await historyJackpot.find(filters).skip((perPage * page) - perPage).sort(_sort).limit(perPage).lean();
            let phones = await momoModel.find({ status: 'active', loginStatus: 'active' }).lean();

            res.render('admin/history-jackpot', {
                title: 'Lịch Sử Nổ Hũ', historys, phones, perPage, pagination: {
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
    updateHistory: async (req, res, next) => {
        try {
            let id = req.params.id;
            let status = req.body.status;

            if (!status) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập đầy đủ thông tin!'
                })
            }

            let data = await historyJackpot.findByIdAndUpdate(id, { $set: { status } });

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
    removeHistory: async (req, res, next) => {
        try {
            let id = req.params.id;

            if (id == 'all') {
                await historyJackpot.deleteMany();

                return res.json({
                    success: true,
                    message: 'Xóa tất cả thành công!'
                })
            }

            if (!await historyJackpot.findByIdAndDelete(id)) {
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
    rework: async (req, res, next) => {
        try {
            let { phone, transId } = req.body;

            if (!phone) {
                return res.json({
                    success: false,
                    message: 'Vui lòng chọn số điện thoại!'
                })
            }

            if (!transId) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập mã giao dịch!'
                })
            }

            if (!await momoModel.findOne({ phone, status: 'active', loginStatus: 'active' })) {
                return res.json({
                    success: false,
                    message: 'Số điện thoại này không hoạt động!'
                })
            }

            let data = await historyJackpot.findOne({ transId });

            if (!data) {
                return res.json({
                    success: false,
                    message: 'Không tìm thấy dữ liệu!'
                })
            }

            if (data.status != 'wait') {
                return res.json({
                    success: false,
                    message: 'Chỉ trả thưởng nổ hũ ở trạng thái đang xử lý!'
                })
            }

            let reward = await jackpotHelper.rewardJackpot(phone, data.receiver, transId, data.amount);

            return !reward ? res.json({
                success: false,
                message: 'Trả thưởng nổ hũ thất bại!'
            }) : res.json({
                success: true,
                message: 'Trả thưởng thành công #' + reward.transId
            })

        } catch (err) {
            next(err);
        }
    }
}

module.exports = jackpotController;