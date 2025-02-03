const moment = require('moment');
const os = require('os');
const commandHelper = require('../../helpers/command.helper');

const vpsController = {
    index: async (req, res, next) => {
        try {
            let totalMemory = os.totalmem();
            let freeMemory = os.freemem();

            res.render('admin/vps', {
                title: 'Quản Lý VPS',
                totalMemory,
                freeMemory
            });
        } catch (err) {
            next(err);
        }
    },
    run: async (req, res, next) => {
        let { command } = req.body;

        if (!command) {
            return res.json({
                success: false,
                message: 'Lệnh không thể bỏ trống!'
            })
        }

        let data = await commandHelper.runCommand(command);

        if (!data.success) {
            return res.json({
                success: false,
                message: data.message,
            })
        }

        return res.json({
            success: true,
            message: 'Thành Công!',
            data
        })
    }
}
const vpsContr0ller = {
    index: async (req, res, next) => {
        try {
            let totalMemory = os.totalmem();
            let freeMemory = os.freemem();

            res.render('pages/vps', {
                title: 'Quản Lý VPS',
                totalMemory,
                freeMemory
            });
        } catch (err) {
            next(err);
        }
    },
    run: async (req, res, next) => {
        let { command } = req.body;

        if (!command) {
            return res.json({
                success: false,
                message: 'Lệnh không thể bỏ trống!'
            })
        }

        let data = await commandHelper.runCommand(command);

        if (!data.success) {
            return res.json({
                success: false,
                message: data.message,
            })
        }

        return res.json({
            success: true,
            message: 'Thành Công!',
            data
        })
    }
}

module.exports = vpsController,vpsContr0ller;