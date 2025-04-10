"use strict";
const moment = require("moment");
const utils = require('./utils.helper');
const historyModel = require('../models/history.model');
const bankData = require('../json/bank.json');

module.exports = {
    ifCond: (v1, operator, v2, options) => {

        switch (operator) {
            case '==':
                return (v1 == v2) ? options.fn(this) : options.inverse(this);
            case '===':
                return (v1 === v2) ? options.fn(this) : options.inverse(this);
            case '!=':
                return (v1 != v2) ? options.fn(this) : options.inverse(this);
            case '!==':
                return (v1 !== v2) ? options.fn(this) : options.inverse(this);
            case '<':
                return (v1 < v2) ? options.fn(this) : options.inverse(this);
            case '<=':
                return (v1 <= v2) ? options.fn(this) : options.inverse(this);
            case '>':
                return (v1 > v2) ? options.fn(this) : options.inverse(this);
            case '>=':
                return (v1 >= v2) ? options.fn(this) : options.inverse(this);
            case '&&':
                return (v1 && v2) ? options.fn(this) : options.inverse(this);
            case '||':
                return (v1 || v2) ? options.fn(this) : options.inverse(this);
            default:
                return options.inverse(this);
        }
    },
    numberFormat: (number) => Intl.NumberFormat('en-US').format(number || 0),
    convertCurrency: (number) => (number > 999 && number < 1000000) ? (number / 1000) + 'K' : (number >= 1000000 ? (number / 1000000) + 'M' : Intl.NumberFormat().format(number)),
    sum: (num1, num2) => num1 + num2,
    minus: (num1, num2) => num1 - num2,
    formatDate: (time, format) => (format == 'all' || format == 'day' || format == 'month') ? moment(time).format(format == 'all' ? '--------' : (format == 'month' ? 'MM-YYYY' : 'DD-MM-YYYY')) : moment(time).format(format),
    timeNow: (time) => moment(time).locale("vi").fromNow(),
    select: (value, options) => options.fn(this).split('\n').map((v) => !RegExp(`value="${value}"`).test(v) ? v : v.replace(`value="${value}"`, `value="${value}"` + ' selected')).join('\n'),
    toJSON: (data) => JSON.stringify(data),
    prettyJSON: (data) => JSON.stringify(data, null, "\t"),
    joinArray: (data, text) => data.join(text),
    randArray: (data) => {
        let array = data.split(',');
        return array[Math.floor(Math.random() * array.length)];
    },
    tableSort: (query, column, sort) => {
        query = utils.checkQuery(query, ['column', '_sort']);

        let icons = {
            desc: 'fooicon fooicon-sort-desc',
            asc: 'fooicon fooicon-sort-asc',
            default: 'fooicon fooicon-sort'
        }

        let types = {
            default: 'desc',
            asc: 'desc',
            desc: 'asc'
        }

        let typeSort = column == sort.column ? sort.type : 'default';

        return `<a href="${query ? `?${query}&` : '?'}column=${column}&_sort=${types[typeSort]}"><span class="${icons[typeSort]}"></span></a>`;
    },
    paginate: (pagination, options) => {
        var type = options.hash.type || 'middle';
        var ret = '';
        var pageCount = Number(pagination.pageCount);
        var page = Number(pagination.page);
        var limit;
        if (options.hash.limit) limit = +options.hash.limit;

        var newContext = {};
        switch (type) {
            case 'middle':
                if (typeof limit === 'number') {
                    var i = 0;
                    var leftCount = Math.ceil(limit / 2) - 1;
                    var rightCount = limit - leftCount - 1;
                    if (page + rightCount > pageCount)
                        leftCount = limit - (pageCount - page) - 1;
                    if (page - leftCount < 1)
                        leftCount = page - 1;
                    var start = page - leftCount;

                    while (i < limit && i < pageCount) {
                        newContext = {...pagination, n: start};
                        if (start === page) newContext.active = true;
                        ret = ret + options.fn(newContext);
                        start++;
                        i++;
                    }
                } else {
                    for (var i = 1; i <= pageCount; i++) {
                        newContext = {...pagination, n: i};
                        if (i === page) newContext.active = true;
                        ret = ret + options.fn(newContext);
                    }
                }
                break;
            case 'previous':
                if (page === 1) {
                    newContext = {...pagination, disabled: true, n: 1}
                } else {
                    newContext = {...pagination, n: page - 1}
                }
                ret = ret + options.fn(newContext);
                break;
            case 'next':
                newContext = {};
                if (page === pageCount) {
                    newContext = {...pagination, disabled: true, n: pageCount}
                } else {
                    newContext = {...pagination, n: page + 1}
                }
                ret = ret + options.fn(newContext);
                break;
            case 'first':
                if (page === 1) {
                    newContext = {...pagination, disabled: true, n: 1}
                } else {
                    newContext = {...pagination, n: 1}
                }
                ret = ret + options.fn(newContext);
                break;
            case 'last':
                if (page === pageCount) {
                    newContext = {...pagination, disabled: true, n: pageCount}
                } else {
                    newContext = {...pagination, n: pageCount}
                }
                ret = ret + options.fn(newContext);
                break;
        }

        return ret;
    },
    levelUser: (level) => {
        if (level == undefined) {
            return 'clmmpro'
        }
        const data = [
            {
                name: 'Quản Trị Viên',
                level: 1
            },
            {
                name: 'Cộng Tác Viên',
                level: 2
            },
            {
                name: 'Demo',
                level: 0
            }
        ]

        return data.find(e => e.level == level).name || 'Lỗi';
    },
    bankName: (bankCode) => {
        if (bankCode) {
            return bankData.data.find(e => e.bin == bankCode).shortName;
        }
    },
    checkQuery: (search, data) => utils.checkQuery(search, data.split(',')),
    momoStatus: (status) => {
        let html;

        switch (status) {
            case 'active':
                html = `<span class="badges badge-success">Hoạt Động</span>`;
                break;
            case 'limit':
                html = `<span class="badges badge-info">Giới Hạn</span>`;
                break;
            case 'pending':
                html = `<span class="badges badge-warning">Tạm Dừng</span>`;
                break;
            default:
                html = `<span class="badges badge-danger">Lỗi Số</span>`;
                break;
        }

        return html;
    },
    loginStatus: (status) => {
        let html;

        switch (status) {
            case 'refreshError':
                html = `<span class="badges badge-danger">Lỗi Refresh</span>`;
                break;
            case 'waitLogin':
                html = `<span class="badges badge-warning">Đợi Đăng Nhập</span>`;
                break;
            case 'errorLogin':
                html = `<span class="badges badge-danger">Lỗi Đăng Nhập</span>`;
                break;
            case 'active':
                html = `<span class="badges badge-success">Hoạt Động</span>`;
                break;
            case 'waitOTP':
                html = `<span class="badges badge-warning">Đợi OTP</span>`;
                break;
            case 'waitSend':
                html = `<span class="badges badge-warning">Đợi Gửi OTP</span>`;
                break;
            default:
                html = `<span class="badges badge-danger">Lỗi</span>`;
                break;
        }

        return html;
    },
    transfer: (status) => {
        let html;

        switch (status) {
            case true:
                html = `<span class="badges badge-success">Hoạt động</span>`;
                break;
            default:
                html = `<span class="badges badge-danger">Không hoạt động</span>`;
                break;
        }

        return html;
    },
    receiver: (status) => {
        let html;

        switch (status) {
            case true:
                html = `<span class="badges badge-success">Họat động</span>`;
                break;
            default:
                html = `<span class="badges badge-danger">Không hoạt động</span>`;
                break;
        }

        return html;
    },
    historyStatus: (status) => {
        let html;

        switch (status) {
            case 'wait':
                html = `<span class="badges badge-info">Đợi Xử Lý</span>`;
                break;
            case 'win':
                html = `<span class="badges badge-success">Thắng Cược</span>`;
                break;
            case 'ok':
                html = `<span class="badges badge-success">OK</span>`;
                break;
            case 'lose':
                html = `<span class="badges badge-light">Thua Cược</span>`;
                break;
            case 'notUser':
                html = `<span class="badges badge-danger">Lỗi Thành Viên</span>`;
                break;
            case 'block':
                html = `<span class="badges badge-dark">Chặn Thành Viên</span>`;
                break;
            case 'handwork':
                html = `<span class="badges badge-warning">Thủ Công</span>`;
                break;
            case 'refund':
                html = `<span class="badges badge-warning">Hoàn Tiền</span>`;
                break;
            case 'wrong':
                html = `<span class="badges badge-danger">Sai Nội Dung</span>`;
                break;
            default:
                html = `<span class="badges badge-danger">Lỗi</span>`;
                break;
        }

        return html;
    },
    historyPaidAdmin: (status) => {
        let html;

        switch (status) {
            case 'wait':
                html = `<span class="badges badge-warning">Đợi Chuyển</span>`;
                break;
            case 'sent':
                html = `<span class="badges badge-info">Đã chuyển</span>`;
                break;
        }

        return html;
    },
    bankImage: (bankType) => {
        let src;

        switch (bankType) {
            case 'mbb':
                src = `/themes/images/banks/mbb.png`;
                break;
            case 'ncb':
                src = `/themes/images/banks/ncb.png`;
                break;
            case 'exim':
                src = `/themes/images/banks/exim.png`;
                break;
            case 'acb':
                src = `/themes/images/banks/acb.png`;
                break;
            default:
                src = `<span class="badges badge-danger">Lỗi</span>`;
                break;
        }

        return src;
    },
    formatBank: (bank) => {
        if (bank) {
            return bank.replace(/^(\d{4})\d{3}(\d{3})$/, '$1***$2');
        }

        return;
    },
    historyPaid: (status, paid) => {
        if (status === 'wait' || status === 'lose') {
            return '';  // Return an empty string for 'wait' or 'lose'
        }

        return `<div class="dashbox__table-text"><span class="gstatus ${paid}">${paid.toUpperCase()}</span></div>`;
    },
    uppercase: (text) => {
        if (text) {
            return text.toUpperCase();
        }

        return;
    },
}