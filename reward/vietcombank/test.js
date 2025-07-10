const dotenv = require('dotenv');
dotenv.config({ path: '../../configs/config.env' });
const { connectDB } = require('../../configs/database');
const bankModel = require('../../models/bank.model.js');
const telegramHelper = require('../../helpers/telegram.helper');
const vcbHelper = require('../../helpers/vcb.helper');
const listBank = require('../../json/listBankVCB.json');
const sleep = require('time-sleep');
const historyModel = require('../../models/history.model');
const userModel = require("../../models/user.model");
const transferModel = require("../../models/transfer.model");
const logHelper = require("../../helpers/log.helper")
const settingModel = require("../../models/setting.model");

connectDB();

const run = async (accountNumber) => {
    const dataSetting = await settingModel.findOne({});

    if (dataSetting.reward.typeBank === 'vcb') {

        const dataBank = await bankModel.findOne({accountNumber, bankType: 'vcb', reward: false}).lean();
        let array = dataSetting.commentSite.rewardGD.split(',');
        const history = await historyModel.findOneAndUpdate({paid: 'wait'}, {$set: {transfer: accountNumber, paid: 'sent'}}).lean();

        if (history && dataBank) {

            await bankModel.findOneAndUpdate({accountNumber}, {$set: {reward: true, otp: null}});

            if (dataBank.loginStatus === 'wait') {
                const resultLogin = await vcbHelper.login(accountNumber, dataBank.bankType);
                console.log(resultLogin);
            }

            if (dataBank.status === 'waitOTP') {
                await telegramHelper.sendText(process.env.privateTOKEN, process.env.privateID, `[notBankReward] ${accountNumber} - VCB đăng đợi mã OTP để đăng nhập!`, 'HTML');
            }

            if (!dataBank) {
                await telegramHelper.sendText(process.env.privateTOKEN, process.env.privateID, `[notBankReward] Không có tài khoản vietcombank hoạt động để trả thưởng`, 'HTML');
            }


            const user = await userModel.findOne({username: history.username});
            if (!user || !user.bankInfo) {
                await historyModel.findOneAndUpdate({transId: history.transId}, {$set: {paid: 'bankerror'}});
                await bankModel.findOneAndUpdate({accountNumber: dataBank.accountNumber}, {
                    $set: {
                        reward: false,
                        otp: null
                    }
                });
            }

            if (await transferModel.findOne({transId: history.transId}).lean()) {
                console.log(`MGD #${history.transId} đã được xử lý!`)
                await historyModel.findOneAndUpdate({transId: history.transId}, {$set: {paid: 'sent'}});
                await bankModel.findOneAndUpdate({accountNumber}, {$set: {reward: false, otp: null}});

                await sleep(1000);
                run('1056069780');
            }

            const checkBank = listBank.find(bank => bank.bank_code === user.bankInfo.bankCode);

            const dataTransfer = {
                accountNumber: user.bankInfo.accountNumber,
                bankCode: checkBank.omniBankCode,
                name: user.bankInfo.accountName,
                comment: array[Math.floor(Math.random() * array.length)] + String(history.transId).slice(-4),
                amount: history.bonus
            };

            let resultConfirm;
            let errorOtp = false;

            if (user.bankInfo.bankCode === '970436') {
                console.log('Chuyển tiền sang VCB');
                const result = await vcbHelper.initTransfer(accountNumber, dataBank.bankType, dataTransfer);

                if (result && result.code === '00') {
                    const resultOTP = await vcbHelper.genOtpTransfer(dataBank, result.transaction.tranId, 'IN', 1);

                    if (resultOTP && resultOTP.code === '00') {
                        let waitOTP = true;
                        let remainingTime = 60; // Timeout duration in seconds
                        let st = Date.now();
                        while (waitOTP) {
                            let elapsedTime = (Date.now() - st) / 1000;  // Calculate elapsed time in seconds
                            remainingTime = Math.max(0, 60 - Math.floor(elapsedTime));  // Remaining time

                            const dataBank = await bankModel.findOne({accountNumber, bankType: 'vcb', reward: false});
                            if (dataBank.otp) {
                                resultConfirm = await vcbHelper.confirmTransfer(dataBank, result.transaction.tranId, resultOTP.challenge, dataBank.otp, "IN");
                                waitOTP = false;
                            }

                            if (elapsedTime > 60) {
                                await historyModel.findByIdAndUpdate(history._id, {
                                    paid: 'hold'
                                });
                                await bankModel.findOneAndUpdate({accountNumber}, {$set: {reward: false, otp: null}});
                                telegramHelper.sendText(process.env.privateTOKEN,process.env.privateID, `VCB ${dataBank.accountNumber} [Quá thời gian nhập OTP]`)
                                errorOtp = true;
                                waitOTP = false;
                            }

                            console.log(`Đợi OTP còn lại ${remainingTime} giây`);

                            await sleep(1000);
                        }
                    }

                } else if (result && result.code === '108') {
                    await vcbHelper.login(accountNumber, bankType);
                }
            } else {

                const resultCheckBanker = await vcbHelper.getNameBank(accountNumber, dataBank.bankType, user.bankInfo.accountNumber, user.bankInfo.bankCode);
                await vcbHelper.getlistDDAccount(accountNumber, dataBank.bankType);
                const result = await vcbHelper.initTransferV1(accountNumber, dataBank.bankType, dataTransfer);

                if (result && result.code === '00') {
                    const resultOTP = await vcbHelper.genOtpTransfer(dataBank, result.transaction.tranId, 'OUT', 1);

                    if (resultOTP && resultOTP.code === '00') {
                        let waitOTP = true;
                        let remainingTime = 60; // Timeout duration in seconds
                        let st = Date.now();
                        while (waitOTP) {
                            let elapsedTime = (Date.now() - st) / 1000;  // Calculate elapsed time in seconds
                            remainingTime = Math.max(0, 60 - Math.floor(elapsedTime));  // Remaining time

                            const dataBank = await bankModel.findOne({accountNumber, bankType: 'vcb'});
                            if (dataBank.otp) {
                                resultConfirm = await vcbHelper.confirmTransfer(dataBank, result.transaction.tranId, resultOTP.challenge, dataBank.otp, "OUT");
                                waitOTP = false;
                            }

                            if (elapsedTime > 60) {
                                await historyModel.findByIdAndUpdate(history._id, {
                                    paid: 'hold'
                                });
                                await bankModel.findOneAndUpdate({accountNumber}, {$set: {reward: false, otp: null}});
                                telegramHelper.sendText(process.env.privateTOKEN,process.env.privateID, `VCB ${dataBank.accountNumber} [Quá thời gian nhập OTP]`)
                                errorOtp = true;
                                waitOTP = false;
                            }

                            console.log(`Đợi OTP còn lại ${remainingTime} giây`);

                            await sleep(1000);
                        }
                    }

                    await bankModel.findOneAndUpdate({accountNumber}, {$set: {reward: false, otp: null}});
                } else {
                    await historyModel.findByIdAndUpdate(history._id, {
                        paid: 'hold'
                    });

                    telegramHelper.sendText(process.env.privateTOKEN,process.env.privateID, `VCB ${dataBank.accountNumber} [${result.des} - ${result.mid}]`)
                }

                await bankModel.findOneAndUpdate({accountNumber}, {$set: {reward: false, otp: null}});
            }

            if (errorOtp) {
                await historyModel.findByIdAndUpdate(history._id, {
                    paid: 'hold'
                });

                telegramHelper.sendText(process.env.privateTOKEN,process.env.privateID, `VCB ${dataBank.accountNumber} [${resultConfirm.des}]`)

                await sleep(5000);
                run('1056069780');
            }

            if (resultConfirm && resultConfirm.code === '00') {
                const balance = await vcbHelper.getBalance(dataBank.phone);
                await historyModel.findByIdAndUpdate(history._id, {
                    transferType: 'vcb'
                });
                await userModel.findOneAndUpdate({username: history.username}, {$set: {"bankInfo.guard": true}});
                await new transferModel({
                    transId: history.transId,
                    receiver: user.bankInfo.accountNumber,
                    transfer: dataBank.phone,
                    username: history.username,
                    firstMoney: dataBank.balance,
                    amount: history.bonus,
                    lastMoney: balance.balance,
                    comment: resultConfirm.transaction.remark
                }).save();
                return {success: true};

            } else {
                await historyModel.findByIdAndUpdate(history._id, {
                    paid: 'hold'
                });

                telegramHelper.sendText(process.env.privateTOKEN,process.env.privateID, `VCB ${dataBank.accountNumber} [${resultConfirm.des}]`)

                await sleep(5000);
                run('1056069780');
            }

        }

        await sleep(5000);
        run('1056069780');
    }


    await sleep(10000);
    run('1056069780');
}

run('1056069780');
