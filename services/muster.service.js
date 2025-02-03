const moment = require('moment');
const musterModel = require('../models/muster.model');

const musterService = {
    info: async () => {
        try {

            let lastData = await musterModel.findOne({ status: 'done', win: { $exists: true } }).sort({ createdAt: 'desc' });
            let nowData = await musterModel.findOne({ status: 'active' }).sort({ createdAt: 'desc' });
            let countBonus = await musterModel.aggregate([{ $match: { status: 'done', win: { $exists: true } } }, { $group: { _id: null, amount: { $sum: '$amount' } } }]);

            let data = {
                code: 'xnxx',
                count: 0,
                win: null,
                bonus: countBonus.length ? countBonus[0].amount : 0,
                second: 0
            }

            if (lastData) {
                data.code = lastData.code;
                data.count = lastData.players.length;
                data.second = 0;
            }

            if (nowData) {
                data.code = nowData.code;
                data.count = nowData.players.length;
                data.second = Math.max(0, nowData.timeDefault - Math.abs((moment(nowData.createdAt).valueOf() - moment().valueOf()) / 1000).toFixed(0));
            }

            return data;

        } catch (err) {
            console.log(err);
            return;
        }
    },
    getHistory: async (limit = 5) => {
        let list = [];
        let history = await musterModel.find({ status: 'done', win: { $exists: true } }).sort({ updatedAt: 'desc' }).limit(limit);

        for (let data of history) {
            list.push({
                code: data.code,
                phone: `${data.win.slice(0, 6)}****`,
                count: data.players.length,
                amount: data.amount,
                time: moment(data.createdAt).format('YYYY-MM-DD HH:mm:ss')
            })
        }

        return list;
    },
}

module.exports = musterService;