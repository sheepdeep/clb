const dataOKVIPBANK = require("../json/okvipbank.json");
const dotenv = require('dotenv');
const telegramHelper = require("../helpers/telegram.helper");
dotenv.config({path: '../configs/config.env'});
const {connectDB} = require('../configs/database');

connectDB().then(() => {
    console.log('Chạy file với kết nối DB hiện tại');
});

async function sendMessage() {

    const message = `<b>SUPBANK.ME</b> 
<b>SÂN CHƠI UY TÍN SỐ 1‼️</b>
<b>👉GIFCODE : SBFREE165 ‼️</b>
<b>👉CODE : SBSIEUVIP28 (200slot) ‼️</b>

<b>👉Min 10k - MAX 5M Thanh Toán 5S ‼️</b>

<b>👉HOÀN 40% Bill Đầu Ngày Thua Cược Từ 50k Trở Lên-MAX400k‼️</b>
<b>👉HOÀN TỔNG CƯỢC 0.5% CƯỢC TỪ 10M TRỞ LÊN   ‼️</b>
<b>👉KHUNG GIỜ VÀNG X3 [00h05-00h15] [12h - 12h10p]‼️</b>

<b>🔗LINK GAME : SUPBANK.ME</b>
<b>👉Giới Thiệu Bạn Bè Chơi Trên SupBank Nhận 399k ‼️</b>
<b>👉Chẵn Lẻ Bank - Thanh Toán Siêu Nhanh Chỉ Với 5S ‼️</b>

<b>👉BOX CHAT GIAO LƯU : https://t.me/supbanktx ‼️</b>
<b>👉CHĂM SÓC KHÁCH HÀNG :</b>
<b>@SUPBANKUYTIN. ‼️</b>`;

    for (let telegram of dataOKVIPBANK) {
        const result = await telegramHelper.sendText(`6420712375:AAH7PfOseTpZMVIrLpEs_OsgcbWHp6kJpaQ`, telegram.chatId, message);
        console.log(result);
        if (result.success) {
            console.log(`${telegram.chatId} gửi thành công!`)
        } else {
            console.log(`${telegram.chatId} gửi thất bại!`)

        }
    }
}

sendMessage();