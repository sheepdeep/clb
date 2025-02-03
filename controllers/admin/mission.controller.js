const moment = require('moment');
const missionModel = require('../../models/mission.model');
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

            if (req.query?.phone) {
                if (/(((\+|)84)|0)(3|5|7|8|9)+([0-9]{8})\b/.test(req.query.phone)) {
                    filters.phone = req.query.phone;
                    res.locals.phone = req.query.phone;
                }
            }

            if (req.query?.dateTime) {
                if (req.query.dateTime.match(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/)) {
                    filters.createdAt = {
                        $gte: moment(req.query.dateTime).startOf('day').toDate(),
                        $lt: moment(req.query.dateTime).endOf('day').toDate()
                    }
                    res.locals.dateTime = moment(req.query.dateTime).format('YYYY-MM-DD');
                }
            }

            if (req.query.hasOwnProperty('_sort')) {
                _sort = {
                    [req.query.column]: req.query._sort
                }
            }

            let pageCount = await missionModel.countDocuments(filters);
            let pages = Math.ceil(pageCount / perPage);

            if (req.query?.page) {
                req.query.page > pages ? page = pages : page = req.query.page;
            }

            let missions = await missionModel.find(filters).skip((perPage * page) - perPage).sort(_sort).limit(perPage).lean();
            res.render('admin/missionDay', {
                title: 'Lịch Sử Nhiệm Vụ Ngày', missions, perPage, pagination: {
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
                await missionModel.deleteMany();

                return res.json({
                    success: true,
                    message: 'Xóa tất cả thành công!'
                })
            }

            let data = await missionModel.findByIdAndDelete(id);

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