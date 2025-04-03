// const socket = io('http://localhost:3000', {
//     transports: ['websocket'], // Chỉ sử dụng WebSocket
// });

$('#taiXiuRong').draggable({});


$(document).ready(function () {

    let second = 0;
    socket.on('taiXiuRong', function (data) {
        const dataDecode = JSON.parse(decrypt(data));

        second = dataDecode.second;

        $('#taiXiuRong #turn').text(`#${dataDecode.turn}`);

        if (second >= 0 && second <= 60) {
            $('#taiXiuRong .wrap-dice').html('');
            const digits = second.toString().split('');
            let span = '';
            digits.forEach(digit => {
                span += `<span class="second${digit}"></span>`;
            });
            $("#btnBat").addClass('hidden');
            $("#taiXiuRong .wrap-second").html(span);
            $("#taiXiuRong .second-countdown").addClass('hidden')
            $("#taiXiuRong .wrap-second-countdown").addClass('hidden').html("");
        } else {
            //Nan Xuc Xac
            $('#taiXiuRong .wrap-dice').html(`<img class="dice-1" src="../themes/images/taiXiuRong/dice/dice-${dataDecode.dice1}.png"><img class="dice-2" src="../themes/images/taiXiuRong/dice/dice-${dataDecode.dice2}.png"><img class="dice-3" src="../themes/images/taiXiuRong/dice/dice-${dataDecode.dice3}.png">`)
            $('.wrap-second').addClass('hidden').html('');
            $("#btnBat").removeClass('hidden').draggable({
                // containment: "window",
                drag: function (event, ui) {
                    const currentDate = new Date();
                    let y2 = ui.position.top;
                    let x2 = ui.position.left;

                    if (Math.abs(y2) < 320 || Math.abs(x2) > 660) {

                        $('#btnBat').addClass('hidden');

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
            const secondCountdown = second - 60;
            const digits = secondCountdown.toString().split('');
            let span = '';
            digits.forEach(digit => {
                span += `<span class="second${digit}"></span>`;
            });
            $("#taiXiuRong .second-countdown").removeClass('hidden')
            $("#taiXiuRong .wrap-second-countdown").removeClass('hidden').html(span);
        }
    })

    $('#taiXiuRongImg').click(function () {
        $('#modal-notes').modal('show');
        $('#modal-notes .comments__text').html('<p>HOT!! Trò chơi lấy kết quả bằng 3 viên xúc xắc (chơi bằng số dư của tài khoản)</p>');
    });
    $('#startTaiXiuRong').click(function () {
        $('#taiXiuRong').removeClass('hidden');
    });

    $('#taiXiuRong .wrap-cuoc-tai .click').click(function () {
        if (second > 60) {
            showNotificationTaiXiuRong('Vui lòng đợi phiên tiếp theo');
        }
    });

    $('#taiXiuRong .close').click(function () {
        $('#taiXiuRong').addClass('hidden');
    });


});

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