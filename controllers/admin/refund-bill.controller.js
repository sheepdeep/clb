const moment = require('moment');
const refundModel = require('../../models/refund-bill.model');
const utils = require('../../helpers/utils.helper');

const missionController = {
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
                        transId: { $regex: search }
                    },
                    {
                        percent: { $regex: search }
                    }
                ]

                res.locals.search = search;
            }

            if (req.query.hasOwnProperty('_sort')) {
                _sort = {
                    [req.query.column]: req.query._sort
                }
            }

            let pageCount = await refundModel.countDocuments(filters);
            let pages = Math.ceil(pageCount / perPage);

            if (req.query?.page) {
                req.query.page > pages ? page = pages : page = req.query.page;
            }

            let refunds = await refundModel.find(filters).skip((perPage * page) - perPage).sort(_sort).limit(perPage).lean();
            res.render('admin/refundBill', {
                title: 'Lịch Sử Hoàn Tiền', refunds, perPage, pagination: {
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
    remove: async (req, res, next) => {
        try {
            let id = req.params.id;

            if (id == 'all') {
                await refundModel.deleteMany();

                return res.json({
                    success: true,
                    message: 'Xóa tất cả thành công!'
                })
            }

            let data = await refundModel.findByIdAndDelete(id);

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

module.exports = missionController;