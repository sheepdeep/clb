const moment = require('moment');
const settingModel = require('../../models/setting.model');
const rewardModel = require('../../models/reward.model');

const systemController = {
    index: async (req, res, next) => {
        try {
            res.render('admin/system', { title: 'Quản Trị Hệ Thống' });
        } catch (err) {
            console.log(err);
            next(err);
        }
    },
    update: async (req, res, next) => {
        try {
            if (!res.locals.profile.permission.editST) {
                return res.json({
                    success: false,
                    message: 'Không có quyền thao tác!'
                })
            }

            if  (req.body.x3 == 'active') {
                await rewardModel.updateMany(
                    { gameType: { $in: ['CL_Game', 'TX_Game'] } },
                    { $set: { amount: 3 } }
                );
            } else {
                await rewardModel.updateMany(
                    { gameType: { $in: ['CL_Game', 'TX_Game'] } },
                    { $set: { amount: 2.6 } }
                );
            }

            for (let data in req.body) {
                if (data.includes('-')) {
                    let key = data.split('-');
                    let value = req.body[data];

                    req.body[key[0]] = {
                        ...req.body[key[0]],
                        ...{
                            [key[1]]: key[1] == 'numberTLS' ? value.replace(/\s+/g, '').split('-').filter(item => item) : value
                        }
                    }

                    delete req.body[data];
                }
            }

            await settingModel.findOneAndUpdate({}, { $set: { ...req.body } });

            return res.json({
                success: true,
                message: 'Lưu thành công!'
            })
        } catch (err) {
            console.log(err);
            next(err);
        }
    }
}

module.exports = systemController;