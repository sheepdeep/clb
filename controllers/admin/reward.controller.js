const gameModel = require('../../models/game.model');
const rewardModel = require('../../models/reward.model');
const utils = require('../../helpers/utils.helper');

const rewardController = {
    index: async (req, res, next) => {
        try {
            let games = await gameModel.find().lean();
            let filters = {};
            let perPage = 10;
            let page = req.query.page || 1;
            let _sort = { updatedAt: 'desc' };

            if (req.query?.perPage) {
                perPage = req.query.perPage;
            }

            if (req.query?.search) {
                let search = req.query.search;

                filters.content = { $regex: search };
                res.locals.search = search;
            }

            if (req.query?.gameType) {
                filters.gameType = req.query.gameType;
            }

            if (req.query?.resultType) {
                let resultVaild = ['end', 'count_3', 'minus_3'];
                resultVaild.includes(req.query.resultType) && (filters.resultType = req.query.resultType);
            }

            if (req.query.hasOwnProperty('_sort')) {
                _sort = {
                    [req.query.column]: req.query._sort
                }
            }

            let pageCount = await rewardModel.countDocuments(filters);
            let pages = Math.ceil(pageCount / perPage);

            if (req.query?.page) {
                req.query.page > pages ? page = pages : page = req.query.page;
            }

            let rewards = await rewardModel.find(filters).skip((perPage * page) - perPage).sort(_sort).limit(perPage).lean();

            res.render('admin/reward', {
                title: 'Quản Lý Trả Thưởng', games, rewards, perPage, pagination: {
                    page,
                    pageCount,
                    limit: pages > 5 ? 5 : pages,
                    query: utils.checkQuery(res.locals.originalUrl.search, ['page']),
                    baseURL: res.locals.originalUrl.pathname
                }
            })
        } catch (err) {
            next(err);
        }
    },
    add: async (req, res, next) => {
        try {
            let { gameType, content, numberTLS, amount, resultType } = req.body;

            if (!content || !gameType || !numberTLS || !amount || !resultType) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập đầy đủ thông tin!'
                })
            }

            if (!await gameModel.findOne({ gameType })) {
                return res.json({
                    success: false,
                    message: 'Loại game này không tồn tại!'
                })
            }

            let newReward = await new rewardModel({
                content,
                gameType,
                numberTLS: numberTLS.replace(/\s+/g, '').split('-').filter(item => item),
                amount,
                resultType
            }).save();

            socket.emit('rewardData', gameType);
            res.json({
                success: true,
                message: 'Thêm thành công!',
                data: newReward
            })
        } catch (err) {
            next(err);
        }
    },
    update: async (req, res, next) => {
        try {
            let id = req.params.id;
            let { gameType } = req.body;

            if (gameType && !await gameModel.findOne({ gameType })) {
                return res.json({
                    success: false,
                    message: 'Loại game này không tồn tại!'
                })
            }

            let data = await rewardModel.findByIdAndUpdate(id, { $set: { ...req.body } });

            if (!data) {
                return res.json({
                    success: false,
                    message: 'Không tìm thấy #' + id
                })
            }

            gameType ? socket.emit('rewardData', gameType) : socket.emit('rewardData', data.gameType);
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

            let data = await rewardModel.findByIdAndDelete(id);

            if (!data) {
                return res.json({
                    success: false,
                    message: 'Không tìm thấy #' + id
                })
            }

            socket.emit('rewardData', data.gameType);
            res.json({
                success: true,
                message: 'Xóa thành công #' + id
            })
        } catch (err) {
            next(err);
        }
    },
    checkPer: async (req, res, next) => {
        if (!res.locals.profile.permission.useGame) {
            return res.json({
                success: false,
                message: 'Không có quyền thao tác!'
            })
        }

        next();
    }
}

module.exports = rewardController;