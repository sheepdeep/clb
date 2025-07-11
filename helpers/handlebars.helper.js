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
    numberFormat: (number) => new Intl.NumberFormat('vi-VN', {style: 'currency',currency: 'VND'}).format(number || 0),
    calculatePercentage: (part, total) => {
        if (total && total > 0) {
            return ((part / total) * 100).toFixed(2); // Calculate percentage with 2 decimal places
        }
        return 0; // Return 0 if total is 0 or not available
    },
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
    splitNumber: (number) => number.toString().split(''),
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

                    // Adjust leftCount if we're too close to the first page
                    if (page - leftCount < 1) {
                        leftCount = page - 1;
                        rightCount = limit - leftCount - 1;
                    }

                    // Adjust rightCount if we're too close to the last page
                    if (page + rightCount > pageCount) {
                        rightCount = pageCount - page;  // Ensure we don't exceed pageCount
                        leftCount = limit - rightCount - 1;  // Adjust left count accordingly
                    }

                    var start = page - leftCount;

                    // Clamp start to 1 if it's less than 1
                    if (start < 1) start = 1;

                    // The last page in the range is the start + (limit - 1)
                    var end = start + limit - 1;

                    // Ensure the end doesn't exceed pageCount
                    if (end > pageCount) {
                        end = pageCount;
                        start = end - limit + 1;  // Adjust start to maintain the limit
                    }

                    // Generate pagination items based on the valid range
                    while (i < limit && start <= end) {
                        newContext = { ...pagination, n: start };
                        if (start === page) newContext.active = true;
                        ret = ret + options.fn(newContext);
                        start++;
                        i++;
                    }
                } else {
                    // For the case where no limit is set (pagination for all pages)
                    for (var i = 1; i <= pageCount; i++) {
                        newContext = { ...pagination, n: i };
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
                html = `<span class="badge badge-success"><span class="kt-badge-dot size-1.5"></span>Hoạt Động</span></span>`;
                break;
            case 'limit':
                html = `<span class="badge badge-info"><span class="kt-badge-dot size-1.5"></span>Giới Hạn</span></span>`;
                break;
            case 'pending':
                html = `<span class="badge badge-warning"><span class="kt-badge-dot size-1.5"></span>Tạm Dừng</span></span>`;
                break;
            default:
                html = `<span class="badge badge-danger"><span class="kt-badge-dot size-1.5"></span>Lỗi Số</span></span>`;
                break;
        }

        return html;
    },
    loginStatus: (status) => {
        let html;

        switch (status) {
            case 'refreshError':
                html = `<span class="badge badge-danger">Lỗi Refresh</span>`;
                break;
            case 'waitLogin':
                html = `<span class="badge badge-warning">Đợi Đăng Nhập</span>`;
                break;
            case 'errorLogin':
                html = `<span class="badge badge-danger">Lỗi Đăng Nhập</span>`;
                break;
            case 'active':
                html = `<span class="badge badge-success">Hoạt Động</span>`;
                break;
            case 'waitOTP':
                html = `<span class="badge badge-warning">Đợi OTP</span>`;
                break;
            case 'waitSend':
                html = `<span class="badge badge-warning">Đợi Gửi OTP</span>`;
                break;
            default:
                html = `<span class="badge badge-danger">Lỗi</span>`;
                break;
        }

        return html;
    },
    transfer: (status) => {
        let html;

        switch (status) {
            case true:
                html = `<span class="badge badge-success">Hoạt động</span>`;
                break;
            default:
                html = `<span class="badge badge-danger">Không hoạt động</span>`;
                break;
        }

        return html;
    },
    receiver: (status) => {
        let html;

        switch (status) {
            case true:
                html = `<span class="badge badge-success">Họat động</span>`;
                break;
            default:
                html = `<span class="badge badge-danger">Không hoạt động</span>`;
                break;
        }

        return html;
    },
    historyStatus: (status) => {
        let html;

        switch (status) {
            case 'wait':
                html = `<span class="badge badge-info">Đợi Xử Lý</span>`;
                break;
            case 'win':
                html = `<span class="badge badge-success">Thắng Cược</span>`;
                break;
            case 'ok':
                html = `<span class="badge badge-success">OK</span>`;
                break;
            case 'lose':
                html = `<span class="badge badge-danger">Thua Cược</span>`;
                break;
            case 'notUser':
                html = `<span class="badge badge-danger">Lỗi Thành Viên</span>`;
                break;
            case 'block':
                html = `<span class="badge badge-dark">Chặn Thành Viên</span>`;
                break;
            case 'handwork':
                html = `<span class="badge badge-warning">Thủ Công</span>`;
                break;
            case 'refund':
                html = `<span class="badge badge-warning">Hoàn Tiền</span>`;
                break;
            case 'wrong':
                html = `<span class="badge badge-danger">Sai Nội Dung</span>`;
                break;
            default:
                html = `<span class="badge badge-danger">Lỗi</span>`;
                break;
        }

        return html;
    },
    historyPaidAdmin: (status) => {
        let html;

        switch (status) {
            case 'wait':
                html = `<span class="badge badge-warning">Đợi Chuyển</span>`;
                break;
            case 'sent':
                html = `<span class="badge badge-info">Đã chuyển</span>`;
                break;
            case 'hold':
                html = `<span class="badge badge-danger">HOLD</span>`;
                break;
            case 'bankerror':
                html = `<span class="badge badge-danger">CHƯA CÀI BANK</span>`;
                break;
        }

        return html;
    },
    bankImage: (bankType) => {
        let src;

        switch (bankType) {
            case 'mbb':
                src = `/themes/images/banks/mbb.webp`;
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
            case 'vcb':
                src = `/themes/images/banks/vcb.webp`;
                break;
            default:
                src = `<span class="badge badge-danger">Lỗi</span>`;
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
    lowercase: (text) => {
        if (text) {
            return text.toLowerCase();
        }

        return;
    },
}
