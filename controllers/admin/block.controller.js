const moment = require('moment');
const historyModel = require('../../models/history.model');
const blockModel = require('../../models/block.model');
const utils = require('../../helpers/utils.helper');

const blockController = {
    index: async (req, res, next) => {
        try {
            let list = [];
            let filters = {};
            let perPage = 10;
            let page = req.query.page || 1;
            let _sort = { updatedAt: 'desc' };

            if (req.query?.perPage) {
                perPage = req.query.perPage;
            }

            if (req.query?.username) {
                if (/(((\+|)84)|0)(3|5|7|8|9)+([0-9]{8})\b/.test(req.query.username)) {
                    filters.username = req.query.username;
                    res.locals.username = username;
                }
            }

            if (req.query?.status) {
                let statusVaild = ['active', 'pending'];
                statusVaild.includes(req.query.status) && (filters.status = req.query.status) && (res.locals.status = req.query.status)
            }

            if (req.query.hasOwnProperty('_sort')) {
                _sort = {
                    [req.query.column]: req.query._sort
                }
            }

            let counts = await historyModel.aggregate([{ $match: { status: 'phoneBlock' } }, { $group: { _id: '$partnerId', amount: { $sum: '$amount' } } }]);
            let pageCount = await blockModel.countDocuments(filters);
            let pages = Math.ceil(pageCount / perPage);

            if (req.query?.page) {
                req.query.page > pages ? page = pages : page = req.query.page;
            }

            let blocks = await blockModel.find(filters).skip((perPage * page) - perPage).sort(_sort).limit(perPage).lean();

            for (let block of blocks) {
                let find = counts.find(obj => obj._id == block.phone);

                list.push({
                    ...block,
                    amount: find ? find.amount : 0
                })
            }

            res.render('admin/block', {
                title: 'Danh Sách Đen', list, perPage, pagination: {
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
            let username = req.body.username;

            if (!username) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập username!'
                })
            }

            if (await blockModel.findOne({ username })) {
                return res.json({
                    success: false,
                    message: 'Bạn đã chặn số này rồi!'
                })
            }

            let newBlock = await new blockModel({ username }).save();

            res.json({
                success: true,
                message: 'Thêm thành công!',
                data: newBlock
            })
        } catch (err) {
            next(err);
        }
    },
    update: async (req, res, next) => {
        try {
            let id = req.params.id;
            let status = req.body.status;

            if (!status) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập đầy đủ thông tin!'
                })
            }

            let data = await blockModel.findByIdAndUpdate(id, { $set: { status } });

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
            let data = await blockModel.findByIdAndDelete(id);

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

module.exports = blockController;