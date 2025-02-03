const moment = require('moment');
const momoService = require('../services/momo.service');
const historyService = require('../services/history.service');
const gameService = require('../services/game.service');
const momoHelper = require('../helpers/momo.helper');
const giftHelper = require('../helpers/gift.helper');
const historyHelper = require('../helpers/history.helper');
const historyModel = require('../models/history.model');
const rewardModel = require('../models/reward.model');
const gameModel = require('../models/game.model');
const momoModel = require('../models/bank.model');
const giftModel = require('../models/gift.model');
const blockModel = require('../models/block.model');
const shortid = require('shortid');
const crypto = require('crypto');
const axios = require("axios");
const memberModel = require('../models/member.model');
const settingModel = require('../models/setting.model');
const historyTaiXiuModel = require('../models/history-taixiu.model');
const historyEvent = require('../models/history-event.model');

const apiController = {
    betGame: async (req, res, next) => {
        try {
            const {comment, amount} = req.body;

            if (!comment || !amount) {
                return res.json({
                    success: false,
                    message: 'Vui lòng điền đầy đủ thông tin!'
                })
            }

            const reward = await rewardModel.findOne({comment}).lean();

            const game = await gameModel.findOne({gameType: reward.gameType, display: 'show'});

            if (!game) {
                return res.json({
                    success: false,
                    message: 'Game không tồn tại vui lòng thử lại'
                })
            }

            // lay random momo
            var momo = await momoModel.findOne({receiver: true, status: 'active'}).lean();

            if (!momo) {
                return res.json({
                    success: false,
                    message: 'Hiện tại đang hết số momo vui lòng đợi sau ít phút'
                })
            }


            if (momo.betMin > amount || momo.betMax < amount) {
                return res.json({
                    success: false,
                    message: 'Phiên tối thiểu là ' + Intl.NumberFormat('en-US').format(momo.betMin || 0) + 'VND và tối đa là ' + Intl.NumberFormat('en-US').format(momo.betMax || 0) + 'VND'
                })
            }

            const requestId = shortid.generate().toUpperCase().replace(/^\s+|\s+$/gm, '');
            const orderId = shortid.generate().toUpperCase().replace(/^\s+|\s+$/gm, '');
            const transId = Math.floor(Math.random() * (999999999 - 10000000 + 1)) + 10000000;
            const extraData = '';
            const redirectUrl = 'https://alomomo.me';
            const ipnUrl = 'https://facebook.com';
            const orderInfo = transId;
            const partnerCode = momo.partnerCode;

            // Thuc hien tao history
            const newOrder = await new historyModel({
                phone: momo.phone,
                phoneReceiver: momo.phone,
                transId: transId,
                amount,
                comment: comment,
                bonus: 0,
                targetId: momo.phone,
                targetName: momo.brandName,
                gameType: game.gameType,
                status: 'waitTransfer'
            }).save();
            // thuc hien lay link momo

            const rawSignature = 'accessKey=' + momo.accessKey + '&amount=' + amount + '&extraData=' + extraData +
                '&ipnUrl=' + ipnUrl + '&orderId=' + orderId + '&orderInfo=' + orderInfo +
                '&partnerCode=' + partnerCode + '&redirectUrl=' + redirectUrl +
                '&requestId=' + requestId + '&requestType=captureWallet';

            // Lấy giá trị HMAC dưới dạng Hex
            const signature = crypto.createHmac('sha256', momo.secretKey)
                .update(rawSignature)
                .digest('hex');

            let config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: 'https://payment.momo.vn/v2/gateway/api/create',
                headers: {
                    'Content-Type': 'application/json'
                },
                data: {
                    partnerCode: partnerCode,
                    partnerName: momo.brandName,
                    accessKey: momo.accessKey,
                    storeId: momo.storeKey,
                    requestId,
                    amount,
                    orderId,
                    orderInfo,
                    redirectUrl,
                    ipnUrl,
                    requestType: "captureWallet",
                    extraData,
                    lang: "vi",
                    signature,
                }
            };

            const {data: response} = await axios(config);

            const url = response.payUrl;

            const parsedUrl = new URL(url);

            const tParam = parsedUrl.searchParams.get('t');

            if (response.resultCode === 0) {
                return res.json({
                    success: true,
                    payUrl: 'momo://app?action=payWithApp&isScanQR=true&serviceType=qr&sid=' + tParam + '&v=3.0',
                    message: 'Thành công'
                });
            } else {
                return res.json({
                    success: false,
                    message: 'Vui lòng báo cho admin để được thực hiện!'
                });
            }

        } catch (e) {
            console.log(e);
            return res.json({
                success: false,
                message: 'Vui lòng báo cho admin để được thực hiện!'
            });
        }
    },
    getGame: async (req, res, next) => {
        try {
            let data = await gameService.getGame();
            res.json({
                success: true,
                message: 'Lấy thành công!',
                data
            })
        } catch (err) {
            console.log(err), next(err);
        }
    },
    getPhone: async (req, res, next) => {
        try {
            let data = await momoService.getPhone({
                status: 'active',
                loginStatus: 'active',
                receiver: true
            }, res.locals.settings.limitPhone);
            res.json({
                success: true,
                message: 'Lấy thành công!',
                data
            })
        } catch (err) {
            console.log(err), next(err);
        }
    },
    getReward: async (req, res, next) => {
        try {
            if (!req.body.gameType) {
                return res.json({
                    success: false,
                    message: 'Trường gameType không được bỏ trống!'
                })
            }

            const game = await gameModel.findOne({
                gameType: req.body.gameType, display: 'show'
            });

            let data = await rewardModel.find({gameType: game.gameType}, {_id: 0, __v: 0, resultType: 0});

            let list = [];

            for (let reward of data) {
                list.push({
                    gameType: reward.gameType,
                    content: res.locals.profile ? `${res.locals.profile.username} ${reward.content}` : `<a href="/dangnhap">ĐĂNG NHẬP</a>`,
                    numberTLS: reward.numberTLS,
                    amount: reward.amount
                })
            }

            !game ? res.json({
                success: false,
                message: 'Game này không tồn tại hoặc không hợp lệ!'
            }) : res.json({
                success: true,
                message: 'Lấy thành công!',
                data: list
            })

        } catch (err) {
            console.log(err);
            next(err);
        }
    },
    getHistory: async (req, res, next) => {
        try {
            let data = await historyService.getHistory();

            res.json({
                success: true,
                message: 'Lấy thành công!',
                data
            })
        } catch (err) {
            next(err);
        }
    },
    checkMission: async (req, res, next) => {
        try {
            if (!req.body.phone) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập số điện thoại!',
                })
            }

            if (res.locals.settings.missionData.status != 'active') {
                return res.json({
                    success: false,
                    message: 'Nhiệm vụ ngày đang bảo trì!',
                })
            }

            let phone = req.body.phone;
            let dataDay = await historyModel.aggregate([{
                $match: {
                    partnerId: phone,
                    timeTLS: {$gte: moment().startOf('day').toDate(), $lt: moment().endOf('day').toDate()},
                    $and: [{$or: [{status: 'win'}, {status: 'won'}]}]
                }
            }, {$group: {_id: null, amount: {$sum: '$amount'}}}]);

            let dataTXDay = await historyTaiXiuModel.aggregate([{ $match: { partnerId: phone, createdAt: { $gte: moment().startOf('day').toDate(), $lt: moment().endOf('day').toDate() } } }, { $group: { _id: null, amount: { $sum: '$amount' } } }]);

            if (!dataDay.length && !dataTXDay.lenght) {
                return res.json({
                    success: false,
                    message: 'Hôm nay bạn chưa chơi mini game trên hệ thống!'
                })
            }

            dataTXDay = !dataTXDay.length ? 0 : dataTXDay[0].amount;
            dataDay = !dataDay.length ? 0 : dataDay[0].amount;

            let totalCount = dataTXDay + dataDay;

            let phoneActive = await momoService.phoneRunTransfer();
            phoneActive = phoneActive[0];

            let getName = await momoHelper.checkName(phoneActive.phone, phone);
            let bonus = 0, j = 0;
            let missionData = res.locals.settings.missionData.data;

            for (let i = 0; i < missionData.length; i++) {
                if (totalCount < missionData[i].amount) continue;
                bonus = missionData[i].bonus;
                j = i;
            }

            missionData.length > j + 1 && (bonus = missionData[!bonus ? j : j + 1].bonus);

            return res.json({
                success: true,
                message: 'Lấy thành công!',
                data: {
                    name: getName.success ? getName.name : phone,
                    count:  totalCount,
                    bonus
                }
            })
        } catch (err) {
            console.log(err);
            next(err);
        }
    },
    checkGift: async (req, res, next) => {
        try {
            let {phone, code} = req.body;

            if (!phone) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập số điện thoại!',
                })
            }

            if (!code) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập mã quà tặng!',
                })
            }

            if (res.locals.settings.giftCode.status != 'active') {
                return res.json({
                    success: false,
                    message: 'Mã quà tặng tạm bảo trì!',
                })
            }

            let checkCode = await giftModel.findOne({code, status: 'active'});

            if (!checkCode) {
                return res.json({
                    success: false,
                    message: 'Mã code đã hết hạn hoặc không hợp lệ!'
                })
            }

            if (checkCode.playCount && !await historyModel.findOne({
                partnerId: phone,
                timeTLS: {$gte: moment().startOf('day').toDate(), $lt: moment().endOf('day').toDate()},
                $and: [{$or: [{status: 'win'}, {status: 'won'}]}]
            })) {
                return res.json({
                    success: false,
                    message: 'Vui lòng chơi ít nhất 1 game để sử dụng!'
                })
            }

            if (checkCode.players.length >= checkCode.limit) {
                await giftModel.findOneAndUpdate({code}, {$set: {status: 'limit'}});
                return res.json({
                    success: false,
                    message: 'Mã code đã hết lượt sử dụng!'
                })
            }

            let countPlay = await historyModel.aggregate([{
                $match: {
                    partnerId: phone,
                    gameType: {$exists: true, $ne: null},
                    timeTLS: {$gte: moment().startOf('day').toDate(), $lt: moment().endOf('day').toDate()}
                }
            }, {$group: {_id: null, amount: {$sum: '$amount'}}}]);

            countPlay = !countPlay.length ? 0 : countPlay[0].amount;

            if (checkCode.playCount && checkCode.playCount > countPlay) {
                return res.json({
                    success: false,
                    message: `Bạn phải chơi đủ ${Intl.NumberFormat('en-US').format(checkCode.playCount)}đ thì mới đủ điều kiện sử dụng!`
                })
            }

            let timeExpired = Math.abs((moment(checkCode.expiredAt).valueOf() - moment().valueOf()) / 1000).toFixed(0) - Math.abs((moment(checkCode.createdAt).valueOf() - moment().valueOf()) / 1000).toFixed(0);

            if (timeExpired < 1) {
                await giftModel.findOneAndUpdate({code: code}, {$set: {status: "expired"}});
                return res.json({
                    success: false,
                    message: "Mã code đã hết hạn sử dụng!"
                });
            }

            if (checkCode.players.find(e => e.phone = phone)) {
                return res.json({
                    success: false,
                    message: "Mã code đã được sử dụng!"
                })
            }

            if (await blockModel.findOne({phone})) {
                return res.json({
                    success: false,
                    message: 'Bạn không có quyền sử dụng!'
                })
            }

            if (req.session.giftCode == code) {
                return res.json({
                    success: false,
                    message: "Hệ thống đang xử lý, vui lòng thử lại sau ít phút!"
                })
            }

            req.session.giftCode = code;
            giftHelper.rewardGift(phone, code);
            setTimeout(() => req.session.destroy(), 120 * 1000);

            checkCode.players.push({ username: res.locals.profile.username, amount: checkCode.amount, time: moment().toDate() }), await checkCode.save();

            return res.json({
                success: true,
                message: "Nhận quà thành công!"
            })
        } catch (err) {
            console.log(err);
            req.session.giftCode = null, next(err);
        }
    },
    checkTransId: async (req, res, next) => {
        try {
            let {phone, transId} = req.body;

            if (!transId) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập mã giao dịch!'
                })
            }

            if (transId.length < 8) {
                return res.json({
                    success: false,
                    message: 'Mã giao dịch không hợp lệ!'
                })
            }

            let find = await historyHelper.checkTransId(transId);

            if (!find.success && phone) {
                let check = await momoModel.findOne({phone});

                if (!check) return res.json({
                    success: false,
                    message: 'Số này không tồn tại trên hệ thống!',
                })

                if (check.loginStatus != 'active') return res.json({
                    success: false,
                    message: 'Số này đang lỗi, hãy đợi admin xử lý!',
                })

                if (res.locals.settings.checkTransId.status != 'active') return res.json({
                    success: false,
                    message: 'Hệ thống tạm đóng tìm mã giao dịch qua số điện thoại!',
                })

                find = await historyHelper.checkTransId(transId, phone);
            }

            return res.json(find);

        } catch (err) {
            next(err);
        }
    },
    refundTransId: async (req, res, next) => {
        try {
            let transId = req.body.transId;
            if (!transId) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập mã giao dịch!'
                })
            }

            if (transId.length < 8) {
                return res.json({
                    success: false,
                    message: 'Mã giao dịch không hợp lệ!'
                })
            }

            let find = await historyHelper.checkTransId(transId);

            if (!find) {
                return res.json({
                    success: false,
                    message: 'Không tìm thấy mã giao dịch này!'
                })
            }

            if (find.status == 'error' || find.status == 'wait' || find.status == 'done') {
                return res.json({
                    success: false,
                    message: find.status == 'error' ? 'Mã giao dịch này xử lý lỗi, vui lòng báo admin!' : (find.status == 'done' ? 'Mã giao dịch đã xử lý!' : 'Mã giao dịch này đang xử lý!')
                })
            }

            if (req.session.transId == transId) {
                return res.json({
                    success: false,
                    message: 'Mã giao dịch này đang xử lý, thử lại sau ít phút!!'
                })
            }

            req.session.transId = transId;
            historyHelper.rewardTransId(null, transId);
            setTimeout(() => req.session.destroy(), 120 * 1000);

            return res.json({
                success: true,
                message: 'Gửi yêu cầu hoàn tiền thành công!'
            })
        } catch (err) {
            req.session.transId = null;
            next(err);
        }
    },
    registerPhone: async (req, res, next) => {
        try {

            if (!req.body.phone) {
                return res.json({
                    success: false,
                    message: 'Số điện thoại không hợp lệ'
                })
            }
            let phone = '0' + req.body.phone;

            if (await memberModel.findOne({phone}).lean()) {
                return res.json({
                    success: false,
                    message: 'Số điện thoại đã được đăng ký!'
                })
            }

            const dataMomoTransfer = await momoService.phoneRunTransfer(1);
            const momoTransfer = dataMomoTransfer[0];


            const profile = await momoHelper.checkName(momoTransfer.phone, phone);

            const {name} = profile;

            if (!profile) {
                return res.json({
                    message: 'Người dùng MoMo nhận tiền không tồn tại.',
                    success: false,
                })
            }

            await new memberModel({
                phone: '0' + req.body.phone,
                name
            }).save();

            res.json({
                success: true,
                message: "Đăng Ký Số Momo Thành Công! SDT: " + '0' + req.body.phone + " (" + name + ")"
            })


        } catch (e) {

        }
    },
    betTaiXiu: async (req, res, next) => {
        try {
            const dataSetting = await settingModel.findOne({});
            const {amount, type} = req.body;

            if (!amount || !type) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập số tiền cược!'
                })
            }

            let comment;

            if (type === 'xiu') {
                comment = dataSetting.banTaiXiu.commentXiu;
            } else {
                comment = dataSetting.banTaiXiu.commentTai;
            }

            const momoReceiver = await momoModel.findOne({receiver: true}).lean();

            let data = {
                userId: momoReceiver.phone,
                name: momoReceiver.name,
                amount: parseInt(amount) + parseInt(comment),
                transferType: 2018,
                message: await momoHelper.randomComment().message,
                enableEditAmount: false
            }

            const encodedData = Buffer.from(JSON.stringify(data)).toString('base64');

            const momoUrl = `momo://?action=p2p&extra={"dataExtract":"${encodedData}"}`;

            console.log(momoUrl);

            return res.json({
                success: true,
                message: 'Đặt cược thành công',
                url: momoUrl
            })

        } catch (err) {
            next(err);
        }
    },
}

module.exports = apiController;