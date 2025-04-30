$('#taiXiuRong').draggable({});

const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
    }
});

let betTai = 0, betXiu = 0;
let btnNan = localStorage.getItem('btnNan');
let nan = localStorage.getItem('nan');
let resultHistoryImg;

updateNan();

$(document).ready(function () {
    let second = 0;
    let type;
    let balance = $('#user-balance').text().replace(/[^\d]/g, '');
    socket.on('taiXiuRong', function (data) {

        let btnNan = localStorage.getItem('btnNan');
        let nan = localStorage.getItem('nan');

        const dataDecode = JSON.parse(decrypt(data));
        resultHistoryImg = dataDecode.soiCau.image;

        second = dataDecode.second;
        if (dataDecode.turn) {
            $('#taiXiuRong #turn').text(`#${dataDecode.turn}`);
        }

        if (second >= 0 && second <= 60 && second) {

            localStorage.setItem('nan', 'chua');
            $('#taiXiuRong .wrap-dice').html('');
            const digits = second.toString().split('');
            let span = '';
            digits.forEach(digit => {
                span += `<span class="second${digit}"></span>`;
            });
            $("#taiXiuRong .wrap-second").html(span);

            $("#btnBat").addClass('hidden');
            $("#taiXiuRong .second-countdown").addClass('hidden')
            $("#taiXiuRong .wrap-second-countdown").addClass('hidden').html("");
            const element = document.getElementById('btnBat');

            element.style.top = null;
            element.style.left = null;

            $('.wrap-history').html('');
            resultHistoryImg.forEach(item => {
                $('.wrap-history').append('<img src="/themes/images/taiXiuRong/' + item + '.png" class="icon">');
            });

        } else if(second <= 72 && second > 60) {
            //Nan Xuc Xac
            $('#taiXiuRong .wrap-dice').html(`<img class="dice-1" src="../themes/images/taiXiuRong/dice/dice-${dataDecode.dice1}.png"><img class="dice-2" src="../themes/images/taiXiuRong/dice/dice-${dataDecode.dice2}.png"><img class="dice-3" src="../themes/images/taiXiuRong/dice/dice-${dataDecode.dice3}.png">`)
            $('.wrap-second').addClass('hidden').html('');

            if (btnNan == 'nan' && nan == 'chua') {
                $("#btnBat").removeClass('hidden').draggable({
                    // containment: "window",
                    drag: function (event, ui) {
                        const currentDate = new Date();
                        let y2 = ui.position.top;
                        let x2 = ui.position.left;

                        if (Math.abs(y2) < 320 || Math.abs(x2) > 660) {
                            $('#btnBat').addClass('hidden');
                            localStorage.setItem('nan', 'roi');

                            $('.wrap-history').html('');
                            resultHistoryImg.forEach(item => {
                                $('.wrap-history').append('<img src="/themes/images/taiXiuRong/' + item + '.png" class="icon">');
                            });

                            if (!audioOpenPlayed) {
                                const audio = new Audio("/themes/taixiu/music/open.mp3");
                                audio.play();
                                audioOpenPlayed = true;
                            }

                            if (resultTx <= 10) {
                                $('.xiu-win').removeClass('hidden');
                                $(".xiu-b").css("animation", "zoomout .4s ease-in-out infinite alternate");
                            }
                            if (resultTx >= 11) {
                                $('.tai-win').removeClass('hidden');
                                $(".tai-b").css("animation", "zoomout .4s ease-in-out infinite alternate");
                            }
                            $('#historyTx').html('');
                            resultHistoryImg.forEach(item => {
                                $('#historyTx').html(item);
                            });
                            setCookie("daNan", "1", 3600 * 24 * 365);
                        }
                    }
                });
            }

            const secondCountdown = second - 60;
            const digits = secondCountdown.toString().split('');
            let span = '';
            digits.forEach(digit => {
                span += `<span class="second${digit}"></span>`;
            });
            $("#taiXiuRong .second-countdown").removeClass('hidden')
            $("#taiXiuRong .wrap-second-countdown").removeClass('hidden').html(span);
        } else if (second == 63) {
            $('#btnBat').addClass('hidden');
            localStorage.setItem('nan', 'roi');

            $('.wrap-history').html('');
            resultHistoryImg.forEach(item => {
                $('.wrap-history').append('<img src="/themes/images/taiXiuRong/' + item + '.png" class="icon">');
            });
        }
    })

    $('#taiXiuRongImg').click(function () {
        $('#modal-notes').modal('show');
        $('#modal-notes .comments__text').html('<p>HOT!! Trò chơi lấy kết quả bằng 3 viên xúc xắc (chơi bằng số dư của tài khoản)</p>');
    });
    $('#startTaiXiuRong').click(function () {
        $('#taiXiuRong').removeClass('hidden');
    });

    $('#btnChangeNan').click(function () {
        let btnNan = localStorage.getItem('btnNan');
        if (btnNan === 'khong-nan') {
            localStorage.setItem('btnNan', 'nan');
        } else {
            localStorage.setItem('btnNan', 'khong-nan');
        }
        updateNan()
    });

    $('#taiXiuRong .wrap-cuoc-tai .click').click(function () {
        if (!username) {
            return Toast.fire({
                icon: "error",
                title: "Vui lòng đăng nhập tài khoản"
            });
        }
        if (second < 5) {
            return Toast.fire({
                icon: "error",
                title: "Vui lòng đợi phiên tiếp theo"
            });
        }

        if (second > 60) {
            return Toast.fire({
                icon: "error",
                title: "Vui lòng đợi phiên tiếp theo"
            });
        }

        $('#wrap-action-bet').removeClass('hidden');
        type = 'SRT';
        betXiu = 0;
        upBetXiu();
    });

    $('#taiXiuRong .wrap-cuoc-xiu .click').click(function () {
        if (!username) {
            return Toast.fire({
                icon: "error",
                title: "Vui lòng đăng nhập tài khoản"
            });
        }
        if (second < 5) {
            return Toast.fire({
                icon: "error",
                title: "Vui lòng đợi phiên tiếp theo"
            });
        }

        if (second > 60) {
            return Toast.fire({
                icon: "error",
                title: "Vui lòng đợi phiên tiếp theo"
            });
        }

        $('#wrap-action-bet').removeClass('hidden');
        type = 'SRX';
        betTai = 0;
        upBetTai();
    });

    $('#taiXiuRong .btnBet').click(function () {
        if (!username) {
            Toast.fire({
                icon: "error",
                title: "Vui lòng đăng nhập tài khoản"
            });
        }
        if (second < 5) {
            Toast.fire({
                icon: "error",
                title: "Vui lòng đợi phiên tiếp theo"
            });
        }
        if (second > 60) {
            Toast.fire({
                icon: "error",
                title: "Vui lòng đợi phiên tiếp theo"
            });
        }
        if (parseInt(betTai) > balance || parseInt(betXiu) > balance) {
            Toast.fire({
                icon: "error",
                title: "Số dư không đủ để thực hiện đặt cược!"
            });
        }
        $('#wrap-action-bet').addClass('hidden');
        $.ajax({
            url: '/bet-taixiu',
            type: 'post',
            dataType: 'json',
            data: {
                amount: type == 'SRT' ? betTai : betXiu,
                type
            },
            success: function (result) {
                betXiu = 0, betTai = 0;
                upBetXiu();
                upBetTai();
                Toast.fire({
                    icon: result.success ? "success" : "error",
                    title: result.message
                })
            }
        })
    });

    $('.wrap-bet img').click(function () {
        const value = $(this).data('value');
        if (type === 'SRT') {
            betTai = parseInt(betTai) + parseInt(value);
            upBetTai();
        } else {
            betXiu = parseInt(betXiu) + parseInt(value);
        }
        upBetXiu();
        upBetTai();
    })

    $('#taiXiuRong .close').click(function () {
        $('#taiXiuRong').addClass('hidden');
    });

    $('#taiXiuRong .btnAllin').click(function () {
        if (type === 'SRT') {
            betXiu = 0;
            betTai = balance;
        } else if (type === 'SRX') {
            betTai = 0;
            betXiu = balance;
        }
        upBetXiu();
        upBetTai();
    });

    $('#taiXiuRong .btnCancel').click(function () {
        betXiu = 0, betTai = 0;
        upBetXiu();
        upBetTai();
        $('#wrap-action-bet').addClass('hidden');
    })

});

function upBetTai() {
    let spanTai = "";
    const digitsTai = String(betTai).split("");
    let count = 0;
    // Duyệt từ phải qua trái
    for (let i = digitsTai.length - 1; i >= 0; i--) {
        const digit = digitsTai[i];
        spanTai = `<span class="number${digit}"></span>` + spanTai;
        count++;

        // Thêm dấu phẩy sau mỗi 3 số, trừ đầu chuỗi
        if (count % 3 === 0 && i !== 0) {
            spanTai = `<span class="numberphay"></span>` + spanTai;
        }
    }

    $("#taiXiuRong .wrap-your-bet-tai").html(spanTai);

}

function upBetXiu() {
    let spanXiu = "";
    const digitsXiu = String(betXiu).split("");
    let count = 0;

    // Duyệt từ phải qua trái
    for (let i = digitsXiu.length - 1; i >= 0; i--) {
        const digit = digitsXiu[i];
        spanXiu = `<span class="number${digit}"></span>` + spanXiu;
        count++;

        // Thêm dấu phẩy sau mỗi 3 số, trừ đầu chuỗi
        if (count % 3 === 0 && i !== 0) {
            spanXiu = `<span class="numberphay"></span>` + spanXiu;
        }
    }

    $("#taiXiuRong .wrap-your-bet-xiu").html(spanXiu);

}

function updateNan() {
    const btnNan = localStorage.getItem('btnNan');
    if (!btnNan || btnNan == 'khong-nan') {
        $('#btnChangeNan').removeClass('nan hidden').addClass('khong-nan');
    } else {
        $('#btnChangeNan').removeClass('khong-nan hidden').addClass('nan');
    }
}

function showNotificationTaiXiuRong(message) {

    $('.taiXiuRong-noti .wrap-noti b').text(message);

    $('.taiXiuRong-noti').css({
        'display': 'flex',
        'animation': 'slideDown 0.5s ease-out forwards'
    });

    setTimeout(function () {
        $('.taiXiuRong-noti').css('animation', 'slideUp 0.5s ease-out forwards');
    }, 1000)
}
