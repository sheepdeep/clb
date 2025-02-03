const socket = io();
const swal = (...props) => Swal.fire(...props);
const loadAjax = (action) => action == 'start' ? $('body').removeClass('loaded') : $('body').addClass('loaded');
const options = [
    {
        game_display: [
            {
                name: 'show',
                value: '<span class="badges badge-success">Hiển Thị</span>'
            },
            {
                name: 'hide',
                value: '<span class="badges badge-danger">Ẩn</span>'
            }
        ]
    },
    {
        reward_resultType: [
            {
                name: 'end',
                value: '<span class="badges badge-success">Số Cuối</span>',
            },
            {
                name: 'count_3',
                value: '<span class="badges badge-warning">Tổng 3 Số</span>',
            },
            {
                name: 'minus_3',
                value: '<span class="badges badge-warning">Hiệu 3 Số</span>',
            }
        ]
    },
    {
        block_status: [
            {
                name: 'active',
                value: '<span class="badges badge-success">Chặn</span>',
            },
            {
                name: 'pending',
                value: '<span class="badges badge-warning">Tạm Dừng</span>',
            }
        ]
    },
    {
        jackpot_isJoin: [
            {
                name: 1,
                value: '<span class="badges badge-success">Đã Tham Gia</span>',
            },
            {
                name: -1,
                value: '<span class="badges badge-danger">Đã Hủy</span>',
            }
        ]
    },
    {
        history_jackpot_status: [
            {
                name: 'wait',
                value: '<span class="badges badge-info">Đọi Xử Lý</span>',
            },
            {
                name: 'error',
                value: '<span class="badges badge-danger">Lỗi</span>',
            },
            {
                name: 'success',
                value: '<span class="badges badge-success">Đã Xử Lý</span>',
            }
        ]
    },
    {
        muster_status: [
            {
                name: 'active',
                value: '<span class="badges badge-warning">Đang Chạy</span>'
            },
            {
                name: 'done',
                value: '<span class="badges badge-success">Hoàn Thành</span>'
            }
        ]
    },
    {
        gift_status: [
            {
                name: 'active',
                value: '<span class="badges badge-success">Hoạt Động</span>'
            },
            {
                name: 'limit',
                value: '<span class="badges badge-warning">Hết Lượt</span>'
            },
            {
                name: 'expired',
                value: '<span class="badges badge-danger">Hết Hạn</span>'
            }
        ]
    },
    {
        momo_status: [
            {
                name: 'active',
                value: '<span class="badges badge-success">Hoạt Động</span>'
            },
            {
                name: 'limit',
                value: '<span class="badges badge-info">Giới Hạn</span>'
            },
            {
                name: 'pending',
                value: '<span class="badges badge-warning">Tạm Dừng</span>'
            },
            {
                name: 'error',
                value: '<span class="badges badge-danger">Lỗi Số</span>'
            }
        ]
    },
    {
        momo_loginStatus: [
            {
                name: 'refreshError',
                value: '<span class="badges badge-danger">Lỗi Refresh</span>'
            },
            {
                name: 'waitLogin',
                value: '<span class="badges badge-warning">Đợi Đăng Nhập</span>'
            },
            {
                name: 'errorLogin',
                value: '<span class="badges badge-danger">Lỗi Đăng Nhập</span>'
            },
            {
                name: 'active',
                value: '<span class="badges badge-success">Hoạt Động</span>'
            },
            {
                name: 'waitOTP',
                value: '<span class="badges badge-warning">Đợi OTP</span>'
            },
            {
                name: 'waitSend',
                value: '<span class="badges badge-warning">Đợi Gửi OTP</span>'
            },
            {
                name: 'error',
                value: '<span class="badges badge-danger">Lỗi</span>'
            }
        ]
    },
    {
        history_status: [
            {
                name: 'wait',
                value: '<span class="badges badge-info">Đợi Xử Lý</span>'
            },
            {
                name: 'transfer',
                value: '<span class="badges badge-secondary">Chuyển Tiền</span>'
            },
            {
                name: 'recharge',
                value: '<span class="badges badge-success">Nạp Tiền</span>'
            },
            {
                name: 'withdraw',
                value: '<span class="badges badge-success">Rút Tiền</span>'
            },
            {
                name: 'errorComment',
                value: '<span class="badges badge-warning">Sai Nội Dung</span>'
            },
            {
                name: 'limitRefund',
                value: '<span class="badges badge-warning">Giới Hạn Hoàn</span>'
            },
            {
                name: 'limitBet',
                value: '<span class="badges badge-warning">Sai Hạn Mức</span>'
            },
            {
                name: 'refund',
                value: '<span class="badges badge-danger">Đã Hoàn Tiền</span>'
            },
            {
                name: 'waitReward',
                value: '<span class="badges badge-warning">Đợi Trả Thưởng</span>'
            },
            {
                name: 'waitRefund',
                value: '<span class="badges badge-warning">Đợi Hoàn Tiền</span>'
            },
            {
                name: 'win',
                value: '<span class="badges badge-success">Thắng Cược</span>'
            },
            {
                name: 'won',
                value: '<span class="badges badge-light">Thua Cược</span>'
            },
            {
                name: 'errorMoney',
                value: '<span class="badges badge-warning">Không Đủ Tiền</span>'
            },
            {
                name: 'limitPhone',
                value: '<span class="badges badge-danger">Giới Hạn Số</span>'
            },
            {
                name: 'errorPhone',
                value: '<span class="badges badge-danger">Lỗi Số</span>'
            },
            {
                name: 'phoneBlock',
                value: '<span class="badges badge-secondary">Đã Chặn Số</span>'
            }
        ]
    },
    {
        members_level: [
            {
                name: "1",
                value: '<span class="badges badge-success">Quản Trị Viên</span>'
            },
            {
                name: "2",
                value: '<span class="badges badge-warning">Cộng Tác Viên</span>'
            }
        ]
    }
]

const resetOTP = (el, maxTime) => {
    let timer = setInterval(() => {
        if (maxTime > 1) {
            maxTime--;
            $(el).html(`${maxTime}s`).prop('disabled', true);
            return;
        }

        $(el).html('Lấy OTP').prop('disabled', false);
        clearInterval(timer);
    }, 1000);
}

$(document).ready(function () {
    localStorage.getItem('darkMode') == 1 && $('body').addClass('layout-dark');
    $('.sidebar_nav li>a').each(function () {
        let path = $(this).attr('data-href');

        if (window.location.pathname == path) {
            let child = $(this).parent().parent().parent();
            $(this).parent().addClass('active');
            child.hasClass('has-child') && child.addClass('open') && child.find('a').eq(0).addClass('active') && $(this).parent().parent().show();
        }
    })

    $('body').on('change', 'input[name="typeDate"]', function () {
        $('input[name="_revenueTime"]').attr('type', $(this).val() == 'month' ? 'month' : 'date');
    })

    $('body').on('dblclick', '.edit-one>td[data-bs-hasEdit="true"]>span[data-bs-table="html"]', function (e) {
        let value = $(this).attr('data-bs-value');
        let _thisEdit = $(this).parent().find(`span[data-bs-table="edit"]`);

        $(this).hide();
        _thisEdit.append(`<span data-bs-table="button"><span class="badges badge-danger hand" data-action="cancel"><i class="fas fa-times"></i></span> <span class="badges badge-success hand" data-action="save"><i class="fas fa-save"></i></span></span>`);
        _thisEdit.attr('data-bs-value', value).show();
        _thisEdit.find('[data-bs-edit="true"]').val(value);
    })

    $('body').on('click', '.edit-one span[data-bs-table="button"]>span', function (e) {
        let isError;
        let action = $(this).data('action');
        let td = $(this).parent().parent().parent();
        let _thisEdit = td.find(`span[data-bs-table="edit"]`);
        let name = td.attr('data-bs-name');
        let table = td.parent().parent().data('table');
        let value = _thisEdit.attr('data-bs-value');

        if (action == 'save') {
            let id = $(this).parent().parent().parent().parent().data('id');
            let path = window.location.pathname.split('/');

            value = _thisEdit.find(`[data-bs-edit="true"]`).val();

            if (value) {
                let key = _thisEdit.find(`[data-bs-edit="true"]`).attr('data-bs-key');

                switch (key) {
                    case 'array':
                        text = value.replace(/\s+/g, '').split('-').filter(item => item);
                        break;
                    default:
                        text = value;
                        break;
                }

                instance.put(`${path[path.length - 1]}/${id}`, { [name]: text })
                    .then(result => {
                        const response = result.data;

                        !response.success && swal('Thông Báo', response.message, 'error') && (isError = true);
                    })
                    .catch(err => {
                        isError = true;
                        swal('Thông Báo', err.message || err, 'error');
                    })
            }

            !value && swal('Thông Báo', 'Vui lòng nhập đầy đủ thông tin!', 'warning') && (isError = true);
        }

        if (!isError) {
            td.find(`span[data-bs-table="html"]`).attr('data-bs-value', value).show();

            let moreData = options.find(element => element[`${table}_${name}`]);
            moreData && moreData[`${table}_${name}`] && (value = moreData[`${table}_${name}`].find(obj => obj.name == value).value);
            td.find(`span[data-bs-table="html"]`).attr('data-bs-key') == 'format' && (value = Intl.NumberFormat('en-US').format(value));

            td.find(`span[data-bs-table="html"] [data-bs-html="true"]`).html(value);
            _thisEdit.hide();
            $(this).parent().remove();
        }
    })

    $('body').on('submit', '.form-axios', function (e) {
        e.preventDefault();

        let _this = $(this);
        let preContent = _this.find('button[type="submit"]').html();
        let options = {
            url: _this.attr('action'),
            method: _this.attr('method'),
            data: _this.serialize()
        }

        _this.find('button[type="submit"]').html(`<div class="dm-spin-dots spin-sm"><span class="spin-dot badge-dot dot-light"></span><span class="spin-dot badge-dot dot-light"></span><span class="spin-dot badge-dot dot-light"></span><span class="spin-dot badge-dot dot-light"></span></div>`).prop('disabled', true);

        axios(options)
            .then((result) => {
                let response = result.data;

                response.success ? swal({
                    title: 'Thông Báo',
                    text: response.message,
                    icon: 'success',
                    timer: 2500
                }) : swal('Thông Báo', response.message, 'error');

                response.success && !_this.attr('reload') && setTimeout(() => window.location.reload(), 1500);
            })
            .catch((err) => {
                swal('Thông Báo', err.message || err, 'error');
            })
            .finally(() => _this.find('button[type="submit"]').html(preContent).prop('disabled', false));
    })

    $('[data-bs-toggle="animate"]').each(function (e) {
        let _this = $(this);
        animate(_this, _this.data('value'), _this.data('speed'))
    })

    $('body').on('click', '.enable-dark-mode', function (e) {
        localStorage.setItem('darkMode', localStorage.getItem('darkMode') == 1 ? 0 : 1);
    })

    $('body').on('click', '.form-auth button', function (e) {
        let username = $('.form-auth [name="username"]').val();
        let password = $('.form-auth [name="password"]').val();

        if (!username || !password) {
            swal('Thông Báo', 'Vui lòng nhập đầy đủ thông tin!', 'info');
            return;
        }

        $.ajax({
            url: '#',
            method: 'POST',
            dataType: 'json',
            data: {
                username,
                password
            },
            beforeSend: () => loadAjax('start'),
            success: (res) => {
                loadAjax('stop');
                !res.success ? swal('Thông Báo', res.message, 'error') : swal('Thông Báo', res.message, 'success') && setTimeout(() => window.location.reload(), 1500);
            }
        })
    })

    $('body').on('click', '#actionTime', function (e) {
        let _this = $(this).find('span');
        let type = _this.data('type') == 'month' ? 'month' : 'date';

        $('input[name="_revenueTime"]').attr('type', type).val(_this.data('time'));
        $(`input[id="typeDate-${_this.data('type')}"]`).attr('checked', true);
        $('#modalTime').modal('show');
    })

    $('body').on('click', '[data-bs-submit]', function (e) {
        let _this = $(this);
        let id = _this.data('id');
        let submit = _this.attr('data-bs-submit');
        let action = _this.attr('data-bs-action');

        switch (action) {
            case 'add':
                $(`[data-bs-modal="${submit}-${action}"]`).modal('show');
                break;
            case 'remove':
                let preContent = _this.html();
                swal({
                    title: 'Bạn chắc chắn ?',
                    text: "Bạn muốn xóa #" + id,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#868e96',
                    confirmButtonText: 'Xóa',
                    cancelButtonText: 'Hủy'
                }).then((result) => {
                    if (result.isConfirmed) {
                        _this.html(`<div class="dm-spin-dots spin-sm"><span class="spin-dot badge-dot dot-primary"></span><span class="spin-dot badge-dot dot-primary"></span><span class="spin-dot badge-dot dot-primary"></span><span class="spin-dot badge-dot dot-primary"></span></div>`).prop('disabled', true);

                        instance.delete(`${submit}/` + id)
                            .then((result) => {
                                let response = result.data;

                                response.success ? Swal.fire('Thông báo', response.message, 'success') && setTimeout(() => window.location.reload(), 1000) : Swal.fire('Thông báo', response.message, 'error')
                            })
                            .catch((err) => {
                                swal('Thông Báo', err.message || err, 'error');
                            })
                            .finally(() => _this.html(preContent).prop('disabled', false));
                    }
                })
                break;
            default:
                swal('Thông Báo', 'Thao tác không hợp lệ!', 'error');
                break;
        }
    })

    $('body').on('change', '.page-selection[name="perPage"]', function (e) {
        let query = $(this).data('query');
        let value = $(this).val();

        return window.location.href = `${query ? `?${query}&` : '?'}perPage=${value}`;
    })

    $('body').on('click', '.get-otp', function (e) {
        let action = $(this).data('action');

        $(this).html(`<div class="dm-spin-dots spin-sm"><span class="spin-dot badge-dot dot-success"></span><span class="spin-dot badge-dot dot-success"></span><span class="spin-dot badge-dot dot-success"></span><span class="spin-dot badge-dot dot-success"></span></div>`).prop('disabled', true);

        instance.post('sendOTP', { action })
            .then((result) => {
                let response = result.data;

                response.success ? swal('Thông Báo', response.message, 'success') && resetOTP('.get-otp', 60) : swal('Thông Báo', response.message, 'error');
            })
            .catch(err => {
                console.log(err);
                swal('Thông Báo', err.message || err, 'error');
            })
            .finally(() => {
                $(this).html('Lấy OTP').prop('disabled', false);
            })

    })

    $('.form-editor').trumbowyg({ svgPath: "undefined" != typeof env && env.editorIconUrl ? env.editorIconUrl : "../themes/admin/images/icons.svg" })
});


function animate(element, value, speed = 100) {
    const data = Number($(element).text().replace(/,/g, ""));
    const time = value / speed;

    data < value ? ($(element).html(Intl.NumberFormat("en-US").format(Math.ceil(data + time))), setTimeout(() => animate(element, value), 1)) : $(element).html(Intl.NumberFormat("en-US").format(value))
}

function getDevice(userAgent) {
    let devices = ["Android", "webOS", "iPhone", "iPad", "iPod", "BlackBerry", "Windows Phone", "Windows NT 10", "Windows NT 6.2", "Windows NT 6.1", "Windows NT 6.0", "Mac OS X", "Linux", "ChromeOS"];
    let deviceName = "Unknown";

    for (var i = 0; i < devices.length; i++) {
        if (userAgent.indexOf(devices[i]) !== -1) {
            deviceName = devices[i];
            break;
        }
    }
    
    return deviceName;
}
