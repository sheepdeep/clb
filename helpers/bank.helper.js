const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

exports.generate_deep_link = async (rec_bin, rec_acc_num, amount, msg, send_bin) => {
    const url = "https://zpm.zalo.me/api/v1/transfer-money?api_key=3bb9d514148ca6dd16ba88d6bff387bf&encryptParams=1&sig=0251bfab69a8bc248b84d6de5c14e71b";

    // Dữ liệu cần gửi
    const payloadDict = {
        rec_bin: rec_bin,
        rec_acc_num: rec_acc_num,
        rec_type: "1",
        rec_method: "1",
        srcId: "2",
        amount: amount,
        msg: msg,
        send_method: "1",
        send_bin: send_bin,
        cateId: "1",
        save_info: "false"
    };

    // Lưu JSON vào file
    const filePath = path.join(__dirname, 'file.json');
    fs.writeFileSync(filePath, JSON.stringify(payloadDict, null, 2));

    // Tạo form-data
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), { filename: 'file.json', contentType: 'application/json' });

    // Headers
    const headers = {
        ...form.getHeaders(),
        'Connection': 'keep-alive',
        'Accept-Encoding': 'gzip',
        'Cookie': '__zi=3000.SSZzejyD4iicchMgpau7W6gUigZ9Iak5QfxxgSr1HuPgaV2k.1; zalo.me_zacc_session=...',
        'Host': 'zpm.zalo.me',
        'Accept': '*/*',
        'User-Agent': 'Zalo/241002 (iPhone; iOS 18.2; Scale/3.00)',
        'Accept-Language': 'vi-VN;q=1, en-VN;q=0.9',
        'zcid': 'A9E8CF5E6A949A34930583C47A79B90B2F27FA89D452473512C4631C86DB99E5416B330A726794BD9C430AFFF7D8E87B6F43F8B3428486DAB2430DC57AAC9B4DAF364EC61E01AD638FFB1782298F347B',
        'retry': '0',
        'Upload-Draft-Interop-Version': '6',
        'v': 'v2',
        'session_key': 'Th08.376070473.a1.kN3J2BLuw3By6O8ajNZeChLuw3ArUEWojBYrMD9uw38',
        'Upload-Complete': '?1'
    };

    try {
        const response = await axios.post(url, form, { headers });
        console.log('Response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
        return null;
    }

}