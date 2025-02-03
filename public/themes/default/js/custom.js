$(document).ready(function (e) {
    typingEffect("#mainTitle", [$('#mainTitle').data('text')]);
    loadJackpot();

    $('#checkByTrans button, #checkByPhone button').on('click', function (e) {
        let id = $(this).parent().parent().parent().attr('id');
        let phone = $(`#${id} [name="phone"]`).val();
        let transId = $(`#${id} [name="transId"]`).val();

        $(`#${id} button`).prop('disabled', true);
        $(`#${id} button`).html('<i class="fas fa-spinner text-white fa-spin" aria-hidden="true"></i>')
        axios.post('../api/v2/checkTransId', { phone, transId })
            .then(res => {
                $(`#${id} button`).prop('disabled', false);
                $(`#${id} button`).html('<i class="fa fa-search"></i>');
                (!res.data.success && res.data.data && !phone) ? $('#checkByTrans').addClass('d-none') && $('#checkByPhone').removeClass('d-none') && $('#checkByPhone [name="transId"]').val(transId) : $('#checkByPhone').addClass('d-none') && $('#checkByTrans').removeClass('d-none') && loadTransId(null, res.data);
            }).catch(err => {
                loadTransId(err, null);
            })
    })

    $('body').on('click', '#jackpot button', function (e) {
        let action = $('#jackpot button').attr('data-action');
        let phone = $('#jackpot input[name="phone"]').val();

        if (!action) return Swal.fire('Thông Báo', 'Thiếu dữ liệu hoặc lỗi!', 'warning');

        jackpotAction();
        axios.post(`../api/v2/jackpot/${action}`, { phone })
            .then(res => {
                jackpotAction(null, null, res.data);
            }).catch(err => {
                jackpotAction(null, err);
            })
    })

    $('body').on('click', '.transId-refund', function (e) {
        let transId = $('#detailTransId').text();

        if (!transId) return Swal.fire('Thông Báo', 'Có lỗi xảy ra, hãy thử lại!', 'warning');
        transId = transId.replace(/\D/g, '');

        refundTransId();
        axios.post('../api/v2/refundTransId', { transId })
            .then(res => {
                refundTransId(null, null, res.data);
            }).catch(err => {
                refundTransId(null, err, null);
            })
    })

})

function numberCopy(data) {
    let _this = $(data.trigger);

    Swal.fire({
        title: 'Thông báo',
        html: `Đã sao chép số điện thoại!<br><b>(${data.text} - ${_this.data('name')})</b><br>Vui lòng cược tối thiểu <b>${Intl.NumberFormat('en-US').format(_this.data('min'))}đ</b> và tối đa <b>${Intl.NumberFormat('en-US').format(_this.data('max'))}đ</b><br>Chúc bạn may mắn <i class="fa fa-heart text-red"></i>`,
        icon: 'success',
        timer: 10000,
    }).then(() => Swal.fire('HÃY CHÚ Ý', 'SỐ TRẢ THƯỞNG CHỈ DÙNG ĐỂ TRẢ THƯỞNG,\n KHÔNG ĐÁNH VÀO SỐ TRẢ THƯỞNG NHA!', 'warning'));
}

function loadGame(err, response) {
    err && Swal.fire('Thông Báo', `Có lỗi xảy ra ${err.message}`, 'warning');
    !response.success && Swal.fire('Thông Báo', response.message, 'error');

    if (response.success) {
        $('#list-game').html('');

        response.data.map((data, index) => {
            $('#list-game').append(`<div style="padding: 5px"><button class="btn btn-${index == 0 ? 'primary' : 'default'} games" data-name="${data.name}" data-description="${data.description}" data-type="${data.gameType}"><b>${data.name}</b></button></div>`);
        });
    }
}

function loadReward(err, response) {
    let dataGame = $('.games.btn-primary');

    err && Swal.fire('Thông Báo', `Có lỗi xảy ra ${err.message}`, 'warning');
    !response.success && Swal.fire('Thông Báo', response.message, 'error');

    if (response.success) {
        $('#gameName').html(`Cách Chơi ${dataGame.data('name')}`);
        $('#gameNoti').html(dataGame.data('description'));
        $('#tableReward').html('');

        response.data.map((data) => {
            $('#tableReward').append(`<tr><td><b>${data.content}</b></td><td><span class="badge badge-info">${data.numberTLS.join('</span> - <span class="badge badge-info">')}</span></td><td><strong><span style="color: red;">x</span> ${data.amount}</strong></td></tr>`);
        });
    }

}

function loadPhone(err, response) {
    err && Swal.fire('Thông Báo', `Có lỗi xảy ra ${err.message}`, 'warning');
    !response.success && Swal.fire('Thông Báo', response.message, 'error');

    if (response.success) {
        $('#tablePhone, #tableStatus').html('');

        console.log(response);

        response.data.map((data) => {
            data.status == 'active' && (data.amountDay + 2 * data.betMax >= data.limitDay || data.amountMonth + 2 * data.betMax >= data.limitMonth || data.count + 10 >= data.number) && (data.status = "pendingStop");
            $('#tablePhone').append(`<tr><>${data.brandName} <span class="badge badge-info copy-text" data-clipboard-text="${data.brandName}" data-name="${data.brandName}" data-min="${data.betMin}" data-max="${data.betMax}"><i class="fa fa-clipboard"></i></span> <br><img src="data:image/jpeg;base64,${data.baseQr}" /> <br><small><b><span class="text-success">${Intl.NumberFormat('en-US').format(data.amountDay)}</span>/<span class="text-primary">${convertCurrency(data.limitDay)}</span> ~ <span class="text-info">${data.count}</span>/<span class="text-primary">${data.number}</span></b></small></td><td>${Intl.NumberFormat('en-US').format(data.betMin)} VNĐ</td><td>${Intl.NumberFormat('en-US').format(data.betMax)} VNĐ</td><td>${data.status == 'active' ? '<span class="badge badge-success">Hoạt động</span>' : (data.status == 'pendingStop' ? '<span class="badge badge-warning">Sắp bảo trì</span>' : `<span class="badge badge-danger">Bảo trì</span>`)}</td></tr>`);
            $('#tableStatus').append(`<!--<tr><td>${data.phone} <span class="badge badge-info copy-text" data-clipboard-text="${data.brandName}" data-name="${data.brandName}" data-min="${data.betMin}" data-max="${data.betMax}"><i class="fa fa-clipboard"></i></span></td><td>${data.name}</td><td><span class="text-success">${Intl.NumberFormat('en-US').format(data.amountDay)}</span>/${convertCurrency(data.limitDay)}</td><td><span class="text-success">${data.count}</span>/${data.number}</td></tr>-->`);
        });
    }

}

function loadHistory(err, response) {
    err && Swal.fire('Thông Báo', `Có lỗi xảy ra ${err.message}`, 'warning');
    !response.success && Swal.fire('Thông Báo', response.message, 'error');

    if (response.success) {
        $('#tableHistory').html('');

        response.data.map((data) => {
            $('#tableHistory').append(`<tr><td>${data.time}</td><td>${data.phone}</td><td>${Intl.NumberFormat('en-US').format(data.amount)}</td><td>${Intl.NumberFormat('en-US').format(data.bonus)}</td><td>${data.gameName}</td><td><span class="badge badge-primary text-uppercase">${data.content}</span></td><td><span class="badge badge-success">Thắng</span></td></tr>`);
        })
    }
}

function loadMission(action, err, response) {
    if (action == 'start') {
        $('#checkMission button').prop('disabled', true).html('<i class="fas fa-spinner text-white fa-spin" aria-hidden="true"></i>');
        return;
    }
    err && Swal.fire('Thông Báo', `Có lỗi xảy ra ${err.message}`, 'warning');

    $('#checkMission button').prop('disabled', false).html('<i class="fa fa-search"></i>');
    $('.result-mission').remove();
    !response.success && Swal.fire('Thông Báo', response.message, 'error');
    response.success && $('#checkMission').prepend(`<div class="result-mission text-center"><div class="money-day badge badge-primary mb-3">${Intl.NumberFormat('en-US').format(response.data.count)} VNĐ</div></div>`)
}

function loadMuster(err, response) {
    err && Swal.fire('Thông Báo', `Có lỗi xảy ra ${err.message}`, 'warning');
    !response.success && Swal.fire('Thông Báo', response.message, 'error');

    if (response.success && response.data) {

        $('#muster-session').html(`#${response.data.code}`);
        $('.muster-count').html(Intl.NumberFormat('en-US').format(response.data.count));
        $('#muster-winner').html(response.data.win);
        $('#muster-bonus').html(`${Intl.NumberFormat('en-US').format(response.data.bonus)}`);
        $('.muster-time').html(response.data.second);
    }

}

function loadHistoryMuster(err, response) {
    err && Swal.fire('Thông Báo', `Có lỗi xảy ra ${err.message}`, 'warning');
    !response.success && Swal.fire('Thông Báo', response.message, 'error');

    if (response.success) {
        $('#tableMuster').html('');

        response.data.map((data) => {
            $('#tableMuster').append(`<tr><td><span class="text-info">#${data.code}</span></td><td>${data.count}</td><td>${data.phone}</td><td>${Intl.NumberFormat('en-US').format(data.amount)}đ</td></tr>`);
        })
    }
}

function loadJackpot() {
    axios.get('../api/v2/jackpot/history')
        .then(res => {
            let response = res.data;
            !response.success && Swal.fire('Thông Báo', response.message, 'error');

            if (response.success) {
                $('#tableJackpot').html('');

                response.data.map((data) => {
                    $('#tableJackpot').append(`<tr><td>${data.time}</td><td>${data.phone}</td><td><span class="text-success">+ ${Intl.NumberFormat().format(data.amount)} đ</span></td></tr>`);
                })
            }
        }).catch(err => {
            Swal.fire('Thông Báo', `Có lỗi xảy ra ${err.message}`, 'warning');
        })
}

function addMuster(action = 'start', err, response) {
    if (action == 'start') {
        $('#addMuster button').prop('disabled', true).html('<i class="fas fa-spinner text-white fa-spin" aria-hidden="true"></i>');
        return;
    }

    err && Swal.fire('Thông Báo', `Có lỗi xảy ra ${err.message}`, 'warning');

    $('#addMuster button').prop('disabled', false).html('<i class="fas fa-user-crown"></i>'), !err && Swal.fire('Thông Báo', response.message, response.success ? 'success' : 'error');
}

function checkGift(action = 'start', err, response) {
    if (action == 'start') {
        $('#checkGift button').prop('disabled', true).html('Đang xử lý <i class="fas fa-spinner text-white fa-spin" aria-hidden="true"></i>');
        return;
    }

    err && Swal.fire('Thông Báo', `Có lỗi xảy ra ${err.message}`, 'warning');

    $('#checkGift button').prop('disabled', false).html('Kiểm tra'), !err && Swal.fire('Thông Báo', response.message, response.success ? 'success' : 'error');
}

function loadTransId(err, response) {
    err && Swal.fire('Thông Báo', `Có lỗi xảy ra ${err.message}`, 'warning');
    !response.success && Swal.fire('Thông Báo', response.message, 'error');

    if (response.success) {
        let status, refund;
        let data = response.data;

        switch (data.status) {
            case 'wait':
                status = `<span class="badge badge-primary">Đang xử lý</span>`;
                break;
            case 'done':
                status = `<span class="badge badge-success">Đã xử lý</span>`;
                break;
            case 'limitBet':
                refund = true;
                status = `<span class="badge badge-danger">Sai hạn mức</span>`;
                break;
            case 'errorComment':
                refund = true;
                status = `<span class="badge badge-danger">Sai nội dung</span>`;
                break;
            case 'limitRefund':
                status = `<span class="badge badge-danger">Giới hạn hoàn</span>`;
                break;
            default:
                status = `<span class="badge badge-danger">Lỗi xử lý</span>`;
                break;
        }

        $('.transId-refund').remove();
        refund && $('#modalDetail .modal-footer').append(`<button class="btn btn-primary transId-refund" data-id="${data.transId}">Hoàn tiền</button>`);
        $('#detailTransId').html(`#${data.transId}`);
        $('#tableDetails').html(`<tr><td><b>Số điện thoại</b></td><td class="text-secondary">${data.phone}</td></tr><tr><td><b>Mã giao dịch</b></td><td class="text-info">${data.transId}</td></tr><tr><td><b>Trò chơi</b></td><td class="text-warning">${data.gameName ? data.gameName : 'Không xác định'}</td></tr><tr><td><b>Tiền cược</b></td><td class="text-secondary">${Intl.NumberFormat('en-US').format(data.amount)}đ</td></tr><tr><td><b>Nội dung</b></td><td class="text-info">${data.comment}</td></tr><tr><td><b>Tiền thắng</b></td><td class="text-secondary">${Intl.NumberFormat('en-US').format(data.bonus)}đ</td></tr><tr><td><b>Kết quả</b></td><td>${data.result == 'win' ? `<span class="badge badge-success">Thắng</span>` : (data.result == 'won' ? `<span class="badge badge-danger">Thua</span>` : `<span class="badge badge-warning">Không xác định</span>`)}</td></tr><tr><td><b>Trạng thái</b></td><td>${status}</td></tr><tr><td><b>Thời gian</b></td><td>${data.time}</td></tr>`)
        $("#modalDetail").modal('show');
    }
}

function refundTransId(action = 'start', err, response) {
    if (action == 'start') {
        $('#modalDetail .transId-refund').prop('disabled', true).html('Đang xử lý <i class="fas fa-spinner text-white fa-spin" aria-hidden="true"></i>');
        return;
    }

    $('#modalDetail').modal('hide'), $('#modalDetail .transId-refund').remove();
    err && Swal.fire('Thông Báo', `Có lỗi xảy ra ${err.message}`, 'warning');
    !err && Swal.fire('Thông Báo', response.message, response.success ? 'success' : 'error');
}

function jackpotCheck(action = 'start', err, response) {
    if (action == 'start') return;

    err && Swal.fire('Thông Báo', `Có lỗi xảy ra ${err.message}`, 'warning');
    !response.success && Swal.fire('Thông Báo', response.message, 'error');

    if (response.success) {
        $('#jackpot div.input-group-append').html(`<button class="btn btn-${(response.data.isJoin == 0 || response.data.isJoin == -1) ? 'primary" data-action="join">Tham gia' : 'danger" data-action="out">Hủy tham gia'}</button>`);

        response.data.isJoin == 0 ? !$('.jackpot-time').hasClass('d-none') && $('.jackpot-time').addClass('d-none') : $('.jackpot-time').hasClass('d-none') && $('.jackpot-time').removeClass('d-none');

        if (response.data.isJoin != 0) response.data.isJoin == 1 ? $('.jackpot-time').html(`Thời gian tham gia nổ hũ: <strong>${response.data.time}</strong>`) : $('.jackpot-time').html(`Thời gian hủy tham gia nổ hũ: <strong>${response.data.time}</strong>`);
    }
}

function jackpotAction(action = 'start', err, response) {
    if (action == 'start') {
        $('#jackpot button').html('Đang xử lý...').prop('disabled', true);
        return;
    }

    err && Swal.fire('Thông Báo', `Có lỗi xảy ra ${err.message}`, 'warning');

    $('#jackpot input[name="phone"]').val(''), $('#jackpot .input-group-append').html(''), !$('.jackpot-time').hasClass('d-none') && $('.jackpot-time').addClass('d-none'), !err && Swal.fire('Thông Báo', response.message, response.success ? 'success' : 'error');
}