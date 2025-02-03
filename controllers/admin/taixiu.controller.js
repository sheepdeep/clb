const turnTaiXiuModel = require("../../models/turn.taixiu.model");
const momoModel = require("../../models/bank.model");
const utils = require("../../helpers/utils.helper");
const taiXiuService = require("../../services/taixiu.service");
const settingModel = require("../../models/setting.model");
const historyTaiXiuModel = require("../../models/history-taixiu.model");
const gameModel = require("../../models/game.model");
const moment = require("moment/moment");

const taixiuController = {
    index: async (req, res, next) => {
        try {
            let threads = [];
            let filters = {};
            let perPage = 10;
            let page = req.query.page || 1;
            let _sort = {updatedAt: 'desc'};
            const dataSetting = await settingModel.findOne({});

            if (req.query?.search) {
                filters.$or = [
                    {
                        turn: {$regex: req.query.search}
                    }
                ];
                res.locals.search = req.query.search;
            }

            if (req.query.hasOwnProperty('_sort')) {
                _sort = {
                    [req.query.column]: req.query._sort
                }
            }

            let pageCount = await turnTaiXiuModel.countDocuments(filters);
            let pages = Math.ceil(pageCount / perPage);

            if (req.query?.page) {
                req.query.page > pages ? page = pages : page = req.query.page;
            }

            let dataTurns = await turnTaiXiuModel.find(filters).skip((perPage * page) - perPage).sort(_sort).limit(perPage).lean();

            for (let turn of dataTurns) {
                threads.push(taiXiuService.dataInfo(turn, true));
            }

            let turn = await turnTaiXiuModel.findOne({status: 'running', turn: dataSetting.banTaiXiu.turn}).lean();

            let list = await Promise.all(threads);
            res.render('admin/taixiu', {
                title: 'Quản Lý Phiên', list, perPage, turn, pagination: {
                    page,
                    pageCount,
                    limit: pages > 5 ? 5 : pages,
                    query: utils.checkQuery(res.locals.originalUrl.search, ['page']),
                    baseURL: res.locals.originalUrl.pathname
                }
            })
        } catch (err) {
            console.log(err);
            next(err);
        }
    },
    chinhCau: async (req, res, next) => {
        try {
            const dataSetting = await settingModel.findOne({});
            const {type} = req.body;
            if (type === 'one') {
                const turn = await turnTaiXiuModel.findOne({
                    status: 'running',
                    turn: dataSetting.banTaiXiu.turn
                }).lean();

                if (!turn) {
                    return res.json({
                        success: false,
                        message: 'Phiên không tồn tại hoặc đã xong!'
                    })
                }

                const {xucxac1, xucxac2, xucxac3} = req.body;

                await turnTaiXiuModel.findOneAndUpdate({
                    status: 'running',
                    turn: dataSetting.banTaiXiu.turn
                }, {
                    $set: {
                        xucxac1,
                        xucxac2,
                        xucxac3,
                        result: parseInt(xucxac1) + parseInt(xucxac2) + parseInt(xucxac3)
                    }
                });

                return res.json({
                    success: true,
                    message: 'Chỉnh cầu thành công!'
                })
            }

            if (type === 'tai') {
                while (true) {
                    let xucxac1 = Math.floor(Math.random() * 6) + 1, xucxac2 = Math.floor(Math.random() * 6) + 1,
                        xucxac3 = Math.floor(Math.random() * 6) + 1;

                    let result = xucxac1 + xucxac2 + xucxac3;

                    if (result > 10) {

                        await turnTaiXiuModel.findOneAndUpdate({
                            status: 'running',
                            turn: dataSetting.banTaiXiu.turn
                        }, {
                            $set: {
                                xucxac1,
                                xucxac2,
                                xucxac3,
                                result: parseInt(xucxac1) + parseInt(xucxac2) + parseInt(xucxac3)
                            }
                        });

                        return res.json({
                            success: true,
                            message: 'Thay đổi cầu thành công!'
                        });
                    }
                }
            }

            if (type === 'xiu') {
                while (true) {
                    let xucxac1 = Math.floor(Math.random() * 6) + 1, xucxac2 = Math.floor(Math.random() * 6) + 1,
                        xucxac3 = Math.floor(Math.random() * 6) + 1;

                    let result = xucxac1 + xucxac2 + xucxac3;

                    if (result <= 10) {

                        await turnTaiXiuModel.findOneAndUpdate({
                            status: 'running',
                            turn: dataSetting.banTaiXiu.turn
                        }, {
                            $set: {
                                xucxac1,
                                xucxac2,
                                xucxac3,
                                result: parseInt(xucxac1) + parseInt(xucxac2) + parseInt(xucxac3)
                            }
                        });

                        return res.json({
                            success: true,
                            message: 'Thay đổi cầu thành công!'
                        });
                    }
                }
            }

        } catch (e) {
            console.log(e);
        }
    },
    history: async (req, res, next) => {
        try {
            let filters = {};
            let perPage = 10;
            let page = req.query.page || 1;
            let _sort = {updatedAt: 'desc'};

            if (req.query?.perPage) {
                perPage = req.query.perPage;
            }

            if (req.query?.status) {
                let vaildStatus = ['waitTrasnfer', 'wait', 'transfer', 'recharge', 'errorComment', 'limitRefund', 'limitBet', 'refund', 'waitReward', 'waitRefund', 'win', 'won', 'errorMoney', 'limitPhone', 'errorPhone', 'phoneBlock'];

                if (vaildStatus.includes(req.query.status)) {
                    filters.status = req.query.status;

                    res.locals.status = req.query.status;
                }

                if (req.query.status == 'error') {
                    let allError = ['errorComment', 'limitRefund', 'limitBet', 'errorMoney', 'limitPhone', 'errorPhone', 'phoneBlock'];

                    filters.$or = allError.map((item) => {
                        return {status: item}
                    });

                    res.locals.status = req.query.status;
                }
            }

            if (req.query?.search) {
                let search = req.query.search;
                let arr = [
                    {
                        phone: {$regex: search}
                    },
                    {
                        comment: {$regex: search}
                    },
                    {
                        partnerId: {$regex: search}
                    }
                ];

                filters.$or ? filters.$or.push(...arr) : filters.$or = arr;

                if (!isNaN(search)) {
                    filters.$or.push(...[
                        {transId: search},
                        {amount: search},
                        {bonus: search},
                        {postBalance: search}
                    ])
                }

                res.locals.search = search;
            }

            if (req.query.hasOwnProperty('_sort')) {
                _sort = {
                    [req.query.column]: req.query._sort
                }
            }

            let pageCount = await historyTaiXiuModel.countDocuments(filters);
            let pages = Math.ceil(pageCount / perPage);

            if (req.query?.page) {
                req.query.page > pages ? page = pages : page = req.query.page;
            }

            let list = await historyTaiXiuModel.find(filters).skip((perPage * page) - perPage).sort(_sort).limit(perPage).lean();

            res.render('admin/history-taixiu', {
                title: 'Lịch Sử Giao Dịch Tài Xỉu', list, perPage, pagination: {
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
    removeHistory: async (req, res, next) => {
        try {
            let id = req.params.id;

            if (!res.locals.profile.permission.delHis) {
                return res.json({
                    success: false,
                    message: 'Không có quyền thao tác!'
                })
            }

            if (id == 'all') {
                if (res.locals.profile.level == 1) {
                    await historyTaiXiuModel.deleteMany();
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

            let data = await historyTaiXiuModel.findById(id);

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
    updateHistory: async (req, res, next) => {
        try {
            let id = req.params.id;

            if (!res.locals.profile.permission.editHis || (req.body.comment && !res.locals.profile.permission.editComment)) {
                return res.json({
                    success: false,
                    message: 'Không có quyền thao tác!'
                })
            }

            let data = await historyTaiXiuModel.findById(id);

            if (!data) {
                return res.json({
                    success: false,
                    message: 'Không tìm thấy #' + id
                })
            }

            for (let key in req.body) {
                await historyTaiXiuModel.findByIdAndUpdate(id, {
                    $set: {
                        ...req.body,
                    }
                });

                await historyTaiXiuModel.findByIdAndUpdate(id, {
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
    setting: async (req, res, next) => {
        try {
            res.render('admin/setting-taixiu', {title: 'Quản Trị Hệ Thống'});
        } catch (e) {
            console.log(e);
        }
    }
}

module.exports = taixiuController;