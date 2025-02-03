const settingModel = require('../models/setting.model');
const historyModel = require("../models/history.model");
const historyTaiXiuModel = require("../models/history-taixiu.model");
const historyEvent = require('../models/history-event.model');
const memberModel = require("../models/member.model");
const moment = require("moment/moment");
const { v4: uuidv4 } = require('uuid');
const eventHelper = require('../helpers/event.helper');

const eventController = {
    wheel: async (req, res, next) => {
        try {
            const dataSetting = await settingModel.findOne().lean();
            const {phone} = req.body;

            if (dataSetting.wheel.status === 'close') {
                return res.json({
                    success: false,
                    message: dataSetting.wheel.name + ' hiện đang bảo trì'
                })
            }

            if (!phone) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập số điện thoại!'
                })
            }

            const member = await memberModel.findOne({phone}).lean();
            if (member.event.countWheelDay == member.event.count) {
                return res.json({
                    success: false,
                    message: 'Bạn không đủ lượt quay để thực hiện!'
                })
            }

            let selectGift;
            const gifts = dataSetting.wheel.gift;

            const totalRatio = gifts.reduce((sum, gift) => sum + parseInt(gift.ratio), 0);

            // Tạo một số ngẫu nhiên từ 0 đến totalRatio
            const randomNumber = Math.random() * totalRatio;

            // Duyệt qua danh sách quà tặng và tìm món quà phù hợp
            let cumulativeRatio = 0;
            for (let gift of gifts) {
                cumulativeRatio += gift.ratio;
                if (randomNumber < cumulativeRatio) {
                    selectGift = gift;  // Chọn món quà này
                    break;
                }
            }

            let code = await uuidv4();

            await memberModel.findOneAndUpdate({phone, $set: {"event.countWheelDay": member.event.countWheelDay + 1}});

            await new historyEvent({
                phone,
                amount: selectGift.amount,
                status: 'wait',
                type: 'wheel',
                code
            }).save();

            eventHelper.rewardWheel(phone, code, selectGift.amount);

            return res.json({
                success: true,
                message: "Chúc mừng bạn nhận được " + selectGift.name,
                author: "ALOMOMO.me",
                gift: {
                    name: selectGift.name,
                    pos: selectGift.pos
                }
            });
        } catch (e) {
            console.log(e);
        }
    },
    checkCount: async (req, res, next) => {
        try {
            const dataSetting = await settingModel.findOne({});

            const {phone} = req.body;
            if (!phone) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập số điện thoại',
                })
            }

            let countPlay = await historyModel.aggregate([
                {
                    $match: {
                        partnerId: phone,  // Match based on partnerId (phone number)
                        gameType: { $exists: true, $ne: null },  // Only include documents where gameType exists and is not null
                        timeTLS: {
                            $gte: moment().startOf('day').toDate(),  // Start of the current month
                            $lt: moment().endOf('day').toDate(),  // End of the current month
                        },
                        $and: [
                            {
                                $or: [{ status: 'win' }, { status: 'won' }]  // Match documents with status 'win' or 'won'
                            }
                        ],
                    },
                },
                {
                    $group: { _id: null, amount: { $sum: '$amount' } },  // Sum the 'amount' field
                },
            ]);

            let [countPlayTX] = await Promise.all([historyTaiXiuModel.aggregate([{ $match: { partnerId: phone, createdAt: { $gte: moment().startOf('day').toDate(), $lt: moment().endOf('day').toDate() } } }, { $group: { _id: null, amount: { $sum: '$amount' } } }])]);

            countPlay = !countPlay.length ? 0 : countPlay[0].amount;
            countPlayTX = !countPlayTX.length ? 0 : countPlayTX[0].amount;

            let totalCount = countPlay + countPlayTX;

            if (totalCount <= dataSetting.wheel.amount) {
                return res.json({
                    success: false,
                    message: `Bạn phải chơi đủ ${Intl.NumberFormat('en-US').format(dataSetting.wheel.amount)}đ thì mới đủ điều kiện sử dụng!`
                });
            }

            const count = Math.floor(totalCount / dataSetting.wheel.amount);

            const member = await memberModel.findOne({phone}).lean();

            if (!member) {
                return res.json({
                    success: false,
                    message: 'Bạn chưa đăng ký số vui lòng đăng ký số!'
                });
            }

            let countWheelDay = await historyEvent.aggregate([
                {
                    $match: {
                        phone,  // Match the phone number
                        type: 'wheel',  // Match the event type
                        createdAt: {
                            $gte: moment().startOf('day').toDate(),  // Start of today
                            $lt: moment().endOf('day').toDate(),  // End of today (before midnight)
                        },
                    },
                },
                {
                    $group: {
                        _id: null,  // Group all matched documents together
                        amount: { $sum: '$amount' },  // Sum the 'amount' field
                        count: { $sum: 1 },  // Count the number of documents
                    },
                },
            ]);

            countWheelDay = !countWheelDay.length ? 0 : countWheelDay[0].count;

            await memberModel.findOneAndUpdate({phone}, { $set: { "event.count": count, "event.countWheelDay": countWheelDay } },
                { new: true });

            return res.json({
                success: true,
                message: `Hiện tại bạn đang có ${Intl.NumberFormat('en-US').format(member.event.count)} lượt đã sử dụng ${Intl.NumberFormat('en-US').format(countWheelDay)} lượt !`
            });


        } catch (e) {
            console.log(e);
            return res.json({
                success: false,
                message: 'Hệ thống chưa thể kiểm tra lịch sử chơi!'
            })
        }
    }
}

module.exports = eventController;