const moment = require('moment');
const crypto = require('crypto');
const momoModel = require('../../models/momo.model');
const transferModel = require('../../models/transfer.model');
const momoHelper = require('../../helpers/momo.helper');
const telegramHelper = require('../../helpers/telegram.helper');
const utils = require('../../helpers/utils.helper');
const utilsVsign = require('../../helpers/utilVsign.helper');
const zaloModel = require('../../models/zalo.model');
const zaloHelper = require('../../helpers/zalo.helper')
const oldBank = require("../../json/bank.json");

const transferController = {
    index: async (req, res, next) => {
        try {
            let phones = await momoModel.find().lean();

            let banks = utilsVsign.BANK_LIST;

            res.render('admin/transfer-bank', {
                title: 'Chuyển Tiền Bank',
                phones,
                banks
            });
        } catch (err) {
            next(err);
        }
    },
    transfer: async (req, res, next) => {
        try {
            let { phone, bankCode, accountNumber, amount, comment, otp } = req.body;

            if (!phone || !accountNumber || !bankCode || !amount) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập đầy đủ thông tin!'
                })
            }

            let check = await momoModel.findOne({ phone: accountNumber });

            if (!check && !res.locals.profile.permission.useTrans || check && !res.locals.profile.permission.exTrans && !res.locals.profile.permission.useTrans) {
                return res.json({
                    success: false,
                    message: 'Không có quyền thao tác!'
                })
            }


            if (!check) {
                if (!otp) {
                    return res.json({
                        success: false,
                        message: 'Vui lòng nhập mã OTP!'
                    })
                }

                let verifyOTP = await utils.OTP('verify', {
                    otp: crypto.createHash('md5').update(otp).digest("hex"),
                    username: res.locals.profile.username,
                    action: 'useTrans',
                });

                if (!verifyOTP.success) {
                    return res.json({
                        success: false,
                        message: verifyOTP.message
                    })
                }
            }

            await telegramHelper.sendText(process.env.privateTOKEN, process.env.privateID, `* [ ${res.locals.profile.username} ] vừa thao tác chuyển tiền trên web \n* [ ${phone} | ${bankCode} | ${accountNumber} | ${Intl.NumberFormat('en-US').format(amount)} | ${comment || null} ]`)

            let data = await momoHelper.INIT_TOBANK(phone, { accountNumber, bankCode, amount, comment });

            if (data.success) {
            }

            return res.json(data);
        } catch (err) {
            next(err);
        }
    },
    showTrans: async (req, res, next) => {
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
                    receiver: { $regex: search }
                },
                {
                    comment: { $regex: search }
                }
            ]

            if (!isNaN(search)) {
                filters.$or.push(...[
                    { transId: search },
                    { firstMoney: search },
                    { amount: search },
                    { lastMoney: search }
                ])
            }

            res.locals.search = search;
        }

        if (req.query.hasOwnProperty('_sort')) {
            _sort = {
                [req.query.column]: req.query._sort
            }
        }

        let pageCount = await transferModel.countDocuments(filters);
        let pages = Math.ceil(pageCount / perPage);

        if (req.query?.page) {
            req.query.page > pages ? page = pages : page = req.query.page;
        }

        let transfer = await transferModel.find(filters).skip((perPage * page) - perPage).sort(_sort).limit(perPage).lean();

        res.render('admin/history-transfer', {
            title: 'Lịch Sử Chuyển Tiền', transfer, perPage, pagination: {
                page,
                pageCount,
                limit: pages > 5 ? 5 : pages,
                query: utils.checkQuery(res.locals.originalUrl.search, ['page']),
                baseURL: res.locals.originalUrl.pathname
            }
        })
    },
    delTrans: async (req, res, next) => {
        try {
            let id = req.params.id;

            if (!res.locals.profile.permission.delTrans) {
                return res.json({
                    success: false,
                    message: 'Không có quyền thao tác!'
                })
            }

            if (id == 'all') {
                if (res.locals.profile.level == 1) {
                    await transferModel.deleteMany();
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

            if (!await transferModel.findByIdAndDelete(id)) {
                return res.json({
                    success: false,
                    message: 'Không tìm thấy #' + id
                })
            }

            return res.json({
                success: true,
                message: 'Xóa thành công #' + id
            })
        } catch (err) {
            next(err);
        }
    },
    zaloToBank: async (req, res, next) => {
        try {
            let { phone, bankCode, accountNumber, amount, comment, otp } = req.body;

            if (!phone || !accountNumber || !bankCode || !amount) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập đầy đủ thông tin!'
                })
            }

            let check = await zaloModel.findOne({ phone: phone }).lean();

            if (!check && !res.locals.profile.permission.useTrans || check && !res.locals.profile.permission.exTrans && !res.locals.profile.permission.useTrans) {
                return res.json({
                    success: false,
                    message: 'Không có quyền thao tác!'
                })
            }

            if (!check) {
                if (!otp) {
                    return res.json({
                        success: false,
                        message: 'Vui lòng nhập mã OTP!'
                    })
                }

                let verifyOTP = await utils.OTP('verify', {
                    otp: crypto.createHash('md5').update(otp).digest("hex"),
                    username: res.locals.profile.username,
                    action: 'useTrans',
                });

                if (!verifyOTP.success) {
                    return res.json({
                        success: false,
                        message: verifyOTP.message
                    })
                }
            }

            const checkBank = oldBank.data.find(bank => bank.bin === bankCode);

            const dataTransfer = { accountNumber, bankCode: checkBank.code, amount, comment }


            res.json(await zaloHelper.zaloToBank(check.phone, dataTransfer));


            // let data = await momoHelper.moneyTransferBank(phone, { bankAccountNumber: accountNumber, bankCode, amount, comment, accountName: 'NGUYEN TIEN DUNG' });
        } catch (e) {
            next(e);
        }
    }
}

module.exports = transferController;
