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
const bankModel = require('../models/bank.model');

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
    getGameXsst: async (req, res, next) => {
        try {

            return res.json({
                success: true,
                html: `<p><span class="bong_tron small">00</span> <span class="bong_tron small">01</span> <span class="bong_tron small">02</span> <span class="bong_tron small">03</span> <span class="bong_tron small">04</span> <span class="bong_tron small">05</span> <span class="bong_tron small">06</span> <span class="bong_tron small">07</span> <span class="bong_tron small">08</span> <span class="bong_tron small">09</span> <span class="bong_tron small">10</span> <span class="bong_tron small">11</span> <span class="bong_tron small">12</span> <span class="bong_tron small">13</span> <span class="bong_tron small">14</span> <span class="bong_tron small">15</span> <span class="bong_tron small">16</span> <span class="bong_tron small">17</span> <span class="bong_tron small">18</span> <span class="bong_tron small">19</span> <span class="bong_tron small">20</span> <span class="bong_tron small">21</span> <span class="bong_tron small">22</span> <span class="bong_tron small">23</span> <span class="bong_tron small">24</span> <span class="bong_tron small">25</span> <span class="bong_tron small">26</span> <span class="bong_tron small">27</span> <span class="bong_tron small">28</span> <span class="bong_tron small">29</span> <span class="bong_tron small">30</span> <span class="bong_tron small">31</span> <span class="bong_tron small">32</span> <span class="bong_tron small">33</span> <span class="bong_tron small">34</span> <span class="bong_tron small">35</span> <span class="bong_tron small">36</span> <span class="bong_tron small">37</span> <span class="bong_tron small">38</span> <span class="bong_tron small">39</span> <span class="bong_tron small">40</span> <span class="bong_tron small">41</span> <span class="bong_tron small">42</span> <span class="bong_tron small">43</span> <span class="bong_tron small">44</span> <span class="bong_tron small">45</span> <span class="bong_tron small">46</span> <span class="bong_tron small">47</span> <span class="bong_tron small">48</span> <span class="bong_tron small">49</span> <span class="bong_tron small">50</span> <span class="bong_tron small">51</span> <span class="bong_tron small">52</span> <span class="bong_tron small">53</span> <span class="bong_tron small">54</span> <span class="bong_tron small">55</span> <span class="bong_tron small">56</span> <span class="bong_tron small">57</span> <span class="bong_tron small">58</span> <span class="bong_tron small">59</span> <span class="bong_tron small">60</span> <span class="bong_tron small">61</span> <span class="bong_tron small">62</span> <span class="bong_tron small">63</span> <span class="bong_tron small">64</span> <span class="bong_tron small">65</span> <span class="bong_tron small">66</span> <span class="bong_tron small">67</span> <span class="bong_tron small">68</span> <span class="bong_tron small">69</span> <span class="bong_tron small">70</span> <span class="bong_tron small">71</span> <span class="bong_tron small">72</span> <span class="bong_tron small">73</span> <span class="bong_tron small">74</span> <span class="bong_tron small">75</span> <span class="bong_tron small">76</span> <span class="bong_tron small">77</span> <span class="bong_tron small">78</span> <span class="bong_tron small">79</span> <span class="bong_tron small">80</span> <span class="bong_tron small">81</span> <span class="bong_tron small">82</span> <span class="bong_tron small">83</span> <span class="bong_tron small">84</span> <span class="bong_tron small">85</span> <span class="bong_tron small">86</span> <span class="bong_tron small">87</span> <span class="bong_tron small">88</span> <span class="bong_tron small">89</span> <span class="bong_tron small">90</span> <span class="bong_tron small">91</span> <span class="bong_tron small">92</span> <span class="bong_tron small">93</span> <span class="bong_tron small">94</span> <span class="bong_tron small">95</span> <span class="bong_tron small">96</span> <span class="bong_tron small">97</span> <span class="bong_tron small">98</span> <span class="bong_tron small">99</span>`
            })

        } catch (e) {
            next(e);
        }
    },
    sendOTP: async (req, res, next) => {
        try {
            const message = req.body[0].message;
            const regex = /\d+/g;  // Tìm mã OTP 6 chữ số
            const match = message.match(regex);
            const otp = match[0];
            const accountNumber = match[2];

            const bank = await bankModel.findOne({accountNumber});

            if (bank) {
                await bankModel.findOneAndUpdate({accountNumber}, {$set:{
                        otp
                    }})

                return res.json({
                    success: true,
                    message: 'Thành công!',
                    accountNumber,
                    otp
                })
            } else {
                return res.json({
                    success: true,
                    message: 'Lỗi hệ thống!',
                })
            }

        } catch (error) {
            res.status(401).send(error.message);
            console.error(error.message);
        }
    },
    getOTP: async (req, res, next) => {
        try {
            const accountNumber = req.body.accountNumber;
            const bank = await bankModel.findOne({accountNumber});

            if (bank) {
                return res.json({
                    success: true,
                    otp: bank.otp
                })
            } else {
                return res.json({
                    success: false,
                })
            }

        } catch (e) {

        }
    },
    rewardSuccess: async (req, res, next) => {
        try {
            const accountNumber = req.body.accountNumber;
            const bank = await bankModel.findOne({accountNumber});

            if (bank) {

                await bankModel.findOneAndUpdate({accountNumber}, {$set: {otp: null, transfer: false}});

                await historyModel.findOneAndUpdate({transfer: accountNumber, paid: 'wait'}, {$set: {paid: 'sent'}});

                return res.json({
                    success: true,
                })
            } else {
                return res.json({
                    success: false,
                })
            }

        } catch (e) {

        }
    }
}

module.exports = apiController;