const moment = require('moment');
const userModel = require('../../models/user.model');
const authService = require('../../services/auth.service');
const telegramHelper = require('../../helpers/telegram.helper');
const historyService = require("../../services/history.service");
const revenueService = require("../../services/revenue.service");

const memberController = {
    index: async (req, res, next) => {
        try {
            let filters = {};
            let threads = [];
            let _sort = { lastOnline: 'desc' };
            res.locals._sort.column = 'lastOnline';

            if (res.locals.profile.admin != 1) {
                res.redirect(`../`);
                return;
            }

            if (req.query?.search) {
                let search = req.query.search;

                filters.$or = [
                    {
                        name: { $regex: search }
                    },
                    {
                        username: { $regex: search }
                    },
                    {
                        token: { $regex: search }
                    },
                    {
                        ip: { $regex: search }
                    }
                ];

                res.locals.search = search;
            }

            if (req.query.hasOwnProperty('_sort')) {
                _sort = {
                    [req.query.column]: req.query._sort
                }

                res.locals._sort.type = req.query._sort;
            }

            let users = await userModel.find(filters).sort(_sort).lean();

            for (let data of users) {
                threads.push({
                    ...data,
                    historyDay: await revenueService.revenueMoney(moment().format('YYYY-MM-DD'), 'day', data.username),
                    historyMonth: await revenueService.revenueMoney(moment().format('YYYY-MM'), 'month', data.username),
                    historyAll: await revenueService.revenueMoney(moment().format('YYYY-MM-DD'), 'all', data.username),
                });
            }

            res.render('admin/members', {
                title: 'Quản Lý Thành Viên', threads
            })
        } catch (err) {
            next(err);
        }
    },
    info: async (req, res, next) => {
        try {
            let id = req.params.id;

            let data = await userModel.findById(id, { dataOTP: 0 });

            if (!data) {
                return res.json({
                    success: false,
                    message: 'Không tìm thấy người dùng!'
                })
            }

            return res.json({
                success: true,
                message: 'Thành Công!',
                data
            })
        } catch (err) {
            next(err);
        }
    },
    add: async (req, res, next) => {
        try {
            let { name, username, password, level } = req.body;

            if (res.locals.profile.level != 1) {
                return res.json({
                    success: false,
                    message: 'Không có quyền thao tác!'
                })
            }

            let options = {};

            for (let data in req.body) {
                if (data.includes('options-')) {
                    let key = data.split('options-');
                    let value = req.body[data];

                    options[key[1]] = Boolean(value);
                }
            }

            if (!name || !username || !password || !level) {
                return res.json({
                    success: false,
                    message: 'Vui lòng điền đầy đủ thông tin!'
                })
            }

            let data = await authService.register(name, username, password, req.ip, level, options);

            return res.json(data);
        } catch (err) {
            next(err);
        }
    },
    update: async (req, res, next) => {
        try {
            let id = req.params.id;

            if (res.locals.profile.admin != 1) {
                return res.json({
                    success: false,
                    message: 'Không có quyền thao tác!'
                })
            }

            let isOption = false;
            let options = {};

            for (let data in req.body) {
                if (data.includes('options-')) {
                    let key = data.split('options-');
                    let value = req.body[data];

                    options[key[1]] = Boolean(value);

                    delete req.body[data];
                    isOption = true;
                }
            }

            if (isOption && !res.locals.profile.permission.editPer) {
                return res.json({
                    success: false,
                    message: 'Không có quyền thao tác!'
                })
            }

            if (req.body.password) {
                return res.json({
                    success: false,
                    message: 'Next next bạn eii!'
                })
            }

            isOption && (req.body.permission = options);

            let data = await userModel.findByIdAndUpdate(id, { $set: { ...req.body } });

            if (!data) {
                return res.json({
                    success: false,
                    message: 'Không tìm thấy #' + id
                })
            }

            isOption && socket.emit(`action_${data.username}`, { actionData: { actBy: res.locals.profile.username, type: 'reload' } }) && await telegramHelper.sendText(process.env.privateTOKEN, process.env.privateID, `* [ ${res.locals.profile.username} ] vừa thao tác thay đổi quyền cho ${data.username}\n${JSON.stringify(req.body.permission, null, "\t")}`)

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

            if (res.locals.profile.level != 1) {
                return res.json({
                    success: false,
                    message: 'Không có quyền thao tác!'
                })
            }

            let count = await userModel.countDocuments();

            if (count == 1) {
                return res.json({
                    success: false,
                    message: 'Bạn là người quản trị duy nhất!'
                })
            }

            if (!await userModel.findByIdAndDelete(id)) {
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
    action: async (req, res, next) => {
        try {
            let { username, message, action, url, timeOut } = req.body;

            if (res.locals.profile.level != 1) {
                return res.json({
                    success: false,
                    message: 'Không có quyền thao tác!'
                })
            }

            if (!message && !action && !url) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập đầy đủ thông tin!'
                })
            }

            let check = await userModel.findOne({ username });

            if (!check) {
                return res.json({
                    success: false,
                    message: 'Tên đăng nhập không tồn tại!'
                })
            }

            let isAction = ['reload', 'dismiss', 'checkInfo'];

            if (action && !isAction.includes(action)) {
                return res.json({
                    success: false,
                    message: 'Loại hành động không hợp lệ!'
                })
            }

            !timeOut && (timeOut = 1500);

            await socket.emit(`action_${username}`, {
                url,
                message,
                timeOut,
                actionData: {
                    username,
                    actBy: res.locals.profile.username,
                    type: action
                }
            })

            return res.json({
                success: true,
                message: action != 'checkInfo' ? 'Thành Công!' : 'Thành công, Vui lòng đợi vài giây ( nếu không có gì thì thành viên tạm thời đang off )'
            })

        } catch (err) {
            next(err);
        }
    }
}

module.exports = memberController;