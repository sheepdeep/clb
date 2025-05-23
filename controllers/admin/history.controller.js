const moment = require('moment');
const historyModel = require('../../models/history.model');
const gameModel = require('../../models/game.model');
const momoModel = require('../../models/bank.model');
const historyHelper = require('../../helpers/history.helper');
const momoHelper = require('../../helpers/momo.helper');
const utils = require('../../helpers/utils.helper');
const settingModel = require('../../models/setting.model');
const bankModel = require('../../models/bank.model');

const historyController = {
    index: async (req, res, next) => {
        try {
            let filters = {};
            let perPage = 10;
            let page = req.query.page || 1;
            let _sort = { createdAt: 'desc' };

            filters.bot = false;

            if (req.query?.perPage) {
                perPage = req.query.perPage;
            }

            if (req.query?.result) {
                let vaildStatus = ['wait', 'ok', 'win', 'lose', 'error', 'refund', 'notUser'];

                if (vaildStatus.includes(req.query.result)) {
                    filters.result = req.query.result;

                    res.locals.result = req.query.result;
                }
            }

            if (req.query?.paid) {
                let vaildStatus = ['wait', 'hold', 'sent', 'bankerror'];

                if (vaildStatus.includes(req.query.paid)) {
                    filters.paid = req.query.paid;

                    res.locals.paid = req.query.paid;
                }
            }

            if (req.query?.io) {
                if (req.query.io == -1 || req.query.io == 1) {
                    filters.io = Number(req.query.io);

                    res.locals.io = req.query.io;
                }
            }

            if (req.query.gameType) {
                filters.gameType = req.query.gameType;

                res.locals.gameType = req.query.gameType;
            }

            if (req.query?.search) {
                let search = req.query.search;
                let arr = [
                    {
                        transId: { $regex: search }
                    },
                    {
                        username: { $regex: search }
                    },
                    {
                        comment: { $regex: search }
                    },
                    {
                        gameName: { $regex: search }
                    },
                    {
                        gameType: { $regex: search }
                    }
                ];

                filters.$or ? filters.$or.push(...arr) : filters.$or = arr;

                if (!isNaN(search)) {
                    filters.$or.push(...[
                        { amount: search },
                        { bonus: search },
                        { postBalance: search }
                    ])
                }

                res.locals.search = search;
            }

            if (req.query.hasOwnProperty('_sort')) {
                _sort = {
                    [req.query.column]: req.query._sort
                }
            }

            let pageCount = await historyModel.countDocuments(filters);
            let pages = Math.ceil(pageCount / perPage);

            if (req.query?.page) {
                req.query.page > pages ? page = pages : page = req.query.page;
            }

            let games = await gameModel.find().lean();
            let phones = await momoModel.find({ status: 'active', loginStatus: 'active' }).lean();
            let list = await historyModel.find(filters).skip((perPage * page) - perPage).sort(_sort).limit(perPage).lean();

            res.render('admin/history', {
                title: 'Lịch Sử Giao Dịch', list, games, phones, perPage, pagination: {
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
    update: async (req, res, next) => {
        try {
            const dataSetting = await settingModel.findOne();
            let id = req.params.id;

            if (!res.locals.profile.permission.editHis || (req.body.comment && !res.locals.profile.permission.editComment)) {
                return res.json({
                    success: false,
                    message: 'Không có quyền thao tác!'
                })
            }

            let data = await historyModel.findById(id);

            if (!data) {
                return res.json({
                    success: false,
                    message: 'Không tìm thấy #' + id
                })
            }

            for (let key in req.body) {

                if (req.body.result == 'refund') {

                    const transId = `SBRF${Math.floor(Math.random() * (99999999 - 10000000) + 10000000)}`;

                    let bonus = 0;
                    if (data.result == 'lose') {
                        bonus = Math.floor(data.amount * dataSetting.refund.won / 100);
                    } else if (data.result == 'wrong') {
                        bonus = Math.floor(data.amount * dataSetting.refund.fail / 100);
                    }


                    await historyModel.findOneAndUpdate({transId}, {
                        $set: {
                            transId,
                            username: data.username,
                            receiver: data.receiver,
                            gameName: data.gameName,
                            gameType: data.gameType,
                            amount: bonus,
                            bonus,
                            result: 'refund',
                            paid: 'wait',
                            comment: data.comment,
                            description: `Hoàn tiền đơn thua ${data.transId}`,
                        }
                    }, {upsert: true}).lean();
                } else {
                    await historyModel.findByIdAndUpdate(id, {
                        $set: {
                            ...req.body,
                        }
                    });
                }

                await historyModel.findByIdAndUpdate(id, {
                    $push: {
                        action: {
                            username: res.locals.profile.username,
                            key,
                            value: req.body[key],
                            createdAt: moment().toDate()
                        }
                    }
                });
            }

            return res.json({
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

            if (!res.locals.profile.permission.delHis) {
                return res.json({
                    success: false,
                    message: 'Không có quyền thao tác!'
                })
            }

            if (id == 'all') {
                if (res.locals.profile.admin == 1) {
                    await historyModel.deleteMany();
                    return res.json({
                        success: true,
                        message: 'Xóa tất cả thành công!'
                    })
                }

                return res.json({
                    success: false,
                    message: 'Không có quyền thao tác!'
                })

            }

            let data = await historyModel.findById(id);

            if (!data) {
                return res.json({
                    success: false,
                    message: 'Không tìm thấy #' + id
                })
            }

            if (data.action.length && res.locals.profile.level != 1) {
                return res.json({
                    success: false,
                    message: 'Không thể xóa giao dịch đã bị thao tác!'
                })
            }

            await data.remove();

            return res.json({
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

            if (!transId) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập mã giao dịch!'
                })
            }

            let data = await historyModel.findOne({ transId });

            if (!data) {
                return res.json({
                    success: false,
                    message: 'Không tìm thấy dữ liệu!'
                })
            }

            await historyModel.findOneAndUpdate({transId}, {
                    $set: {
                        paid: 'wait',
                    }
                }
            )

            return res.json({
                success: true,
                message: `Trả thưởng lại thành công #${data.transId}`
            })

        } catch (err) {
            next(err);
        }
    },
    reCheck: async (req, res, next) => {
        try {
            let { transId } = req.body;

            if (!transId) {
                return res.json({
                    success: false,
                    message: 'Thiếu dữ liệu đường truyền!'
                })
            }

            let data = await historyModel.findOneAndUpdate({ transId }, {resutl: 'wait'});

            if (!data) {
                return res.json({
                    success: false,
                    message: 'Không tìm thấy mã giao dịch này!'
                })
            }

            await historyHelper.handleTransId(transId);

            return res.json({
                success: true,
                message: 'Thực hiện lại thành công!'
            })

        } catch (err) {
            next(err);
        }
    },
    checkAction: async (req, res, next) => {
        try {
            let { transId } = req.body;

            if (!transId) {
                return res.json({
                    success: false,
                    message: 'Thiếu dữ liệu đường truyền!'
                })
            }

            let data = await historyModel.findOne({ transId }).lean();

            if (!data) {
                return res.json({
                    success: false,
                    message: 'Không tìm thấy mã giao dịch này!'
                })
            }

            return res.json({
                success: true,
                message: 'Lấy thành công!',
                data: data.action
            })
        } catch (err) {
            next(err);
        }
    }
}

module.exports = historyController;
