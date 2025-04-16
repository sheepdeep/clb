const axios = require('axios'); // for debug api send request use the ./debug.axios.js require.
const BPromise = require('bluebird');
const _ = require('lodash');
const APP_VER = (process.env.APP_VER && parseInt(process.env.APP_VER)) || 42072;
const APP_CODE = process.env.APP_CODE || '4.2.7';

const DEVICE_LIST = JSON.parse(require('fs').readFileSync('./device.json'));
const Utils = require('./util');
const MoMoModel = require('./momo.model');

const hardCodedAppCode = '4.1.17';
const hardCodedAppVer = 41170;

// login section
const CHECK_USER_BE_MSG_LINK = 'https://api.momo.vn/public/auth/user/check';
const TOKEN_GENERATE_LINK = 'https://api.momo.vn/public/auth/switcher/token/generate';
const SEND_OTP_MSG_LINK = 'https://api.momo.vn/public/auth/otp/init';
const REG_DEVICE_MSG_LINK = 'https://api.momo.vn/public/auth/otp/verify';

// smart section
const SMART_REG_LINK = 'https://vsign.pro/api/v3/registerSmartOTP';
const SMART_DELETE_LINK = 'https://vsign.pro/api/v3/deleteSmartOTP';
const SMART_GETOTP_LINK = 'https://vsign.pro/api/v3/getSmartOTP';
const MOMO_VERIFY_SMARTOTP_LINK = 'https://api.momo.vn/api/auth/otp/smart/verify';

// Link các api momo
const LOGIN_LINK = 'https://owa.momo.vn/public/login';
const REFRESH_TOKEN_LINK = 'https://api.momo.vn/auth/fast-login/refresh-token';

const SERVICE_DISPATCHER_LINK = 'https://api.momo.vn/bank/service-dispatcher';
const BALANCE = 'https://api.momo.vn/backend/sof/api/SOF_LIST_MANAGER_MSG';
const FIND_MOMO = 'https://owa.momo.vn/api/FIND_RECEIVER_PROFILE';

const INIT_M2MU = 'https://owa.momo.vn/api/M2MU_INIT';
const CONFIRM_M2MU = 'https://owa.momo.vn/api/M2MU_CONFIRM';

const TRAN_HIS_INIT_MSG = 'https://owa.momo.vn/api/TRAN_HIS_INIT_MSG';
const TRAN_HIS_CONFIRM_MSG = 'https://owa.momo.vn/api/TRAN_HIS_CONFIRM_MSG';

// quet lsgd
const BROWSE_TRANSACTION = 'https://api.momo.vn/transhis/api/transhis/browse';
const DETAIL_TRANSACTION = 'https://api.momo.vn/transhis/api/transhis/detail';

function generateUserAgent(appCode, appVer, codename, buildNumber, osVersion = 10) {
  return `momotransfer/${APP_CODE}.${APP_VER} Dalvik/2.1.0 (Linux; U; Android ${osVersion}; ${codename} ${buildNumber}) AgentID/`;
}

async function registerSmartForAccount(data) {
  try {
    const { data: result } = await axios.post(SMART_REG_LINK, data, {
      headers: {
        key: process.env.VSIGN_APIKEY,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 Edg/117.0.2045.31',
        version: APP_CODE,
      },
      timeout: 10000,
    });
    return result;
  } catch (e) {
    console.log('Có lỗi khi đăng kí smart otp', e);
    return ''
  }
}

async function deleteSmartForAccount(phone) {
  try {
    const { data: result } = await axios.post(SMART_DELETE_LINK, {phone}, {
      headers: {
        key: process.env.VSIGN_APIKEY,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 Edg/117.0.2045.31',
        version: APP_CODE,
      },
      timeout: 10000,
    });
    return result;
  } catch (e) {
    console.log('Có lỗi khi xóa đăng kí smart otp', e);
    return ''
  }
}

async function getSmartOTP(phone, transactionId) {
  try {
    const { data: result } = await axios.post(SMART_GETOTP_LINK, {
      "phone": phone,
      "transactionId": transactionId
    }, {
      headers: {
        key: process.env.VSIGN_APIKEY,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 Edg/117.0.2045.31',
        version: APP_CODE,
      },
      timeout: 10000,
    });
    return result;
  } catch (e) {
    console.log('Có lỗi khi đăng kí smart otp', e);
    return ''
  }
}

async function getVSign(data, {agentid, phone, devicecode, secureid}) {
  try {
    const {data: result} = await axios.post('https://vsign.pro/api/v4/getVSign', data, {
      headers: {
        key: process.env.VSIGN_APIKEY,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 Edg/117.0.2045.31',
        os: 'android',
        version: APP_CODE,
        agentid,
        phone,
        devicecode,
        secureid,
      },
      timeout: 10000,
    });
    return result;
  } catch (e) {
    console.log('Có lỗi khi lấy vSIGN');
    return ''
  }
}

const commonHeader = {
  app_code: APP_CODE,
  app_version: APP_VER,
  lang: 'vi',
  channel: 'APP',
  env: 'production',
  timezone: 'Asia/Ho_Chi_Minh',
  'accept-language': 'vi-VN,vi;q=0.9',
  device_os: 'ANDROID',
  'accept-charset': 'UTF-8',
  accept: 'application/json',
  agent_id: 0,
  'content-type': 'application/json',
}

async function doRequestEncryptMoMo(link, body, account, msgType, {agentid, phone, devicecode, secureid}) {
  const requestSecretKey = Utils.generateSecretKey();
  const requestKey = Utils.rsaEncryptWithPublicKey(requestSecretKey, account.publicKey);

  const encryptedRequestString = Utils.aes256cbcEncrypt(
    JSON.stringify(body),
    requestSecretKey,
  );

  const { vsign, tbid, vversion, ftv, vcs, vts, mtd, mky } = await getVSign({ encrypted: encryptedRequestString }, {agentid, phone, devicecode, secureid});

  if (!vsign) {
    // Trường hợp không lấy được vsign
    return {
      message: 'Có lỗi khi lấy vSign Endpoint' + link,
    }
  }

  const headers = {
    ...commonHeader,
    'content-type': 'text/plain', // fix bug auto add "" to body
    requestkey: requestKey,
    vsign,
    tbid,
    vts, vcs, vversion, ftv, mtd, mky,
    agent_id: account.agentId,
    sessionkey: account.sessionKey,
    userid: account.username,
    user_phone: account.username,
    'platform-timestamp': Date.now(),
    'momo-session-key-tracking': account.momoSessionKeyTracking,
    'user-agent': `${account.userAgent}${account.agentId}`,
    Authorization: `Bearer ${account.authToken}`,
  }
  if (msgType) {
    headers['msgtype'] = msgType;
  }
  console.log('Header là', headers);
  const { data: resultMoMo } = await axios.post(link, encryptedRequestString, {
    headers,
    transformRequest: [function (data, headers) {
      // Do whatever you want to transform the data
      headers['content-type'] = 'application/json'; // sửa lại content-type cho giống momo gửi, nếu để content-type là json thì nó sẽ bị bug tự thêm 2 dấu ""
      return data;
    }],
  });

  const decryptedResponseData = Utils.aes256cbcDecrypt(
    resultMoMo,
    requestSecretKey,
  );

  try {
    return JSON.parse(decryptedResponseData);
  } catch (e) {
    return decryptedResponseData;
  }

}


const loginAccount = async (phone, password) => {
  const currentAccount = await MoMoModel.findOne({ username: phone }).lean();
  if (!currentAccount) {
    throw new Error('Account not found');
  }
  if (currentAccount.status === "lock") {
    throw new Error('Tài khoản đã bị khóa')
  }
  const dataDevice = JSON.parse(currentAccount.device);

  let loginPassword = currentAccount.password || password;

  const time = Date.now();

  const checkSumCalculated = Utils.calculateCheckSum(phone, 'USER_LOGIN_MSG', time, currentAccount.setupKey);
  const pHash = Utils.calculatePHash(currentAccount.imei, password, currentAccount.setupKey);

  if (currentAccount.complexPassword) {
    const loginNewLink = 'https://api.momo.vn/public/signin';
    const bodyLogin = {
      "user": phone,
      "pass": pHash,
      "msgType": "USER_LOGIN_MSG",
      "momoMsg": {
        "_class": "mservice.backend.entity.msg.LoginMsg",
        "isSetup": false
      },
      "extra": {
        "pHash": pHash,
        "IDFA": "",
        "SIMULATOR": false,
        "TOKEN": dataDevice.dummyFcmToken,
        "ONESIGNAL_TOKEN": dataDevice.dummyFcmToken,
        "SECUREID": dataDevice.secureId,
        "MODELID": dataDevice.modelId,
        "DEVICE_TOKEN": "",
        "checkSum": checkSumCalculated,
        "isNFCAvailable": false,
        "sHash": null
      },
      "appVer": APP_VER,
      "appCode": APP_CODE,
      "lang": "vi",
      "deviceName": dataDevice.deviceName,
      "deviceOS": "android",
      "channel": "APP",
      "buildNumber": 0,
      "appId": "vn.momo.platform",
      "cmdId": `${time}000000`,
      "time": time,
    }

    const headers = {
      ...commonHeader,
      sessionkey: '',
      userid: phone,
      msgtype: 'USER_LOGIN_MSG',
      user_phone: phone,
      agent_id: 0,
      authorization: 'Bearer',
      'user-agent': `${currentAccount.userAgent}/0`,
    }

    const {data: result} = await axios.post(loginNewLink, bodyLogin, {
      headers,
    });

    if (result.errorCode === 0) {
      console.log('Login momo thành công');
      const accessToken = result.extra.AUTH_TOKEN;
      const refreshToken = result.extra.REFRESH_TOKEN;
      const sessionKey = result.extra.SESSION_KEY;
      const agentId = result.momoMsg.agentId;
      const requestEncryptKey = result.extra.REQUEST_ENCRYPT_KEY;
      const update = {
        username: phone,
        pHash,
        authToken: accessToken,
        refreshToken,
        sessionKey,
        agentId,
        publicKey: requestEncryptKey,
        password,
        lastLogined: new Date().toISOString(),
        status: "login",
      }


      await MoMoModel.findOneAndUpdate({username: phone}, {
        $set: {
          ...update
        },
      }, {upsert: true})

      return {
        message: 'Đăng nhập thành công',
      };

    }
    throw new Error(result.errorDesc || 'Có lỗi khi login')

  }

  const bodyLogin = {
    "user": phone,
    "pass": loginPassword,
    "msgType": "USER_LOGIN_MSG",
    "momoMsg": {
      "_class": "mservice.backend.entity.msg.LoginMsg",
      "isSetup": false,
    },
    "extra": {
      "pHash": pHash,
      "IDFA": "",
      "SIMULATOR": false,
      "TOKEN": "",
      "ONESIGNAL_TOKEN": "",
      "SECUREID": dataDevice.secureId,
      "MODELID": dataDevice.modelId,
      "DEVICE_TOKEN": "",
      "checkSum": checkSumCalculated,
      "isNFCAvailable": true,
    },
    "appVer": APP_VER,
    "appCode": APP_CODE,
    "lang": "vi",
    "deviceOS": "android",
    "deviceName": dataDevice.deviceName,
    "channel": "APP",
    "buildNumber": 0,
    "appId": "vn.momo.platform",
    "cmdId": `${time}000000`,
    "time": time,
  }

  console.log('ok');
  const { vsign, tbid: tbidRight, vts, vcs, vversion, ftv, mtd, mky } = await getVSign(bodyLogin, {
    agentid: 0,
    phone: '',
    devicecode: dataDevice.deviceCode,
    secureid: dataDevice.secureId,
  });
  console.log('vsign', vsign, tbidRight, vts, vcs, vversion, ftv, mtd, mky)

  const headers = {
    ...commonHeader,
    sessionkey: '',
    userid: phone,
    msgtype: 'USER_LOGIN_MSG',
    user_phone: phone,
    agent_id: 0,
    authorization: 'Bearer',
    vsign,
    tbid: tbidRight,
    vts, vcs, vversion, ftv, mtd, mky,
    'user-agent': `${currentAccount.userAgent}/0`,
  }

  const { data: result } = await axios.post(LOGIN_LINK, bodyLogin, {
    headers,
  });

  console.log(result);

  if (result.errorCode === 0) {
    console.log('Login momo thành công');
    const accessToken = result.extra.AUTH_TOKEN;
    const refreshToken = result.extra.REFRESH_TOKEN;
    const sessionKey = result.extra.SESSION_KEY;
    const agentId = result.momoMsg.agentId;
    const requestEncryptKey = result.extra.REQUEST_ENCRYPT_KEY;

    const update = {
      username: phone,
      pHash,
      authToken: accessToken,
      refreshToken,
      sessionKey,
      agentId,
      publicKey: requestEncryptKey,
      password,
      lastLogined: new Date().toISOString(),
      status: "login",
    }

    await MoMoModel.findOneAndUpdate({ username: phone }, {
      $set: update,
    }, { upsert: true })

    return {
      message: 'Đăng nhập thành công',
    };

  }
  throw new Error(result.errorDesc || 'Có lỗi khi login')

}

const loginAccountWithSmart = async (phone, password) => {
  const currentAccount = await MoMoModel.findOne({ username: phone }).lean();
  if (!currentAccount) {
    throw new Error('Account not found');
  }
  if (currentAccount.status === "lock") {
    throw new Error('Tài khoản đã bị khóa')
  }
  const dataDevice = JSON.parse(currentAccount.device);

  let loginPassword = currentAccount.password || password;

  const time = Date.now();

  const checkSumCalculated = Utils.calculateCheckSum(phone, 'USER_LOGIN_MSG', time, currentAccount.setupKey);
  const pHash = Utils.calculatePHash(currentAccount.imei, password, currentAccount.setupKey);

  if (currentAccount.complexPassword) {
    const bodyLogin = {
      "user": phone,
      "pass": pHash,
      "msgType": "USER_LOGIN_MSG",
      "momoMsg": {
        "_class": "mservice.backend.entity.msg.LoginMsg",
        "isSetup": false
      },
      "extra": {
        "pHash": pHash,
        "IDFA": "",
        "SIMULATOR": false,
        "TOKEN": dataDevice.dummyFcmToken,
        "ONESIGNAL_TOKEN": dataDevice.dummyFcmToken,
        "SECUREID": dataDevice.secureId,
        "MODELID": dataDevice.modelId,
        "DEVICE_TOKEN": "",
        "checkSum": checkSumCalculated,
        "isNFCAvailable": false,
        "sHash": null
      },
      "appVer": APP_VER,
      "appCode": APP_CODE,
      "lang": "vi",
      "deviceName": dataDevice.deviceName,
      "deviceOS": "android",
      "channel": "APP",
      "buildNumber": 0,
      "appId": "vn.momo.platform",
      "cmdId": `${time}000000`,
      "time": time,
    }

    const result = await registerSmartForAccount(bodyLogin)

    console.log(result);

    return result;

  }


  const bodyLogin = {
    "user": phone,
    "pass": loginPassword,
    "msgType": "USER_LOGIN_MSG",
    "momoMsg": {
      "_class": "mservice.backend.entity.msg.LoginMsg",
      "isSetup": false,
    },
    "extra": {
      "pHash": pHash,
      "IDFA": "",
      "SIMULATOR": false,
      "TOKEN": "",
      "ONESIGNAL_TOKEN": "",
      "SECUREID": dataDevice.secureId,
      "MODELID": dataDevice.modelId,
      "DEVICE_TOKEN": "",
      "checkSum": checkSumCalculated,
      "isNFCAvailable": true,
    },
    "appVer": APP_VER,
    "appCode": APP_CODE,
    "lang": "vi",
    "deviceOS": "android",
    "deviceName": dataDevice.deviceName,
    "channel": "APP",
    "buildNumber": 0,
    "appId": "vn.momo.platform",
    "cmdId": `${time}000000`,
    "time": time,
  }


  const result = await registerSmartForAccount(bodyLogin)

  console.log(result);

  return result;

}
async function checkUserBeMsg(phone) {
  try {
    const randomDevice = _.sample(DEVICE_LIST);
    const osVersion = _.sample([10]); // 9 => firmware 28
    const firmware = osVersion + 19;
    const buildNumber = Utils.generateRandomBuildId();
    const userAgentNoEndingZero = generateUserAgent(APP_CODE, APP_VER, randomDevice.code, buildNumber, _.sample([9, 10, 11, 12, 13]));
    const momoSessionKeyTracking = Utils.generateUUIDv4().toLowerCase();
    const dummyFcmToken = Utils.getDummyFcmToken();

    const secureId = Utils.generateSecureId();
    const modelId = Utils.generateModelId();
    const imei = Utils.getImeiFromSecureAndModel(secureId, modelId);

    const random20Characters = Utils.generateRandomString(20, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVXZ');

    const rkey = Utils.sha256(`${phone}${random20Characters}`).slice(0, 32);

    // momo data cần gửi
    const momoData = {
      "userId": phone,
      "msgType": "AUTH_USER_MSG",
      "cmdId": `${Date.now()}000000`,
      "time": Date.now(),
      "appVer": APP_VER,
      "appCode": APP_CODE,
      "deviceOS": "android",
      "buildNumber": APP_VER,
      "imei": imei,
      "device": randomDevice.name,
      "firmware": `${firmware}`,
      "hardware": randomDevice.manufacture,
      "rkey": rkey,
      "isNFCAvailable": true,
    }
    console.log('BODY cần lấy vsign', momoData);
    const {vsign, vts, vcs, vversion, tbid, ftv, mtd, mky} = await getVSign(momoData, {
      agentid: 0,
      phone: '',
      devicecode: randomDevice.code,
      secureid: secureId,
    });
    console.log('VSign là', vsign);
    if (!vsign) {
      // Trường hợp không lấy được vsign
      return {
        message: 'Có lỗi khi lấy vSign AUTH_USER_MSG',
      }
    }


    const headers = {
      sessionKey: '',
      userid: '',
      user_phone: '',
      vsign, vts, vcs, vversion, tbid, ftv, mtd, mky,
      'platform-timestamp': Date.now(),
      'momo-session-key-tracking': momoSessionKeyTracking,
      'user-agent': `${userAgentNoEndingZero}/0`,
      ...commonHeader,
    }
    console.log('Header là', headers);
    // momoData cần phải minify trước khi gửi lên momo, ở đây dùng trick JSON.parse(JSON.stringify(momoData))
    const {data: resultMoMo} = await axios.post(CHECK_USER_BE_MSG_LINK, momoData, {
      headers,
    }, phone);
    // Trường hợp momo imei đang login thì đăng nhập lại không cần lấy OTP
    if (resultMoMo.errorCode === 0 && _.get(resultMoMo, 'setupKey')) {
      // TODO: relogin
      return {message: 'Đã đăng nhập lại thành công không cần lấy OTP mới'};
    }
    if (resultMoMo.setupKey === "" && resultMoMo.atoken === "") {
      const riskId = resultMoMo.riskId;
      const riskErrorOTPCode = 881200002; //
      const riskOptionKey = _.find(_.get(resultMoMo, 'popupData.items'), (a) => a.errorCode === riskErrorOTPCode).optionKey;
      // save to DB
      const device = {
        osVersion,
        deviceName: randomDevice.name,
        deviceCode: randomDevice.code,
        manufacture: randomDevice.manufacture,
        buildNumber,
        firmware,
        modelId,
        secureId,
        rKey: rkey,
        dummyFcmToken: dummyFcmToken,

      }
      await MoMoModel.findOneAndUpdate({username: phone}, {
        $set: {
          userAgent: userAgentNoEndingZero,
          username: phone,
          momoSessionKeyTracking,
          device: JSON.stringify(device),
          riskId,
          riskErrorCode: riskErrorOTPCode,
          riskOptionKey,
          imei,
        },
      }, {upsert: true})
      return {
        message: 'Check user thành công',
      }
    }

    throw new Error(resultMoMo.errorDesc || 'Có lỗi khi gọi CHECK_USER_BE_MSG');


  } catch (e) {
    console.log('Có lỗi xảy ra khi gọi API momo CHECK_USER_BE_MSG', e);
    return {
      message: 'Có lỗi xảy ra khi gọi API momo CHECK_USER_BE_MSG',
    }
  }

}

async function sendOtpMsg(phone) {
  try {
    const currentAccount = await MoMoModel.findOne({username: phone}).lean();
    if (!currentAccount) {
      throw new Error('Account not found')
    }
    const dataDevice = JSON.parse(currentAccount.device);

    // momo data cần gửi
    const params = {
      riskId: currentAccount.riskId,
      methodCode: currentAccount.riskErrorCode,
      imei: currentAccount.imei,
    }

    // Trường hợp có vsign tiến hành gửi đến api momo

    const headers = {
      sessionkey: '',
      user_id: phone,
      'user-id': phone,
      'userId': phone,
      MsgType: 'GEN_METHOD_TOKEN_MSG',
      'option-key': currentAccount.riskOptionKey,
      user_phone: '',
      'platform-timestamp': Date.now(),
      'momo-session-key-tracking': currentAccount.momoSessionKeyTracking,
      'user-agent': `${currentAccount.userAgent}/0`,
      ...commonHeader,
    }
    console.log('Header là', headers);
    // momoData cần phải minify trước khi gửi lên momo, ở đây dùng trick JSON.parse(JSON.stringify(momoData))
    const {data: resultMoMo} = await axios.get(TOKEN_GENERATE_LINK, {
      params,
      headers,
    });

    if (resultMoMo.errorCode === 881200002) {

      const aToken = _.get(resultMoMo, 'riskMsg.token');
      const rKey = Utils.generateRandomString(20);
      const queryParams = {
        cmdId: `${Date.now()}000000`,
        rkey: rKey,
        firmware: dataDevice.firmware
      }

      const vsignDataLink = `${SEND_OTP_MSG_LINK}?cmdId=${queryParams.cmdId}&rkey=${queryParams.rkey}&firmware=${queryParams.firmware}`;


      const {vsign, vts, vcs, vversion, tbid, ftv, mtd, mky} = await getVSign({encrypted: vsignDataLink}, {
        agentid: 0,
        phone: '',
        devicecode: dataDevice.deviceCode,
        secureid: dataDevice.secureId,
      });
      console.log('VSign là', vsign);
      if (!vsign) {
        // Trường hợp không lấy được vsign
        return {
          message: 'Có lỗi khi lấy vSign INIT_OTP_MSG',
        }
      }

      const {data: resultMoMo1} = await axios.get(SEND_OTP_MSG_LINK, {
        params: queryParams,
        headers: {
          authorization: aToken,
          sessionkey: '',
          'userId': phone,
          user_phone: '',
          'platform-timestamp': Date.now(),
          'momo-session-key-tracking': currentAccount.momoSessionKeyTracking,
          'user-agent': `${currentAccount.userAgent}/0`,
          ...commonHeader,
          vsign, vts, vcs, vversion, tbid, ftv, mtd, mky
        },
      });

      if (resultMoMo1.errorCode === 0) {
        await MoMoModel.findOneAndUpdate({username: phone}, {
          $set: {
            aToken,
            rkeyOTP: queryParams.rkey,
            status: "otp",
          },
        }, {upsert: true});


        return {
          message: 'Gửi OTP thành công',
        }
      } else {
        throw new Error(resultMoMo1.errorDesc || 'Có lỗi khi gọi INIT_OTP_MSG');
      }


    }

    throw new Error(resultMoMo.errorDesc || 'Có lỗi khi gọi CHECK_USER_BE_MSG');


  } catch (e) {
    throw e;
  }

}

const requestOTP = async (phone) => {

  await checkUserBeMsg(phone);
  const result = await sendOtpMsg(phone);

  return result;
}

async function regDeviceMsg(phone, otp, pin = '') {
  try {
    const currentAccount = await MoMoModel.findOne({username: phone}).lean();
    if (!currentAccount) {
      throw new Error('Account not found')
    }
    const dataDevice = JSON.parse(currentAccount.device);
    const parsedAToken = Utils.parseJwt(currentAccount.aToken);
    const otpValue = Utils.calculateOHash(parsedAToken.user, currentAccount.rkeyOTP, otp);


    const time = Date.now();
    // momo data cần gửi
    const momoData = {
      "msgType": "VERIFY_OTP_MSG",
      "cmdId": `${time}000000`,
      "otpValue": otpValue,
      "publicKey": null,
    }

    console.log('BODY cần lấy vsign', momoData);
    const {vsign, vts, vcs, vversion, tbid, ftv, mtd, mky} = await getVSign(momoData, {
      agentid: 0,
      phone: '',
      devicecode: dataDevice.deviceCode,
      secureid: dataDevice.secureId,
    });
    console.log('VSign là', vsign);
    if (!vsign) {
      // Trường hợp không lấy được vsign
      return {
        message: 'Có lỗi khi lấy vSign VERIFY_OTP_MSG',
      }
    }
    // Trường hợp có vsign tiến hành gửi đến api momo

    const headers = {
      authorization: currentAccount.aToken,
      sessionKey: '',
      userid: '',
      user_phone: '',
      vsign: vsign,
      tbid,
      vts, vcs, vversion, ftv, mtd, mky,
      'platform-timestamp': Date.now(),
      'momo-session-key-tracking': currentAccount.momoSessionKeyTracking,
      'user-agent': `${currentAccount.userAgent}/0`,
      ...commonHeader,
    }
    console.log('Header là', headers);
    // momoData cần phải minify trước khi gửi lên momo, ở đây dùng trick JSON.parse(JSON.stringify(momoData))
    const {data: resultMoMo} = await axios.post(REG_DEVICE_MSG_LINK, momoData, {
      headers,
    }, phone);

    if (resultMoMo.errorCode === 0) {

      // momo data cần gửi
      const momoData1 = {
        "userId": phone,
        "msgType": "AUTH_USER_MSG",
        "cmdId": `${Date.now()}000000`,
        "time": Date.now(),
        "appVer": APP_VER,
        "appCode": APP_CODE,
        "deviceOS": "android",
        "buildNumber": APP_VER,
        "imei": currentAccount.imei,
        "device": dataDevice.deviceName,
        "firmware": `${dataDevice.firmware}`,
        "hardware": dataDevice.manufacture,
        "rkey": dataDevice.rKey,
        "isNFCAvailable": true,
      }
      console.log('BODY cần lấy vsign', momoData);
      const {vsign, vts, vcs, vversion, tbid, ftv, mtd, mky} = await getVSign(momoData1, {
        agentid: 0,
        phone: '',
        devicecode: dataDevice.deviceCode,
        secureid: dataDevice.secureId,
      });
      console.log('VSign là', vsign);
      if (!vsign) {
        // Trường hợp không lấy được vsign
        return {
          message: 'Có lỗi khi lấy vSign AUTH_USER_MSG',
        }
      }


      const headers = {
        'risk-id': currentAccount.riskId,
        sessionKey: '',
        userid: '',
        user_phone: '',
        vsign, vts, vcs, vversion, tbid, ftv, mtd, mky,
        'platform-timestamp': Date.now(),
        'momo-session-key-tracking': currentAccount.momoSessionKeyTracking,
        'user-agent': `${currentAccount.userAgent}/0`,
        ...commonHeader,
      }
      console.log('Header là', headers);
      // momoData cần phải minify trước khi gửi lên momo, ở đây dùng trick JSON.parse(JSON.stringify(momoData))
      const {data: resultMoMo1} = await axios.post(CHECK_USER_BE_MSG_LINK, momoData1, {
        headers,
      }, phone);

      if (resultMoMo1.setupKey) {
        const setupKey = Utils.aes256cbcDecrypt(resultMoMo1.setupKey, dataDevice.rKey);
        const name = resultMoMo1.userInfo.name;

        const complexPassword = !!resultMoMo1.userInfo.complexPassword;
        let bodyUpdate = {
          username: phone,
          setupKey,
          name,
          status: "confirmed-otp",
          complexPassword
        }
        if (complexPassword) {
          bodyUpdate.pin = pin;
        }

        await MoMoModel.findOneAndUpdate({username: phone}, {
          $set: {
            ...bodyUpdate
          },
        }, {upsert: true});

        return {
          message: 'OTP hợp lệ, đang tiến hành login',
        }
      }


    } else {
      throw new Error(resultMoMo.errorDesc || 'Có lỗi khi gọi VERIFY_OTP_MSG');
    }


  } catch (e) {
    throw e;
  }

}

const confirmOTP = async (phone, password, pin, otp)  => {
  const currentMomo = await MoMoModel.findOne({username: phone}).lean();
  if (currentMomo && currentMomo.authToken) {
    throw new Error('MoMo đã được thiết lập trước đó')
  }

  if (currentMomo && currentMomo.status !== "otp") {
    throw new Error('Vui lòng lấy OTP trước')
  }

  await regDeviceMsg(phone, otp, pin);
  const data = await loginAccount(phone, password);
  return data;

}


const relogin = async (phone) => {
  const account = await MoMoModel.findOne({ username: phone }).lean();
  if (!account) {
    throw new Error('Account not found');
  }
  if (account.status !== "login") {
    throw new Error('Account not ready');
  }
  return loginAccount(account.username, account.password);
}

const reloginRegisterSmart = async (phone) => {
  const account = await MoMoModel.findOne({ username: phone }).lean();
  if (!account) {
    throw new Error('Account not found');
  }
  if (account.status !== "login") {
    throw new Error('Account not ready');
  }
  return loginAccountWithSmart(account.username, account.password);
}

const deleteSmartOTP = async (phone) => {
  return deleteSmartForAccount(phone);
}

const refreshToken = async (phone) => {
  const currentAccount = await MoMoModel.findOne({ username: phone }).lean();
  const dataDevice = JSON.parse(currentAccount.device);
  const timeToRequest = Date.now();

  const body = {
    "user": currentAccount.username,
    "msgType": "REFRESH_TOKEN_MSG",
    "momoMsg": {
      "_class": "mservice.backend.entity.msg.RefreshAccessTokenMsg",
      "accessToken": currentAccount.authToken,
    },
    "extra": {
      "IDFA": "",
      "SIMULATOR": false,
      "TOKEN": dataDevice.dummyFcmToken,
      "ONESIGNAL_TOKEN": dataDevice.dummyFcmToken,
      "SECUREID": dataDevice.secureId,
      "MODELID": dataDevice.modelId,
      "DEVICE_TOKEN": "",
      "DEVICE_IMEI": currentAccount.imei,
      "checkSum": Utils.calculateCheckSum(currentAccount.username, 'REFRESH_TOKEN_MSG', timeToRequest, currentAccount.setupKey),
    },
    "appVer": APP_VER,
    "appCode": APP_CODE,
    "lang": "vi",
    "deviceName": dataDevice.deviceName,
    "deviceOS": "android",
    "channel": "APP",
    "buildNumber": 0,
    "appId": "vn.momo.platform",
    "cmdId": `${timeToRequest}000000`,
    "time": timeToRequest,
  };

  const headers = {
    ...commonHeader,
    sessionkey: currentAccount.sessionKey,
    userid: currentAccount.username,
    msgtype: 'REFRESH_TOKEN_MSG',
    user_phone: currentAccount.username,
    'platform-timestamp': Date.now(),
    'momo-session-key-tracking': currentAccount.momoSessionKeyTracking,
    'user-agent': `${currentAccount.userAgent}${currentAccount.agentId}`,
    Authorization: `Bearer ${currentAccount.refreshToken}`,
  }
  console.log('Header là', headers);
  // momoData cần phải minify trước khi gửi lên momo, ở đây dùng trick JSON.parse(JSON.stringify(momoData))
  const { data: resultMoMo } = await axios.post(REFRESH_TOKEN_LINK, body, {
    headers,
  });

  if (resultMoMo.errorCode === 0) {
    await MoMoModel.findOneAndUpdate({ username: phone }, {
      $set: {
        authToken: resultMoMo.momoMsg.accessToken,
        lastLogined: new Date().toISOString(),
      },
    });
    return true
  }
  return false;
}


const getBalance = async (phone, returnSofInfo = false) => {
  const currentAccount = await MoMoModel.findOne({ username: phone }).lean();

  const dataDevice = JSON.parse(currentAccount.device);
  const timeToRequest = Date.now();

  const body = {
    "appCode": APP_CODE,
    "appId": "",
    "appVer": APP_VER,
    "buildNumber": 0,
    "channel": "APP",
    "cmdId": `${timeToRequest}000000`,
    "time": timeToRequest,
    "deviceName": dataDevice.deviceName,
    "deviceOS": "android",
    "errorCode": 0,
    "errorDesc": "",
    "extra": {
      "checkSum": Utils.calculateCheckSum(currentAccount.username, 'SOF_LIST_MANAGER_MSG', timeToRequest, currentAccount.setupKey),
    },
    "lang": "vi",
    "user": currentAccount.username,
    "msgType": "SOF_LIST_MANAGER_MSG",
    "momoMsg": {
      "phone": currentAccount.username,
      "_class": "mservice.backend.entity.msg.ListDefaultMoneyMsg",
    },
    "pass": "",
  }

  const resultMoMo = await doRequestEncryptMoMo(BALANCE, body, currentAccount, "SOF_LIST_MANAGER_MSG", {agentid: currentAccount.agentId, secureid: dataDevice.secureId, devicecode: dataDevice.deviceCode, phone: currentAccount.username})
  if (resultMoMo.errorCode === 0) {
    console.log(resultMoMo.momoMsg.sofInfo);
    const momoWaller = _.find(_.get(resultMoMo, 'momoMsg.sofInfo'), (a) => a.type === 1);
    return returnSofInfo ? resultMoMo.momoMsg.sofInfo : momoWaller?.balance;
  }
  return -1;
}

async function findProfile(account, to) {
  const currentAccount = await MoMoModel.findOne({ username: account.username }).lean();

  const dataDevice = JSON.parse(currentAccount.device);
  const timeToRequest = Date.now();

  const body = {
    "appCode": APP_CODE,
    "appId": "vn.momo.transfer",
    "appVer": APP_VER,
    "buildNumber": 9968,
    "channel": "APP",
    "cmdId": `${timeToRequest}000000`,
    "time": timeToRequest,
    "deviceName": dataDevice.deviceName,
    "deviceOS": "android",
    "errorCode": 0,
    "errorDesc": "",
    "extra": { "checkSum": Utils.calculateCheckSum(currentAccount.username, 'FIND_RECEIVER_PROFILE', timeToRequest, currentAccount.setupKey) },
    "lang": "vi",
    "user": currentAccount.username,
    "msgType": "FIND_RECEIVER_PROFILE",
    "momoMsg": {
      "callerId": "FE_transfer_p2b",
      "targetUserId": to,
      "_class": "mservice.backend.entity.msg.ForwardMsg",
      "fieldNames": ["userId", "agentId", "name", "avatarUrl", "isShop", "passTT23"],
    },
    "pass": "",
  }

  const resultMoMo = await doRequestEncryptMoMo(FIND_MOMO, body, currentAccount, "FIND_RECEIVER_PROFILE", {agentid: currentAccount.agentId, secureid: dataDevice.secureId, devicecode: dataDevice.deviceCode, phone: currentAccount.username})

  return _.get(resultMoMo, 'momoMsg.receiverProfile');

}

async function findBankAccount(account, bankAccountNumber, bankCode) {
  const currentAccount = await MoMoModel.findOne({ username: account.username }).lean();

  const dataDevice = JSON.parse(currentAccount.device);

  const listBankFound = _.find(Utils.BANK_LIST, (a) => a.bankCode === bankCode);
  if (!listBankFound) {
    return null
  }

  const randomRequestId = Utils.generateRandomString(32, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVXZ');
  const body = {
    "appCode": APP_CODE,
    "appId": "vn.momo.bank",
    "appVer": APP_VER,
    "buildNumber": 7516,
    "channel": "APP",
    "lang": "vi",
    "deviceName": dataDevice.deviceName,
    "deviceOS": "android",
    "requestId": randomRequestId,
    "agent": currentAccount.username,
    "agentId": currentAccount.agentId,
    "coreBankCode": "2001",
    "serviceId": "2001",
    "benfAccount": {
      "accId": bankAccountNumber,
      "napasBank": {
        "bankCode": listBankFound.bankCode,
        "bankName": listBankFound.displayName,
      },
      "nickName": "",
    },
    "msgType": "CheckAccountRequestMsg",
    "paymentChannel": "bank_popular",
  }
  const { vsign, tbid, vts, vcs, vversion, ftv, mtd, mky } = await getVSign(body, {agentid: currentAccount.agentId, secureid: dataDevice.secureId, devicecode: dataDevice.deviceCode, phone: currentAccount.username});

  const headers = {
    ...commonHeader,
    vsign,
    tbid,
    vts,
    vcs,
    vversion,
    ftv, mtd, mky,
    sessionkey: currentAccount.sessionKey,
    userid: currentAccount.username,
    user_phone: currentAccount.username,
    'platform-timestamp': Date.now(),
    'momo-session-key-tracking': currentAccount.momoSessionKeyTracking,
    'user-agent': `${currentAccount.userAgent}${currentAccount.agentId}`,
    Authorization: `Bearer ${currentAccount.authToken}`,
  }
  console.log('Header là', headers);
  // momoData cần phải minify trước khi gửi lên momo, ở đây dùng trick JSON.parse(JSON.stringify(momoData))
  const { data: resultMoMo } = await axios.post(SERVICE_DISPATCHER_LINK, body, {
    headers,
  });
  return resultMoMo;
}

async function initMoMoToMoMo(account, to, receiverAgentId, receiverName, amount, memo) {
  const currentAccount = await MoMoModel.findOne({ username: account.username }).lean();

  const dataDevice = JSON.parse(currentAccount.device);
  const timeToRequest = Date.now();


  const initBody = {
    "appCode": hardCodedAppCode,
    "appId": "vn.momo.payment",
    "appVer": hardCodedAppVer,
    "buildNumber": 3791,
    "channel": "APP",
    "cmdId": `${timeToRequest}000000`,
    "time": timeToRequest,
    "deviceName": dataDevice.deviceName,
    "deviceOS": "android",
    "errorCode": 0,
    "errorDesc": "",
    "extra": { "checkSum": Utils.calculateCheckSum(currentAccount.username, 'M2MU_INIT', timeToRequest, currentAccount.setupKey) },
    "lang": "vi",
    "user": currentAccount.username,
    "msgType": "M2MU_INIT",
    "momoMsg": {
      "tranType": 2018,
      "tranList": [{
        "themeUrl": "https://img.mservice.com.vn/app/img/transfer/theme/trasua-750x260.png",
        "stickers": "",
        "partnerName": receiverName,
        "serviceId": "transfer_p2p",
        "originalAmount": amount,
        "receiverType": 1,
        "partnerId": to,
        "serviceCode": "transfer_p2p",
        "_class": "mservice.backend.entity.msg.M2MUInitMsg",
        "tranType": 2018,
        "comment": memo,
        "moneySource": 1,
        "partnerCode": "momo",
        "rowCardId": null,
        "sourceToken": "SOF-1",
        "extras": "{\"avatarUrl\":\"\",\"aliasName\":\"\",\"appSendChat\":false,\"stickers\":\"\",\"themeId\":261,\"source\":\"search_p2p\",\"expenseCategory\":\"16\",\"categoryName\":\"Cà phê, đồ uống khác\",\"agentId\":" + receiverAgentId + ",\"bankCustomerId\":\"\"}",
      }],
      "clientTime": Date.now(),
      "serviceId": "transfer_p2p",
      "_class": "mservice.backend.entity.msg.M2MUInitMsg",
      "defaultMoneySource": 1,
      "sourceToken": "SOF-1",
      "giftId": "",
      "useVoucher": 0,
      "discountCode": null,
      "prepaidIds": "",
      "usePrepaid": 0,
    },
    "pass": "",
  }
  const resultMoMo = await doRequestEncryptMoMo(INIT_M2MU, initBody, currentAccount, "M2MU_INIT", {agentid: currentAccount.agentId, secureid: dataDevice.secureId, devicecode: dataDevice.deviceCode, phone: currentAccount.username})

  return resultMoMo

}

async function initMoMoToBank(account, bankData, amount, memo) {
  const currentAccount = await MoMoModel.findOne({ username: account.username }).lean();

  const dataDevice = JSON.parse(currentAccount.device);
  const timeToRequest = Date.now();
  const {
    bankName,
    bankNameServer,
    checkAccountRefNumber,
    accountName,
    bankCode,
    bankAccountNumber,
    logo,
  } = bankData;


  const initBody = {
    "appCode": hardCodedAppCode,
    "appId": "vn.momo.payment",
    "appVer": hardCodedAppVer,
    "buildNumber": 3791,
    "channel": "APP",
    "cmdId": `${timeToRequest}000000`,
    "time": timeToRequest,
    "deviceName": dataDevice.deviceName,
    "deviceOS": "android",
    "errorCode": 0,
    "errorDesc": "",
    "extra": {
      "checkSum": Utils.calculateCheckSum(currentAccount.username, 'TRAN_HIS_INIT_MSG', timeToRequest, currentAccount.setupKey),
    },
    "lang": "vi",
    "user": currentAccount.username,
    "msgType": "TRAN_HIS_INIT_MSG",
    "momoMsg": {
      "tranType": 8,
      "clientTime": Date.now(),
      "extras": JSON.stringify({
        "saveCard": false,
        "bankNumber": bankAccountNumber,
        "bankName": bankName,
        "benfPhoneNumberInput": checkAccountRefNumber,
        "checkFeeCacheRefNumber": "",
        "bankLogo": {
          "uri": logo,
        },
        "receiverName": accountName,
        "nickName": "",
        "themeP2P": "default",
        "informCardSOF": {
          "refId": "funds_manager",
          "ctaTitle": "Thử ngay",
          "isShow": true,
          "title": "Thiết lập tài khoản ưu tiên",
          "description": "Bạn sẽ không cần mất thời gian kiểm tra, lựa chọn tài khoản mỗi khi chuyển tiền/thanh toán.",
        },
        "renderType": "REFERRAL_BANNER",
        "source": "bank_list",
        "paymentChannel": "bank_list",
        "categoryId": null,
        "categoryGroupName": "",
        "receiverNumber": "",
        "receiverId": "",
        "beneficialId": bankAccountNumber,
        "enableCheckPayLaterVietQr": false,
        "bankCustomerId": "",
      }),
      "comment": memo,
      "partnerRef": "",
      "serviceId": "transfer_p2b",
      "partnerName": bankNameServer,
      "rowCardNum": bankAccountNumber,
      "amount": amount,
      "ownerName": accountName,
      "_class": "mservice.backend.entity.msg.TranHisMsg",
      "partnerId": bankCode,
      "serviceCode": "transfer_p2b",
      "moneySource": 1,
      "defaultMoneySource": 1,
      "sourceToken": "SOF-1",
      "partnerCode": "momo",
      "rowCardId": "",
      "giftId": "",
      "useVoucher": 0,
      "discountCode": null,
      "prepaidIds": "",
      "usePrepaid": 0,
    },
    "pass": "",
  }

  const resultMoMo = await doRequestEncryptMoMo(TRAN_HIS_INIT_MSG, initBody, currentAccount, "TRAN_HIS_INIT_MSG", {agentid: currentAccount.agentId, secureid: dataDevice.secureId, devicecode: dataDevice.deviceCode, phone: currentAccount.username})

  return resultMoMo
}

async function initMoMoWithdraw(account, amount, linkedBank) {
  const currentAccount = await MoMoModel.findOne({ username: account.username }).lean();

  const dataDevice = JSON.parse(currentAccount.device);
  const timeToRequest = Date.now();
  let extras = "";

  const bankCustomerId = linkedBank?.detail.bankCustomerId;
  if (bankCustomerId) {
    extras = JSON.stringify({ bankCustomerId: bankCustomerId });
  }

  const initBody = {
    "appCode": hardCodedAppCode,
    "appId": "vn.momo.payment",
    "appVer": hardCodedAppVer,
    "buildNumber": 3791,
    "channel": "APP",
    "cmdId": `${timeToRequest}000000`,
    "time": timeToRequest,
    "deviceName": dataDevice.deviceName,
    "deviceOS": "android",
    "errorCode": 0,
    "errorDesc": "",
    "extra": { "checkSum": Utils.calculateCheckSum(currentAccount.username, 'TRAN_HIS_INIT_MSG', timeToRequest, currentAccount.setupKey) },
    "lang": "vi",
    "user": currentAccount.username,
    "msgType": "TRAN_HIS_INIT_MSG",
    "momoMsg": {
      "_class": "mservice.backend.entity.msg.TranHisMsg",
      "partnerCode": linkedBank.bankCode,
      "comment": "",
      "tranType": 2,
      "amount": amount,
      "clientTime": Date.now(),
      "moneySource": 2,
      "sourceToken": linkedBank.sourceToken,
      "rowCardId": "",
      "giftId": "",
      "useVoucher": 0,
      "discountCode": null,
      "prepaidIds": "",
      "usePrepaid": 0,
      "extras": extras,
    },
    "pass": "",
  }


  const resultMoMo = await doRequestEncryptMoMo(TRAN_HIS_INIT_MSG, initBody, currentAccount, "TRAN_HIS_INIT_MSG", {agentid: currentAccount.agentId, secureid: dataDevice.secureId, devicecode: dataDevice.deviceCode, phone: currentAccount.username})

  return resultMoMo
}

async function confirmMoMoToMoMo(account, to, amount, confirmId) {
  const currentAccount = await MoMoModel.findOne({ username: account.username }).lean();

  const dataDevice = JSON.parse(currentAccount.device);
  const timeToRequest = Date.now();


  const confirmBody = {
    "appCode": hardCodedAppCode,
    "appId": "vn.momo.payment",
    "appVer": hardCodedAppVer,
    "buildNumber": 3791,
    "channel": "APP",
    "cmdId": `${timeToRequest}000000`,
    "time": timeToRequest,
    "deviceName": dataDevice.deviceName,
    "deviceOS": "android",
    "errorCode": 0,
    "errorDesc": "",
    "extra": { "checkSum": Utils.calculateCheckSum(currentAccount.username, 'M2MU_CONFIRM', timeToRequest, currentAccount.setupKey) },
    "lang": "vi",
    "user": currentAccount.username,
    "msgType": "M2MU_CONFIRM",
    "momoMsg": {
      "otpType": "NA",
      "ipAddress": "N/A",
      "enableOptions": { "voucher": true, "discount": false, "prepaid": false, "desc": "" },
      "_class": "mservice.backend.entity.msg.M2MUConfirmMsg",
      "quantity": 1,
      "idFirstReplyMsg": confirmId,
      "isOtp": false,
      "moneySource": 1,
      "sourceToken": "SOF-1",
      "desc": "Thành công",
      "error": 0,
      "tranType": 2018,
      "serviceId": "transfer_p2p",
      "ids": [confirmId],
      "amount": amount,
      "originalAmount": amount,
      "fee": 0,
      "otp": "",
      "extras": "{}",
    },
    "pass": currentAccount.pin || currentAccount.password, // trường hợp tài khoản pass là chữ thì lấy pass từ pin
  }

  const resultMoMo = await doRequestEncryptMoMo(CONFIRM_M2MU, confirmBody, currentAccount, "M2MU_CONFIRM", {agentid: currentAccount.agentId, secureid: dataDevice.secureId, devicecode: dataDevice.deviceCode, phone: currentAccount.username})

  return resultMoMo
}

async function confirmMoMoToBank(account, initTransHisMsg, amount, confirmId) {
  const currentAccount = await MoMoModel.findOne({ username: account.username }).lean();

  const dataDevice = JSON.parse(currentAccount.device);
  const timeToRequest = Date.now();

  const confirmBody = {
    "appCode": hardCodedAppCode,
    "appId": "vn.momo.payment",
    "appVer": hardCodedAppVer,
    "buildNumber": 3791,
    "channel": "APP",
    "cmdId": `${timeToRequest}000000`,
    "time": timeToRequest,
    "deviceName": dataDevice.deviceName,
    "deviceOS": "android",
    "errorCode": 0,
    "errorDesc": "",
    "extra": { "checkSum": Utils.calculateCheckSum(currentAccount.username, 'TRAN_HIS_CONFIRM_MSG', timeToRequest, currentAccount.setupKey) },
    "lang": "vi",
    "user": currentAccount.username,
    "msgType": "TRAN_HIS_CONFIRM_MSG",
    "momoMsg": {
      ...initTransHisMsg,
      "otp": "",
    },
    "pass": currentAccount.pin || currentAccount.password,
  }


  const resultMoMo = await doRequestEncryptMoMo(TRAN_HIS_CONFIRM_MSG, confirmBody, currentAccount, "TRAN_HIS_CONFIRM_MSG",{agentid: currentAccount.agentId, secureid: dataDevice.secureId, devicecode: dataDevice.deviceCode, phone: currentAccount.username})

  return resultMoMo
}

async function confirmMoMoWithdraw(account, initTransHisMsg) {
  const currentAccount = await MoMoModel.findOne({ username: account.username }).lean();

  const dataDevice = JSON.parse(currentAccount.device);
  const timeToRequest = Date.now();

  const confirmBody = {
    "appCode": hardCodedAppCode,
    "appId": "vn.momo.payment",
    "appVer": hardCodedAppVer,
    "buildNumber": 3791,
    "channel": "APP",
    "cmdId": `${timeToRequest}000000`,
    "time": timeToRequest,
    "deviceName": dataDevice.deviceName,
    "deviceOS": "android",
    "errorCode": 0,
    "errorDesc": "",
    "extra": { "checkSum": Utils.calculateCheckSum(currentAccount.username, 'TRAN_HIS_CONFIRM_MSG', timeToRequest, currentAccount.setupKey) },
    "lang": "vi",
    "user": currentAccount.username,
    "msgType": "TRAN_HIS_CONFIRM_MSG",
    "momoMsg": {
      ...initTransHisMsg,
      "otp": "",
    },
    "pass": currentAccount.pin || currentAccount.password,
  }


  return await doRequestEncryptMoMo(TRAN_HIS_CONFIRM_MSG, confirmBody, currentAccount, "TRAN_HIS_CONFIRM_MSG", {agentid: currentAccount.agentId, secureid: dataDevice.secureId, devicecode: dataDevice.deviceCode, phone: currentAccount.username})
}


const transferMoMoToMoMo = async (phone, to, amount, memo) => {
  const currentAccount = await MoMoModel.findOne({ username: phone }).lean();

  // tìm user nhận
  const profile = await findProfile(currentAccount, to);
  if (!profile) {
    return {
      message: 'Người dùng MoMo nhận tiền không tồn tại.',
      success: false,
    }
  }
  console.log(profile)
  const { agentId, name } = profile;
  console.log('Found receiver', name, 'agentId', agentId);

  // init giao dịch

  const result = await initMoMoToMoMo(currentAccount, to, agentId, name, amount, memo);
  if (_.get(result, 'result') && _.get(result, 'momoMsg.replyMsgs.0')) {
    // confirm giao dịch
    const confirmId = _.get(result, 'momoMsg.replyMsgs.0.id');
    const transId = _.get(result, 'momoMsg.replyMsgs.0.transId');
    console.log('Confirming transaction', transId, 'with ID', confirmId);
    const confirmResult = await confirmMoMoToMoMo(currentAccount, to, amount, confirmId);
    if (confirmResult.result) {
      return _.get(confirmResult, 'momoMsg.replyMsgs.0')
    } else {
      console.log(confirmResult);
      const riskId = confirmResult.momoMsg.ids[0];

      const {otpValue} = await getSmartOTP(phone, riskId);
      console.log('riskID', riskId, 'otp is', otpValue);
      const authFaceJwt = _.get(confirmResult, 'riskMsg.token')

      const { data: result } = await axios.post(MOMO_VERIFY_SMARTOTP_LINK, {
        "msgType": "VERIFY_SMART_OTP_MSG",
        "cmdId": `${Date.now()}000000`,
        "otpValue": otpValue
      }, {
        headers: {
          ...commonHeader,
          sessionkey: currentAccount.sessionKey,
          userid: currentAccount.username,
          user_phone: currentAccount.username,
          'platform-timestamp': Date.now(),
          'momo-session-key-tracking': currentAccount.momoSessionKeyTracking,
          'user-agent': `${currentAccount.userAgent}${currentAccount.agentId}`,
          Authorization: authFaceJwt
        }

      },
      );
      console.log(result);
      await BPromise.delay(2000);

      const confirmResult1 = await confirmMoMoToMoMo(currentAccount, to, amount, confirmId);

      return confirmResult1;
    }
  }


}

const transferMoMoToBank = async (phone, bankAccountNumber, bankCode, amount, memo) => {
  const currentAccount = await MoMoModel.findOne({ username: phone }).lean();
  const listBankFound = _.find(Utils.BANK_LIST, (a) => a.bankCode === bankCode);
  if (!listBankFound) {
    return {
      message: 'Ngân hàng nhận không hỗ trợ.',
      success: false,
    }
  }
  // tìm user nhận
  const profile = await findBankAccount(currentAccount, bankAccountNumber, bankCode);
  if (profile.resultCode === -9999) {
    return {
      message: 'Số tài khoản nhận tiền không tồn tại.',
      success: false,
    }
  }
  console.log(profile)
  const bankName = listBankFound.displayName;
  const bankNameServer = listBankFound.bankName;
  const checkAccountRefNumber = _.get(profile, 'benfAccount.checkAccountRefNumber');
  const accountName = _.get(profile, 'benfAccount.accName');
  const logo = _.get(profile, 'data.contactInfo.logo');

  const bankData = {
    bankName,
    bankNameServer,
    checkAccountRefNumber,
    accountName,
    bankCode,
    bankAccountNumber,
    logo,
  }

  // init giao dịch

  const result = await initMoMoToBank(currentAccount, bankData, amount, memo);
  console.log(result)
  if (_.get(result, 'result')) {

    // confirm giao dịch
    const confirmId = _.get(result, 'momoMsg.replyMsgs.0.id');
    const transId = _.get(result, 'momoMsg.replyMsgs.0.transId');
    console.log('Confirming transaction', transId, 'with ID', confirmId);
    const confirmResult = await confirmMoMoToBank(currentAccount, result.momoMsg.tranHisMsg, amount, confirmId);
    if (confirmResult.result) {
      return _.get(confirmResult, 'momoMsg.tranHisMsg')
    } else {
      console.log(confirmResult);

      const riskId = confirmResult.momoMsg.tranHisMsg.ID;
      const {otpValue} = await getSmartOTP(phone, riskId);
      console.log('riskID', riskId, 'otp is', otpValue);

      const authFaceJwt = _.get(confirmResult, 'riskMsg.token')

      const { data: result1 } = await axios.post(MOMO_VERIFY_SMARTOTP_LINK, {
        "msgType": "VERIFY_SMART_OTP_MSG",
        "cmdId": `${Date.now()}000000`,
        "otpValue": otpValue}, {
          headers: {
            ...commonHeader,
            sessionkey: currentAccount.sessionKey,
            userid: currentAccount.username,
            user_phone: currentAccount.username,
            'platform-timestamp': Date.now(),
            'momo-session-key-tracking': currentAccount.momoSessionKeyTracking,
            'user-agent': `${currentAccount.userAgent}${currentAccount.agentId}`,
            Authorization: authFaceJwt
          }

        },
      );
      console.log(result1);
      await BPromise.delay(2000);

      const confirmResult1 = await confirmMoMoToBank(currentAccount, result.momoMsg.tranHisMsg, amount, confirmId);

      return confirmResult1;

    }
  }


}

const withdrawMoneyToBank = async (phone, amount) => {
  const currentAccount = await MoMoModel.findOne({ username: phone }).lean();
  const currentBankSofInfo = await getBalance(currentAccount.username, true);
  console.log(currentBankSofInfo);
  const findLinkedBank = _.find(currentBankSofInfo, (a) => !!a.bankCode);
  if (!findLinkedBank) {
    return {
      message: 'Momo không có ngân hàng liên kết.',
      success: false,
    }
  }
  // init giao dịch

  const result = await initMoMoWithdraw(currentAccount, amount, findLinkedBank);
  console.log(result)
  if (_.get(result, 'result')) {

    // confirm giao dịch
    const confirmId = _.get(result, 'momoMsg.replyMsgs.0.id');
    const transId = _.get(result, 'momoMsg.replyMsgs.0.transId');
    console.log('Confirming transaction', transId, 'with ID', confirmId);
    const confirmResult = await confirmMoMoWithdraw(currentAccount, result.momoMsg.tranHisMsg, amount, confirmId);
    if (confirmResult.result) {
      return _.get(confirmResult, 'momoMsg.tranHisMsg')
    } else {
      return confirmResult.errorDesc;
    }
  } else {
    return {
      success: false,
      message: result.errorDesc
    }
  }


}

const browseTransaction = async (phone, offset = 0, limit = 20) => {
  const currentAccount = await MoMoModel.findOne({username: phone}).lean();

  const dataDevice = JSON.parse(currentAccount.device);
  const timeToRequest = Date.now();

  const body = {
    "appCode": APP_CODE,
    "appId": "vn.momo.transactionhistory",
    "appVer": APP_VER,
    "buildNumber": 0,
    "channel": "APP",
    "lang": "vi",
    "deviceName": dataDevice.deviceName,
    "deviceOS": "android",
    "requestId": `${timeToRequest}`,
    "client": "sync_app",
    "offset": offset,
    "limit": limit,
    "dbPart": 0
  }

  const resultMoMo = await doRequestEncryptMoMo(BROWSE_TRANSACTION, body, currentAccount, null, {agentid: currentAccount.agentId, secureid: dataDevice.secureId, devicecode: dataDevice.deviceCode, phone: currentAccount.username})


  if (resultMoMo.statusCode === 200) {

    return resultMoMo.momoMsg;
  }
  return [];
}

const detailTransaction = async (phone, transId, serviceId) => {
  const currentAccount = await MoMoModel.findOne({username: phone}).lean();

  const dataDevice = JSON.parse(currentAccount.device);
  const timeToRequest = Date.now();

  const body = {
    "appCode": APP_CODE,
    "appId": "vn.momo.transactionhistory",
    "appVer": APP_VER,
    "buildNumber": 0,
    "channel": "transaction_app",
    "lang": "vi",
    "deviceName": dataDevice.deviceName,
    "deviceOS": "android",
    "requestId": `${timeToRequest}`,
    "transId": transId,
    "serviceId": serviceId,
    "miniAppId": "vn.momo.transactionhistory",
  }


  const resultMoMo = await doRequestEncryptMoMo(DETAIL_TRANSACTION, body, currentAccount, null, {agentid: currentAccount.agentId, secureid: dataDevice.secureId, devicecode: dataDevice.deviceCode, phone: currentAccount.username})

  if (resultMoMo.statusCode === 200) {
    return resultMoMo.momoMsg;
  }
  return {};
}


module.exports = {
  requestOTP,
  confirmOTP,
  relogin,
  reloginRegisterSmart,
  withdrawMoneyToBank,
  refreshToken,
  getBalance,
  transferMoMoToMoMo,
  transferMoMoToBank,
  deleteSmartOTP,
  browseTransaction,
  detailTransaction
}




