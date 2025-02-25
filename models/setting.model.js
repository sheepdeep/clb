const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    nameSite: String,
    defaultTitle: String,
    description: String,
    keywords: String,
    favicon: String,
    logo: String,
    thumbnail: String,
    note: String,
    headerScript: String,
    footerScript: String,
    getHistory: {
        time: Number,
        timeLogin: Number,
        status: {
            type: String,
            default: 'close'
        }
    },
    commentSite: {
        rewardGD: {
            type: String,
            default: '{comment}: {transId}, {amount} x {bonus}'
        },
        rewardGift: {
            type: String,
            default: 'CODE: {code}, THƯỞNG: {amount}đ'
        },
        rewardWheel: {
            type: String,
            default: 'CODE: {code}, THƯỞNG: {amount}đ'
        },
        refundGD: {
            type: String,
            default: 'Hoàn tiền #{transId}, {status}'
        },
        refundBill: {
            type: String,
            default: 'Hoàn bill đầu ngày {time}, #{transId}'
        },
        rewardJackpot: {
            type: String,
            default: 'Nổ hũ #{transId}, {amount}đ'
        },
        rewardMuster: {
            type: String,
            default: '#{session} thắng điểm danh {amount}đ'
        },
        rewardMission: {
            type: String,
            default: 'Thưởng nhiệm vụ ngày {time}, [{amount} - {bonus}]'
        },
        rewardTOP: {
            type: String,
            default: 'Trả thưởng TOP {top}, thưởng: {bonus}đ. [{time}]'
        },
        rewardWithdraw: {
            type: String,
            default: 'Rut tien'
        }
    },
    contact: {
        type: Array,
        default: [
            {
                url: 'https://t.me/contact',
                html: '<button class="btn btn-info"><i class="fa fa-users" aria-hidden="true"></i> Group Telegram</button>'
            },
            {
                url: 'https://zalo.me/phone',
                html: '<button class="btn btn-primary"><i class="fa fa-users" aria-hidden="true"></i> Group Zalo</button>'
            }
        ]
    },
    limitBank: {
        type: Number,
        default: 5
    },
    paymentComment: {
        type: String,
        default: '#recharge'
    },
    withdrawComment: {
        type: String,
        default: '#recharge'
    },
    refund: {
        status: {
            type: String,
            default: 'active'
        },
        win: {
            type: Number,
            default: 100
        },
        won: {
            type: Number,
            default: 50
        },
        fail: {
            type: Number,
            default: 100
        },
        limit: {
            type: Number,
            default: 10
        }
    },
    missionData: {
        status: {
            type: String,
            default: 'active'
        },
        noti: {
            type: String,
            default: `- Thật tuyệt vời ! Mỗi ngày chỉ cần chơi trên <b class="text-success">CLMM.VN</b> chắc chắn bạn sẽ nhận được tiền. <br>- Khi chơi đủ số tiền (ko cần biết thắng thua) chắc chắn sẽ nhận được tiền. <br>- Hãy nhập số điện thoại của bạn vào mục bên trên để kiểm tra đã chơi bao nhiêu nhé.<br>- Khi chơi đủ mốc tiền, các bạn ấn vào nhận thưởng để nhận được các mốc như sau:`
        },
        data: Array
    },
    topData: {
        status: {
            type: String,
            default: 'active'
        },
        bonus: Array,
        fakeData: Array,
        typeTOP: {
            type: String,
            default: 'day'
        }
    },
    history: {
        dataType: {
            type: String,
            default: 'history'
        },
        limit: {
            type: Number,
            default: 10
        },
        rewardType: {
            type: String,
            default: 'limit'
        },
        rewardLimit: {
            type: Number,
            default: 30
        }
    },
    reward: {
        dataType: {
            type: String,
            default: 'limit'
        },
        limit: {
            type: Number,
            default: 30
        }
    },
    notification: {
        status: {
            type: String,
            default: 'close'
        },
        data: {
            type: String,
            default: "<h3 style=\"text-align: center;\"><span style=\"color: #ff0000;\"><strong>HỆ THỐNG GAME MOMO UY TÍN SỐ 1 VN</strong></span></h3>\r\n<p style=\"text-align: center;\">1. Chẵn lẻ Tài xỉu số cuối mã giao dịch ra 0, 9 sẽ tính\r\n                        Thua, Nếu muốn có 0 và 9 vui lòng chơi Chẵn lẻ 2.</p>\r\n                    <p style=\"text-align: center;\">2. Mỗi số trên web chỉ có thể giao dịch tối đa\r\n                        <strong>40 triệu</strong> hoặc <strong>120 lần</strong> một ngày. Vì vậy số trên hệ\r\n                        thống sẽ thay đổi liên tục nên trước khi chơi (Clmm) chẵn lẻ momo bạn hãy lên lấy số\r\n                        trước, Tránh trường hợp bị hoàn tiền.</p>\r\n                    <p style=\"text-align: center;\">3. Nếu chuyển sai hạn mức, số ngừng hoạt\r\n                        động, Sai nội dung hãy sử dụng chức năng <strong>KIỂM TRA MÃ GIAO DỊCH</strong> để\r\n                        được nhận lại tiền chơi .</p>\r\n                    <p style=\"text-align: center;\">  4. Nếu bạn <span style=\"color: #ff0000;\"><strong>CẦN HỖ TRỢ, BÁO LỖI </strong></span>hãy chat với Nhân\r\n                        viên của web tại <strong>Góc phải màn hình</strong> (Trực 24/7, Chỉ hỗ trợ các giao dịch trong\r\nngày)</p>\r\n<p style=\"text-align: center;\"><strong>Chẵn lẻ Momo . Clmm . Cltx . Chẵn lẻ Momo 5k</strong></p>"
        },
        event: {
            type: String,
            default: "<h3 style=\"text-align: center;\"><span style=\"color: #ff0000;\"><strong>HỆ THỐNG GAME MOMO UY TÍN SỐ 1 VN</strong></span></h3>\r\n<p style=\"text-align: center;\">1. Chẵn lẻ Tài xỉu số cuối mã giao dịch ra 0, 9 sẽ tính\r\n                        Thua, Nếu muốn có 0 và 9 vui lòng chơi Chẵn lẻ 2.</p>\r\n                    <p style=\"text-align: center;\">2. Mỗi số trên web chỉ có thể giao dịch tối đa\r\n                        <strong>40 triệu</strong> hoặc <strong>120 lần</strong> một ngày. Vì vậy số trên hệ\r\n                        thống sẽ thay đổi liên tục nên trước khi chơi (Clmm) chẵn lẻ momo bạn hãy lên lấy số\r\n                        trước, Tránh trường hợp bị hoàn tiền.</p>\r\n                    <p style=\"text-align: center;\">3. Nếu chuyển sai hạn mức, số ngừng hoạt\r\n                        động, Sai nội dung hãy sử dụng chức năng <strong>KIỂM TRA MÃ GIAO DỊCH</strong> để\r\n                        được nhận lại tiền chơi .</p>\r\n                    <p style=\"text-align: center;\">  4. Nếu bạn <span style=\"color: #ff0000;\"><strong>CẦN HỖ TRỢ, BÁO LỖI </strong></span>hãy chat với Nhân\r\n                        viên của web tại <strong>Góc phải màn hình</strong> (Trực 24/7, Chỉ hỗ trợ các giao dịch trong\r\nngày)</p>\r\n<p style=\"text-align: center;\"><strong>Chẵn lẻ Momo . Clmm . Cltx . Chẵn lẻ Momo 5k</strong></p>"
        }
    },
    jackpot: {
        status: {
            type: String,
            default: 'close'
        },
        numberTLS: {
            type: Array,
            default: [
                11111,
                22222,
                33333,
                44444,
                55555,
                66666,
                77777,
                88888,
                99999
            ]
        },
        amount: {
            type: Number,
            default: 10000
        },
        noti: {
            type: String,
            default: `<p>1.Để tham gia chức năng này,bạn cần nhập số điện thoại của bạn chơi vào mục bên trên,sau
            đó ấn nút<strong class="text-danger">Tham gia</strong>,(để hủy thì làm lại tương tự).</p><p>2.Khi tham gia,mỗi khi bạn chiến thắng sẽ bị trừ<strong class="text-danger"><span>10,000đ</span></strong>cho
            vào Quỹ Hũ.</p><p>3.Nếu bạn có đuôi số mã giao dịch là:</p><p><strong class="text-danger">11111</strong><strong class="text-danger">22222</strong><strong class="text-danger">33333</strong><strong class="text-danger">44444</strong><strong class="text-danger">55555</strong><strong class="text-danger">66666</strong><strong class="text-danger">77777</strong><strong class="text-danger">88888</strong><strong class="text-danger">99999</strong></p>thì bạn sẽ nhận được toàn bộ số tiền trong hũ.<p></p><p>4.Nếu bạn nổ hũ,vui lòng chờ hệ thống sẽ tự động thanh toán vào tài khoản của bạn.</p>`
        }
    },
    muster: {
        status: {
            type: String,
            default: 'active'
        },
        min: {
            type: Number,
            default: 5000
        },
        max: {
            type: Number,
            default: 100000
        },
        delay: {
            type: Number,
            default: 600
        },
        limit: {
            type: Number,
            default: 10
        },
        startTime: {
            type: Number,
            default: 7
        },
        endTime: {
            type: Number,
            default: 23
        },
        noti: {
            type: String,
            default: `- Mỗi phiên quà các bạn có 10 phút để điểm danh. <br>
        - Số điện thoại điểm danh phải chơi mini game trên hệ thống ít nhất 1 lần trong ngày. Không giới hạn số lần điểm
        danh trong ngày. <br>
        - Khi hết thời gian, người may mắn sẽ nhận được số tiền của phiên đó. <br>
        - Game <b>Điểm danh miễn phí</b> chỉ hoạt động từ <b>7h - 24h</b>`
        },
    },
    checkTransId: {
        status: {
            type: String,
            default: 'active'
        },
        limit: {
            type: Number,
            default: 10
        },
        limitHour: {
            type: Number,
            default: 24
        },
        noti: {
            type: String,
            default: `Nếu quá 5 phút chưa nhận được tiền vui lòng dán mã vào đây để kiểm tra.`
        }
    },
    jackpotCount: {
        type: Number,
        default: 0
    },
    refundBill: {
        status: {
            type: String,
            default: 'close'
        },
        min: {
            type: Number,
            default: 100000
        },
        max: {
            type: Number,
            default: 100000
        },
        percent: {
            type: Number,
            default: 20
        },
        typeAction: {
            type: String,
            default: 'all'
        }
    },
    giftCode: {
        status: {
            type: String,
            default: 'active'
        },
        noti: {
            type: String,
            default: '1. Một số điện thoại chỉ được nhập 1 mã/ngày. <br>2. Mã code khuyến mại sẽ tùy vào điều kiện để sử dụng, có thời hạn.<br>3. Mã code khuyến mại sẽ được cấp theo các chương trình khuyến mại của hệ thống Momo. <br>4. Vui lòng liên hệ chát CSKH để biết thêm chi tết khi bạn nhận được CODE. <br>'
        }
    },
    telegram: {
        token: {
            type: String,
            default: '5814823969:AAEmiRomkwly5sQ0lMMz9A2Fff43tnHYEbs'
        },
        chatId: String
    },
    themeSite: {
        template: {
            type: String,
            default: 'default'
        },
        mainColor: {
            type: String,
            default: 'default'
        },
        mainTitle: {
            type: String,
            default: 'Hệ thống chẵn lẻ MoMo|Uy tín, giao dịch tự động 24/7 - Bank 30s !'
        },
        notiRun: {
            type: String,
            default: 'Hiện nay có rất nhiều web lừa đảo. Các bạn chỉ nên chơi trên CLMM.VN để tránh mất tiền oan. Chúc các bạn thắng lớn trên CLMM.VN, nhớ giới thiệu bạn bè nhá.'
        },
        iconNotify: {
            type: String,
            default: `<img src="../themes/images/logo.png" alt="" srcset="" width="30">`
        }
    },
    siteStatus: {
        type: String,
        default: 'active'
    },
    wheel: {
        name: String,
        status: String,
        gift: Array,
        noti: String,
        amount: Number,
    },
    banTaiXiu: {
        turn: Number,
        chatId: String,
        turnTaiXiuRong: String,
        secondTaiXiuRong: Number
    },
    giftDay: {
        status: {
            type: String,
            default: 'close'
        },
        chatId: String,
        min: Number,
        max: Number,
        timeMin: Number,
        timeMax: Number,
        playCount: Number
    },
    withdraw: {
        status: {
            type: String,
            default: 'close'
        },
        withdrawMin: {
            type: Number,
            default: 10000
        }
    },
    fakeUser: {
        data: Object
    },
    xsst: {
        turn: Number,
        secondDefault: Number,
        status: {
            type: String,
            default: 'close'
        },
        betMin: Number,
        betMax: Number,
        ratio: Number,
        rewardType: String,
        rewardLimit: Number,
        rewardGD: String,
        commentXiu: String,
        commentTai: String,
        chatId: String,
    },
    xsmb: {
        date: String,
        status: {
            type: String,
            default: 'close'
        },
        results: Object,
        betMin: Number,
        betMax: Number,
        chatId: String,
        ratioLo: Number,
        ratioDe: Number,
        commentLo: String,
        commentDe: String,
        commentXien2: String,
        ratioXien2: Number
    }
}, {
    timestamps: true
})

module.exports = mongoose.model('Setting', settingSchema);