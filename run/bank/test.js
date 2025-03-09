const axios = require("axios");
const dotenv = require("dotenv");
const sleep = require("time-sleep");
const socket = require("socket.io-client")("http://localhost"); // Kết nối đến servers đang chạy trên localhost:3000

// Load biến môi trường
dotenv.config({ path: "../../configs/config.env" });
const { connectDB } = require("../../configs/database");

connectDB().then(() => {
  console.log("Chạy file với kết nối DB hiện tại");
  reward();
});

const settingModel = require("../../models/setting.model");
const historyModel = require("../../models/history.model");
const userModel = require("../../models/user.model");
const bankModel = require("../../models/bank.model");
const ncbHelper = require("../../helpers/ncb.helper");
const logHelper = require("../../helpers/log.helper");
const moment = require("moment/moment");
const commentHelper = require("../../helpers/comment.helper");

async function reward() {
  try {
    const dataBank = await bankModel.findOne({ bankType: "ncb", status: "active", reward: false });

    if (dataBank) {
      //TODO: lấy thông tin lịch sử
      const history = await historyModel.findOne({
          paid: "wait",
          $or: [
            { transfer: null }, // Transfer is null
            { transfer: { $exists: false } }, // Transfer field does not exist
          ],
        });

      rewardTransId(dataBank, history);

    } else {
        console.log('Không thấy ngân hàng trả thưởng!')
    }
  } catch (e) {
    console.log(e);
  }
}

async function rewardTransId(dataBank, history) {
   try {
     if (history) {

       const dataSetting = await settingModel.findOne({});

       await historyModel.findByIdAndUpdate(history._id, {
         transfer: dataBank.accountNumber,
       });

       await bankModel.findByIdAndUpdate(dataBank._id, {
         reward: true,
       });

       console.log(`${history.transId} đang được ngân hàng ${dataBank.accountNumber} trả thưởng!`);

       const user = await userModel.findOne({username: history.username});

       if (!user.bankInfo.accountNumber) {

         console.log(`${history.transId} đang được ngân hàng ${dataBank.accountNumber} tài khoản chưa cập nhật bank nhận tiền (ERROR)!`);

         await historyModel.findByIdAndUpdate(history._id, {
           transfer: null,
         });

         await bankModel.findByIdAndUpdate(dataBank._id, {
           reward: false,
         });

         await sleep(1000);
         return reward();
       }

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


       const resultComfirm = await ncbHelper.confirm(
           {
             bankCode: user.bankInfo.bankCode,
             accountNumber: user.bankInfo.accountNumber,
             amount: history.bonus,
             comment: rewardComment,
             name: user.bankInfo.accountName
           },
           dataBank.accountNumber,
           dataBank.bankType,
           history
       );

       if (!resultComfirm) {
         console.log(`${history.transId} đang được ngân hàng ${dataBank.accountNumber} đăng nhập lại NCB ${dataBank.accountNumber} vui lòng lấy lại OTP (ERROR)!`);
         await ncbHelper.login(dataBank.accountNumber, dataBank.bankType);

         await historyModel.findByIdAndUpdate(history._id, {
           transfer: null,
         });

         await bankModel.findByIdAndUpdate(dataBank._id, {
           reward: false,
         });

         await sleep(1000);
         return reward();
       } else {
         // let resultVerify = await ncbHelper.verify(
         //     { bankCode: user.bankInfo.bankCode, accountNumber: user.bankInfo.accountNumber, amount: history.bonus, comment: rewardComment, name: user.bankInfo.accountName },
         //     dataBank.accountNumber,
         //     dataBank.bankType,
         //     req.body.otp,
         //     transId
         // );
       }

     }
   } catch (e) {
     console.log(e);
     await historyModel.findByIdAndUpdate(history._id, {
       transfer: null,
     });

     await bankModel.findByIdAndUpdate(dataBank._id, {
       reward: false,
     });
   }
}