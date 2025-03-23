const moment = require('moment');
const crypto = require('crypto');
const momoModel = require('../../models/momo.model');
const transferModel = require('../../models/transfer.model');
const momoHelper = require('../../helpers/momo.helper');
const telegramHelper = require('../../helpers/telegram.helper');
const utils = require('../../helpers/utils.helper');

const transferController = {
    index: async (req, res, next) => {
        try {
            let phones = await momoModel.find().lean();

            res.render('admin/transfer', {
                title: 'Chuyển Tiền Momo',
                phones
            });
        } catch (err) {
            next(err);
        }
    },
    transfer: async (req, res, next) => {
        try {
            let { phone, receiver, amount, comment, otp } = req.body;

            if (!phone || !receiver || !amount) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập đầy đủ thông tin!'
                })
            }

            let check = await momoModel.findOne({ phone: receiver });

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

            await telegramHelper.sendText(process.env.privateTOKEN, process.env.privateID, `* [ ${res.locals.profile.username} ] vừa thao tác chuyển tiền trên web \n* [ ${phone} | ${receiver} | ${Intl.NumberFormat('en-US').format(amount)} | ${comment || null} ]`)

            let data = await momoHelper.moneyTransfer(phone, { phone: receiver, amount, comment });

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
                    transId: { $regex: search }
                },
                {
                    transfer: { $regex: search }
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
    }
}

module.exports = transferController;