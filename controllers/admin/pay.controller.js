const historyModel = require('../../models/history.model');
const userModel = require("../../models/user.model");
const commentHelper = require("../../helpers/comment.helper");
const settingModel = require("../../models/setting.model");
const bankModel = require("../../models/bank.model");
const ncbHelper = require("../../helpers/ncb.helper");
const moment = require("moment");
const securityHelper = require("../../helpers/security.helper");
const telegramHelper = require("../../helpers/telegram.helper");
const transferModel = require("../../models/transfer.model");

const payController = {
    index: async (req, res, next) => {
        try {

            const histories = await historyModel.find({
                paid: 'wait',
                result: { $in: ['win', 'ok'] }
            }).lean();

            return res.render('admin/pay/home', {histories});

        } catch (e) {
            next(e);
        }
    },
    pay: async (req, res, next) => {
        try {

            const transId = req.query.transId;

            if (!transId) {

            }

            const history = await historyModel.findOne({transId}).lean();

            if (!history) {

            }

            if (await transferModel.findOne({transId})) {
                await historyModel.findOneAndUpdate({transId}, {
                        $set: {
                            paid: 'sent',
                        }
                    }
                )
                return res.redirect(`${process.env.adminPath}/pay`);
            }

            return res.render('admin/pay/otp', {history});


        } catch (e) {
            next(e);
        }
    },
    verify: async (req, res, next) => {
        try {

            const dataSetting = await settingModel.findOne();
            const {transId, action} = req.body;

            if (!transId || !action) {
                return res.json({
                    success: false,
                    message: 'Thiếu dữ liệu tải lên!'
                })
            }

            let history = await historyModel.findOne({transId}).lean();

            let user = await userModel.findOne({username: history.username}).lean();

            let commentData = [
                {
                    name: 'transId',
                    value: history.transId,
                },
                {
                    name: 'comment',
                    value: history.comment,
                },
                {
                    name: 'amount',
                    value: history.amount,
                },
                {
                    name: 'bonus',
                    value: history.bonus,
                }

            ];
            let rewardComment = await commentHelper.dataComment(dataSetting.commentSite.rewardGD, commentData);

            const bank = await bankModel.findOne({bankType: 'ncb', status: 'active'}).lean();

            if (action == 'getOTP') {

                if (await transferModel.findOne({transId})) {
                    await historyModel.findOneAndUpdate({transId}, {
                            $set: {
                                paid: 'sent',
                            }
                        }
                    )
                    return res.json({
                        success: false,
                        message: 'Mã đã được trả thưởng!'
                    });
                }

                const result = await ncbHelper.confirm(
                    {
                        bankCode: user.bankInfo.bankCode,
                        accountNumber: user.bankInfo.accountNumber,
                        amount: history.bonus,
                        comment: rewardComment,
                        name: user.bankInfo.accountName
                    },
                    bank.accountNumber,
                    bank.bankType,
                    history
                );


                if (!result) {
                    return res.json({
                        success: false,
                        message: `Đã đăng nhập lại NCB ${bank.accountNumber} vui lòng lấy lại OTP`
                    })
                } else {
                    return res.json(result)
                }



            } else {
                let result = await ncbHelper.verify(
                    { bankCode: user.bankInfo.bankCode, accountNumber: user.bankInfo.accountNumber, amount: history.bonus, comment: rewardComment, name: user.bankInfo.accountName },
                    bank.accountNumber,
                    bank.bankType,
                    req.body.otp,
                    transId
                );

                console.log(result);

                if (result.code == 200) {

                    let histories = await historyModel.find({username: history.username}, {
                        _id: 0,
                        transId: 1,
                        amount: 1,
                        comment: 1,
                        gameType: 1,
                        result: 1,
                        paid: 1,
                        description: 1,
                        createdAt: 1,
                        isCheck: 1
                    }).sort({createdAt: -1}).limit(10).lean();

                    let historys = await historyModel.find({status: 'win'}).sort({createdAt: 'desc'}).limit(5);
                    let list = [];

                    for (const history of historys) {
                        list.push({
                            username: `${history.username.slice(0, 4)}****`,
                            amount: history.amount,
                            bonus: history.bonus,
                            gameName: history.gameName,
                            comment: history.comment,
                            result: history.result,
                            time: moment(history.timeTLS).format('YYYY-MM-DD HH:mm:ss')
                        })
                    }

                    await historyModel.findOneAndUpdate({transId}, {
                            $set: {
                                paid: 'sent',
                            }
                        }
                    )

                    let dataPost = {
                        success: true,
                        username: user.username,
                        histories,
                        allHistories: list
                    };

                    let dataEncode = await securityHelper.encrypt(JSON.stringify(dataPost));

                    socket.emit('cltx', dataEncode);

                    return res.json({
                        success: true,
                        message: 'Trả thưởng #' + history.transId
                    })

                }

                return res.json({
                    success: true,
                    message: 'Lỗi'
                })
            }


        } catch (e) {
            next(e);
        }
    }
}

module.exports = payController;