const crypto = require('crypto');
const _ = require('lodash');
const {v4: uuidV4} = require('uuid');

const BANK_LIST = [
    {
        "order": 0,
        "bankCode": "970436",
        "bankName": "NH TMCP Ngoai Thuong VN",
        "shortBankName": "VCB",
        "displayName": "Vietcombank",
        "whiteLists": [
            "0969432326",
            "0938538403",
            "0983231099",
            "01697548505"
        ],
        "available": true,
        "isPopular": true,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_vietcombank.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "VCB, Vietcombank, Ngoại Thương Việt Nam",
        "backgroundColor": "#027244",
        "isNewBank": false
    },
    {
        "order": 1,
        "bankCode": "970422",
        "bankName": "NH TMCP Quan Doi",
        "shortBankName": "MBB",
        "displayName": "MBBank",
        "whiteLists": [],
        "available": true,
        "isPopular": true,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_mbbank.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "MBBank, Quân đội",
        "backgroundColor": "#141ED2",
        "isNewBank": false
    },
    {
        "order": 2,
        "bankCode": "970415",
        "bankName": "NH TMCP Cong Thuong VN",
        "shortBankName": "VTB",
        "displayName": "Vietinbank",
        "whiteLists": [],
        "available": true,
        "isPopular": true,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_vietinbank.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "Vietinbank, VTB, Công thương Việt Nam",
        "backgroundColor": "#005691",
        "isNewBank": false
    },
    {
        "order": 3,
        "bankCode": "970407",
        "bankName": "NH TMCP Ky Thuong VN",
        "shortBankName": "TCB",
        "displayName": "Techcombank",
        "whiteLists": [],
        "available": true,
        "isPopular": true,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_techcombank.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "Techcombank, Kỹ thương Việt Nam",
        "backgroundColor": "#000",
        "isNewBank": false
    },
    {
        "order": 4,
        "bankCode": "970405",
        "bankName": "NH Nong Nghiep Va Phat Trien Nong Thon VN",
        "shortBankName": "AGR",
        "displayName": "Agribank",
        "whiteLists": [],
        "available": true,
        "isPopular": true,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_agribank.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "Agribank, Nông nghiệp, Nông nghiệp và phát triển nông thôn",
        "backgroundColor": "#AE1C3F",
        "isNewBank": false
    },
    {
        "order": 5,
        "bankCode": "970418",
        "bankName": "NH TMCP Dau Tu va Phat Trien VN",
        "shortBankName": "BIDV",
        "displayName": "BIDV",
        "whiteLists": [
            "0969432326",
            "0938538403"
        ],
        "available": true,
        "isPopular": true,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_bidv.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "BIDV, Đầu tư và phát triển, Đầu tư và phát triển Việt Nam",
        "backgroundColor": "#00524E",
        "isNewBank": false
    },
    {
        "order": 6,
        "bankCode": "970403",
        "bankName": "NH TMCP Sai Gon Thuong Tin",
        "shortBankName": "STB",
        "displayName": "Sacombank",
        "whiteLists": [],
        "available": true,
        "isPopular": true,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_sacombank.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "Sacombank, Sài Gòn Thương Tín",
        "backgroundColor": "#0A4595",
        "isNewBank": false
    },
    {
        "order": 7,
        "bankCode": "970416",
        "bankName": "NH TMCP A Chau",
        "shortBankName": "ACB",
        "displayName": "ACB",
        "whiteLists": [],
        "available": false,
        "isPopular": true,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_acb.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "ACB, Á Châu",
        "backgroundColor": "#0070FF",
        "isNewBank": false
    },
    {
        "order": 8,
        "bankCode": "970432",
        "bankName": "NH TMCP Viet Nam Thinh Vuong",
        "shortBankName": "VPB",
        "displayName": "VPBank",
        "whiteLists": [],
        "available": true,
        "isPopular": true,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_vpbank.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "VPBank, Việt Nam Thịnh Vượng, Thịnh Vượng, VPB",
        "backgroundColor": "#00B74F",
        "isNewBank": false
    },
    {
        "order": 9,
        "bankCode": "970423",
        "bankName": "NH TMCP Tien Phong",
        "shortBankName": "TPB",
        "displayName": "TPBank",
        "whiteLists": [],
        "available": true,
        "isPopular": true,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_tpbank.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "TPBank, Tiên Phong",
        "backgroundColor": "#5E2E86",
        "isNewBank": false
    },
    {
        "order": 10,
        "bankCode": "970441",
        "bankName": "NH TMCP Quoc Te VN",
        "shortBankName": "VIB",
        "displayName": "VIB",
        "whiteLists": [],
        "available": true,
        "isPopular": true,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_vib.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "Quốc tế, VIB, Quốc tế Việt Nam",
        "backgroundColor": "#00509d",
        "isNewBank": false
    },
    {
        "order": 11,
        "bankCode": "970443",
        "bankName": "NH TMCP Sai Gon Ha Noi",
        "shortBankName": "SHB",
        "displayName": "SHB",
        "whiteLists": [],
        "available": true,
        "isPopular": true,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_shb.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "SHB, Sài Gòn Hà Nội, Sài Gòn - Hà Nội",
        "backgroundColor": "#F58220",
        "isNewBank": false
    },
    {
        "order": 12,
        "bankCode": "970455",
        "bankName": "NH Cong Nghiep Han Quoc CN Ha Noi",
        "shortBankName": "IBK",
        "displayName": "Industrial Bank Of Korea",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_ibk_bank.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "IBK, Industrial Bank of Korea-IBK",
        "backgroundColor": "#0056A3",
        "isNewBank": false
    },
    {
        "order": 13,
        "bankCode": "970425",
        "bankName": "NH TMCP An Binh",
        "shortBankName": "ABB",
        "displayName": "ABBank",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_abbank.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "An Bình, ABBank, ABB",
        "backgroundColor": "#00AE9F",
        "isNewBank": false
    },
    {
        "order": 14,
        "bankCode": "970427",
        "bankName": "NH TMCP Viet A",
        "shortBankName": "VAB",
        "displayName": "VietA Bank",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_viet_a.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "Việt Á, Viet A Bank, VietABank",
        "backgroundColor": "#1B4486",
        "isNewBank": false
    },
    {
        "order": 15,
        "bankCode": "970424",
        "bankName": "NH TNHH MTV Shinhan VN",
        "shortBankName": "SHIB",
        "displayName": "Shinhan Bank",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_shinhan.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "Shinhan Bank, Shinhan, SVB",
        "backgroundColor": "#00397F",
        "isNewBank": false
    },
    {
        "order": 16,
        "bankCode": "970431",
        "bankName": "NH TMCP Xuat Nhap khau VN",
        "shortBankName": "EIB",
        "displayName": "Eximbank",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_eximbank.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "Eximbank, Xuất nhật khẩu, Xuất nhập khẩu Việt Nam",
        "backgroundColor": "#0098CE",
        "isNewBank": false
    },
    {
        "order": 17,
        "bankCode": "970438",
        "bankName": "NH TMCP Bao Viet",
        "shortBankName": "BVB",
        "displayName": "BaoViet Bank",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_bao_viet.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "Bảo Việt, BaoVietBank, BaoViet Bank",
        "backgroundColor": "#0079C1",
        "isNewBank": false
    },
    {
        "order": 18,
        "bankCode": "970429",
        "bankName": "NH TMCP Sai Gon",
        "shortBankName": "SCB",
        "displayName": "SCB",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_scb.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "SCB, TMCP Sài Gòn, Sài Gòn",
        "backgroundColor": "#1724A9",
        "isNewBank": false
    },
    {
        "order": 19,
        "bankCode": "970412",
        "bankName": "NH TMCP Dai Chung VN",
        "shortBankName": "PVB",
        "displayName": "PVCombank",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_pvcombank.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "Đại Chúng, PVCombank, PVCB, Đại Chúng Việt Nam",
        "backgroundColor": "#0672BA",
        "isNewBank": false
    },
    {
        "order": 20,
        "bankCode": "970414",
        "bankName": "NH TM TNHH MTV Dai Duong",
        "shortBankName": "OJB",
        "displayName": "Oceanbank",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_oceanbank.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "OceanBank, Đại dương, TMCP Đại Dương",
        "backgroundColor": "#004C97",
        "isNewBank": false
    },
    {
        "order": 166,
        "bankCode": "970428",
        "bankName": "NH TMCP Nam A",
        "shortBankName": "NAB",
        "displayName": "Nam A Bank",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_nam_a_1.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "Nam Á, NamABank",
        "backgroundColor": "#0064A7",
        "isNewBank": false
    },
    {
        "order": 167,
        "bankCode": "970437",
        "bankName": "NH TMCP Phat Trien TP HCM",
        "shortBankName": "HDB",
        "displayName": "HDBank",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_hdbank.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "HD Bank, HDBank, Phát triển Thành phố Hồ Chí Minh",
        "backgroundColor": "#8D1913",
        "isNewBank": false
    },
    {
        "order": 168,
        "bankCode": "970439",
        "bankName": "NH TNHH MTV Public VN",
        "shortBankName": "PB",
        "displayName": "Public Bank",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_publicbank.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "Public Bank, PBVN",
        "backgroundColor": "#AC0100",
        "isNewBank": false
    },
    {
        "order": 169,
        "bankCode": "970442",
        "bankName": "NH TNHH MTV Hongleong VN",
        "shortBankName": "HLB",
        "displayName": "Hong Leong Bank",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_hong_leon_bank.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "Hongleongbank, Hong Leong Bank",
        "backgroundColor": "#002D62",
        "isNewBank": false
    },
    {
        "order": 170,
        "bankCode": "970430",
        "bankName": "NH TMCP Thinh vuong va Phat trien",
        "shortBankName": "PGB",
        "displayName": "PGBank",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_pgbank.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "PG Bank, Xăng Dầu Petrolimex, Petrolimex",
        "backgroundColor": "#034EA0",
        "isNewBank": false
    },
    {
        "order": 171,
        "bankCode": "970446",
        "bankName": "NH Hop Tac",
        "shortBankName": "COB",
        "displayName": "Co-opBank",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_coop_bank.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "Co op Bank, Co-opBank, Hợp tác, hợp tác xã",
        "backgroundColor": "#00377A",
        "isNewBank": false
    },
    {
        "order": 172,
        "bankCode": "970419",
        "bankName": "NH TMCP Quoc Dan",
        "shortBankName": "NCB",
        "displayName": "NCB",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_ncb.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "NCB, Quốc Dân",
        "backgroundColor": "#004E96",
        "isNewBank": false
    },
    {
        "order": 173,
        "bankCode": "970434",
        "bankName": "NH TNHH Indovina",
        "shortBankName": "IDB",
        "displayName": "Indovina Bank",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_indovina.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "Indovina Bank, Trách nhiệm hữu hạn Indovina, IVB",
        "backgroundColor": "#006FBA",
        "isNewBank": false
    },
    {
        "order": 174,
        "bankCode": "970408",
        "bankName": "NH TM TNHH MTV Dau Khi Toan Cau",
        "shortBankName": "GPB",
        "displayName": "GPBank",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_gpbank.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "GPBank, GP Bank",
        "backgroundColor": "#004A8F",
        "isNewBank": false
    },
    {
        "order": 175,
        "bankCode": "970400",
        "bankName": "NH TMCP Sai Gon Cong Thuong",
        "shortBankName": "SGB",
        "displayName": "Saigonbank",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_saigonbank.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "Sài Gòn, Saigonbank, Sai Gon Bank",
        "backgroundColor": "#2164A4",
        "isNewBank": false
    },
    {
        "order": 176,
        "bankCode": "970426",
        "bankName": "NH TMCP Hang Hai VN",
        "shortBankName": "MSB",
        "displayName": "MSB",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_msb.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "Maritime Bank, Hàng Hải, Hàng Hải Việt Nam",
        "backgroundColor": "#FF671F",
        "isNewBank": false
    },
    {
        "order": 177,
        "bankCode": "970449",
        "bankName": "NH TMCP Buu Dien Lien Viet",
        "shortBankName": "LVPB",
        "displayName": "LPBank",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_lienvietpostbank.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "Liên Việt, LienVietPostBank, Lien Viet Post Bank, LPB, LVB, LPBank",
        "backgroundColor": "#EE7625",
        "isNewBank": false
    },
    {
        "order": 178,
        "bankCode": "970452",
        "bankName": "NH TMCP Kien Long",
        "shortBankName": "KLB",
        "displayName": "Kien Long Bank",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_kienlong.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "Kienlongbank, Kiên Long, Kien Long Bank",
        "backgroundColor": "#EF4D23",
        "isNewBank": false
    },
    {
        "order": 179,
        "bankCode": "970457",
        "bankName": "NH Wooribank",
        "shortBankName": "WRB",
        "displayName": "Woori Bank",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_woori.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "Woori Bank, Wooribank, wori, worri",
        "backgroundColor": "#0471D1",
        "isNewBank": false
    },
    {
        "order": 180,
        "bankCode": "970440",
        "bankName": "NH TMCP Dong Nam A",
        "shortBankName": "SAB",
        "displayName": "SeABank",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_seabank.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "Seabank, Đông Nam Á",
        "backgroundColor": "#8D0C11",
        "isNewBank": false
    },
    {
        "order": 181,
        "bankCode": "970458",
        "bankName": "NH TNHH MTV United Overseas Bank",
        "shortBankName": "UOB",
        "displayName": "UOB",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_uob.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "NH TNHH MTV United Overseas Bank (UOB)",
        "backgroundColor": "#001F67",
        "isNewBank": false
    },
    {
        "order": 182,
        "bankCode": "970410",
        "bankName": "Standard Chartered",
        "shortBankName": "SC",
        "displayName": "Standard Chartered",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_standard_chartered.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "Standard Chartered, SC",
        "backgroundColor": "#008738",
        "isNewBank": false
    },
    {
        "order": 183,
        "bankCode": "970448",
        "bankName": "NH TMCP Phuong Dong",
        "shortBankName": "OCB",
        "displayName": "OCB",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_ocb.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "OCB, Phương Đông",
        "backgroundColor": "#008c44",
        "isNewBank": false
    },
    {
        "order": 184,
        "bankCode": "422589",
        "bankName": "NH TNHH MTV CIMB Viet Nam",
        "shortBankName": "CIMB",
        "displayName": "CIMB",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_cimb.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "CIMB",
        "backgroundColor": "#790008",
        "isNewBank": false
    },
    {
        "order": 185,
        "bankCode": "970454",
        "bankName": "NH TMCP Ban Viet",
        "shortBankName": "VCCB",
        "displayName": "BVBank",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_ban_viet_2.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "Bản Việt, Viet Capital Bank, BVBank",
        "backgroundColor": "#123985",
        "isNewBank": false
    },
    {
        "order": 186,
        "bankCode": "970406",
        "bankName": "NH TMCP Dong A",
        "shortBankName": "DAB",
        "displayName": "DongABank",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_dong_a.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "Đông Á, Dong A Bank, DAB, DongA Bank",
        "backgroundColor": "#0066CC",
        "isNewBank": false
    },
    {
        "order": 187,
        "bankCode": "970421",
        "bankName": "NH Lien Doanh Viet Nga",
        "shortBankName": "VRB",
        "displayName": "VRB",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_viet_nga.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "VRB, Việt Nga, Liên doanh Việt - Nga, viet nam russia",
        "backgroundColor": "#194CAD",
        "isNewBank": false
    },
    {
        "order": 188,
        "bankCode": "970409",
        "bankName": "NH TMCP Bac A",
        "shortBankName": "BAB",
        "displayName": "Bac A Bank",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_bac_a.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "Bắc Á, Bac A Bank",
        "backgroundColor": "#1E1E1E",
        "isNewBank": false
    },
    {
        "order": 189,
        "bankCode": "970433",
        "bankName": "NH TMCP Viet Nam Thuong Tin",
        "shortBankName": "VB",
        "displayName": "VIETBANK",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_viet_bank.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "Vietbank, Việt Bank, Việt Nam Thương Tín",
        "backgroundColor": "#005489",
        "isNewBank": false
    },
    {
        "order": 325,
        "bankCode": "546034",
        "bankName": "NH So CAKE by VPBank",
        "shortBankName": "CAKE",
        "displayName": "CAKE",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_cake.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "CAKE",
        "backgroundColor": "#2A217A",
        "isNewBank": false
    },
    {
        "order": 326,
        "bankCode": "546035",
        "bankName": "NH So UBank by VPBank",
        "shortBankName": "UBank",
        "displayName": "UBank",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_ubank.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "Ubank",
        "backgroundColor": "#211F5F",
        "isNewBank": false
    },
    {
        "order": 327,
        "bankCode": "801011",
        "bankName": "NH Nonghyup - Chi nhanh Ha Noi",
        "shortBankName": "Nonghyup Bank - HN",
        "displayName": "Nonghyup Bank - HN",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_nonghyu.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "NonghyupBank - HN",
        "backgroundColor": "#3473D6",
        "isNewBank": false
    },
    {
        "order": 328,
        "bankCode": "970462",
        "bankName": "NH Kookmin - Chi nhanh Ha Noi",
        "shortBankName": "KBHN",
        "displayName": "KB HN",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_kookmin_hn.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "KBHN",
        "backgroundColor": "#504235",
        "isNewBank": false
    },
    {
        "order": 329,
        "bankCode": "970463",
        "bankName": "NH Kookmin - Chi nhanh TP. HCM",
        "shortBankName": "KBHCM",
        "displayName": "KB HCM",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_kookmin_hcm.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "KBHCM",
        "backgroundColor": "#504235",
        "isNewBank": false
    },
    {
        "order": 330,
        "bankCode": "796500",
        "bankName": "NH DBS - Chi nhanh TP. HCM",
        "shortBankName": "DBS - HCM",
        "displayName": "DBS - HCM",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_dbs.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "DBS-HCM",
        "backgroundColor": "#000",
        "isNewBank": false
    },
    {
        "order": 331,
        "bankCode": "970444",
        "bankName": "NH TM TNHH MTV Xay Dung Viet Nam",
        "shortBankName": "CBBank",
        "displayName": "CBBank",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_cbbank.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "CBBANK",
        "backgroundColor": "#034DA2",
        "isNewBank": false
    },
    {
        "order": 332,
        "bankCode": "668888",
        "bankName": "NH Dai chung TNHH Kasikornbank - Chi nhanh TP. HCM",
        "shortBankName": "KBank",
        "displayName": "KBank",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_kbank.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "KBank",
        "backgroundColor": "#504235",
        "isNewBank": false
    },
    {
        "order": 333,
        "bankCode": "458761",
        "bankName": "NH TNHH MTV HSBC Viet Nam",
        "shortBankName": "HSBC",
        "displayName": "HSBC",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_hsbc.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "HSBC",
        "backgroundColor": "#000",
        "isNewBank": false
    },
    {
        "order": 565,
        "bankCode": "963388",
        "bankName": "NH So Timo by BVBank",
        "shortBankName": "TIMO",
        "displayName": "Timo",
        "whiteLists": [],
        "available": true,
        "isPopular": false,
        "logo": "https://static.momocdn.net/app/img/momo_app_v2/new_version/All_team/bank/ic_timobank.png",
        "bankFee": "3.300đ + 0.65%",
        "bankNameSearch": "Timo",
        "backgroundColor": "#563D82",
        "isNewBank": false
    }
];

// hàm decrypt
const aes256cbcDecrypt = (data, key) => {
    let iv = Buffer.alloc(16);
    let cipher = crypto.createDecipheriv("aes-256-cbc", key.substring(0, 32), iv);
    return cipher.update(data, "base64") + cipher.final("utf8");
}

// hàm encrypt
const aes256cbcEncrypt = (data, key) => {
    let iv = Buffer.alloc(16);
    let cipher = crypto.createCipheriv("aes-256-cbc", key.substr(0, 32), iv);
    return Buffer.concat([cipher.update(data, "utf8"), cipher.final()]).toString("base64");
}


// hàm encrypt RSA
const rsaEncryptWithPublicKey = (data, publicKey) => crypto.publicEncrypt({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_PADDING,
}, Buffer.from(data)).toString("base64");


// Hàm tạo uuid v4
const generateUUIDv4 = () => {
    return uuidV4();
};

// random fmc token
const getDummyFcmToken = () => `${generateRandomString(22)}:${generateRandomString(9)}-${generateRandomString(20)}-${generateRandomString(12)}-${generateRandomString(7)}-${generateRandomString(7)}-${generateRandomString(53)}-${generateRandomString(9)}_${generateRandomString(11)}-${generateRandomString(4)}`;


// Hàm tạo kí tự ngẫu nhiên theo độ dài
const generateRandomString = (length, characters = 'ABCDEFabcdef0123456789') => {
    let result = '';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}

const calculateCheckSum = (phone, type, times, setupKey) => aes256cbcEncrypt(`${phone}${times}000000${type}${times / 1000000000000.0}E12`, setupKey)

const generateRandomBuildId = () => {

    // Function to generate a random date within a specific range
    function generateRandomDate(startDate, endDate) {
        return new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
    }

    // Generate a random alphanumeric string for the first 5 characters
    const alphanumericPrefix = generateRandomString(5).toUpperCase();

    // Generate a random number for the build (between 1 and 20)
    const buildNumber = _.random(1, 20).toString().padStart(3, '0');

    // Generate a random date within a range (adjust the range as needed)
    const startDate = new Date('2010-01-01'); // Start date
    const endDate = new Date(); // End date (current date)
    const randomDate = generateRandomDate(startDate, endDate);

    // Format the date as YYYYMMDD
    const formattedDate = randomDate.toISOString().slice(0, 10).replace(/-/g, "");

    // Concatenate parts to form the build ID
    const buildId = `Build/${alphanumericPrefix}.${formattedDate}.${buildNumber}`;

    return buildId;
}

const getRKeyFromPhoneAndRandomKey = (phone, randomKey) => {
    return crypto.createHash('sha256').update(`${phone}${randomKey}`).digest('hex');
}
const getImeiFromSecureAndModel = (secureId, modelId) => {
    return crypto.createHash('sha256').update(`${secureId}${modelId}`).digest('hex');
}

const calculateOHash = (phone, rKey, otp) => {
    return crypto.createHash("sha256").update(`${phone}${rKey}${otp}`).digest("hex");
}
const calculatePHash = (imei, password, setupKey) => {
    return aes256cbcEncrypt(`${imei}|${password}`, setupKey);
}

const generateSecureId = () => generateRandomString(16).toLowerCase();
const generateModelId = () => generateRandomString(64).toLowerCase();

const generateSecretKey = () => crypto.randomBytes(32).toString("hex").substring(32);


module.exports = {
    calculateCheckSum,
    aes256cbcDecrypt,
    aes256cbcEncrypt,
    rsaEncryptWithPublicKey,
    generateRandomString,
    generateUUIDv4,
    getImeiFromSecureAndModel,
    generateSecureId,
    generateModelId,
    generateRandomBuildId,
    getDummyFcmToken,
    calculateOHash,
    calculatePHash,
    generateSecretKey,
    getRKeyFromPhoneAndRandomKey,
    BANK_LIST
}
