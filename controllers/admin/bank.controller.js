const moment = require('moment');
const bankModel = require('../../models/bank.model');
const momoService = require('../../services/momo.service');
const utils = require('../../helpers/utils.helper');
const mbbankHelper = require('../../helpers/mbbank.helper');
const ncbHelper = require('../../helpers/ncb.helper');

const momoController = {
    index: async (req, res, next) => {
        try {
            let threads = [];
            let filters = {};
            let perPage = 10;
            let page = req.query.page || 1;
            let _sort = {updatedAt: 'desc'};

            if (req.query?.perPage) {
                perPage = req.query.perPage;
            }

            if (req.query?.search) {
                let search = req.query.search;

                filters.$or = [
                    {
                        phone: {$regex: search}
                    },
                    {
                        name: {$regex: search}
                    }
                ]

                if (!isNaN(search)) {
                    filters.$or.push(...[
                        {amount: search},
                        {betMax: search},
                        {betMin: search},
                        {number: search},
                        {limitDay: search},
                        {limitMonth: search}
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

            let pageCount = await bankModel.countDocuments(filters);
            let pages = Math.ceil(pageCount / perPage);

            if (req.query?.page) {
                req.query.page > pages ? page = pages : page = req.query.page;
            }

            let count = await bankModel.aggregate([{$group: {_id: null, balance: {$sum: '$balance'}}}]);
            let data = await bankModel.find(filters).skip((perPage * page) - perPage).sort(_sort).limit(perPage).lean();

            for (let momo of data) {
                threads.push(momoService.dataInfo(momo, true));
            }

            let list = await Promise.all(threads);
            res.render('admin/bank', {
                title: 'Quản Lý Ngân Hàng', list, count: !count.length ? 0 : count[0].balance, perPage, pagination: {
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
            const {username, password, accountNumber, bankType} = req.body;
            if (!username || !password || !accountNumber || !bankType) {
                return res.json({
                    success: false,
                    message: 'Vui lòng điền đầy đủ thông tin'
                })
            }

            await bankModel.findOneAndUpdate({accountNumber, bankType}, {
                $set: {
                    username,
                    password,
                    accountNumber,
                    bankType,
                    status: 'pending',
                    loginStatus: 'wait',
                    reward: false
                }
            }, {upsert: true})

            if (bankType === 'mbb') {
                return res.json(await mbbankHelper.login(accountNumber, bankType));
            }

            if (bankType === 'ncb') {
                await bankModel.findOneAndUpdate({accountNumber, bankType}, {
                    $set: {
                        username,
                        password,
                        accountNumber,
                        bankType,
                        status: 'wait',
                        loginStatus: 'success',
                        reward: false
                    }
                }, {upsert: true})
                return res.json({
                    success: true,
                    message: 'Thêm tài khoản NCB thành công!'
                });
            }

        } catch (err) {
            next(err);
        }
    },
    data: async (req, res, next) => {
        try {
            let phone = req.params.phone;

            let data = await bankModel.findOne({phone}).lean();

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

            let data = await bankModel.findByIdAndUpdate(id, {$set: {...req.body}});

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
            let data = await bankModel.findByIdAndDelete(id);

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
    refresh: async (req, res, next) => {
        try {
            let {id} = req.body;
            let data = await bankModel.findById(id);

            if (data.bankType == 'mbb') {
                const result = await mbbankHelper.login(data.accountNumber, data.bankType);
                return res.json(result);
            } else {
                await bankModel.findOneAndUpdate({accountNumber: data.accountNumber, bankType: data.bankType}, {
                    $set: {
                        otp: null,
                        reward: false
                    }
                }, {upsert: true})
                return res.json({
                    success: true,
                    message: `Làm lại thông tin NCB ${data.accountNumber} thành công!`
                });
            }

        } catch (err) {
            next(err);
        }
    },
    checkTrans: async (req, res, next) => {
        try {
            const banks = await bankModel.find().lean();

            let histories = [];
            let startTime = req.query?.startTime ? moment(req.query.startTime).format('DD/MM/YYYY') : moment().subtract(3, "days").format("DD/MM/YYYY");
            let endTime = req.query?.endTime ? moment(req.query.endTime).format('DD/MM/YYYY') : moment().format("DD/MM/YYYY");

            if (req.query?.accountNumber) {

                const dataBank = await bankModel.findOne({accountNumber: req.query.accountNumber}).lean();

                if (dataBank.bankType == 'mbb') {

                    const result = await mbbankHelper.history(dataBank.accountNumber, dataBank.bankType, startTime, endTime);
                    await mbbankHelper.handleTransId(result, dataBank, 0);

                    histories = result;

                }
            }

            res.render('admin/bank-checkTrans', {banks, histories});
        } catch (e) {
            console.log(e);
        }
    }

}

module.exports = momoController;