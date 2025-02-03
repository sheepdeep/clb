// var autoMain = new Audio("/themes/taixiu/music/lb_music_1.mp3");
// autoMain.play();
let resultTx;
var audioOpenPlayed = false;
let resultHistoryImg;

function showNotification(message, imageUrl) {
    var container = document.getElementById('errorNotiMD5');
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    var notification = document.createElement('div');
    notification.className = 'wrap-text-error';

    var image = document.createElement('img');
    image.className = 'img-error';
    image.src = imageUrl; // Set the image source

    var boldElement = document.createElement('b');
    boldElement.textContent = message; // Set the message text

    // Append the image and message to the notification
    notification.appendChild(image);
    notification.appendChild(boldElement);

    // Add the notification to the document
    container.appendChild(notification);

    // Show the notification with the zoom-up effect
    notification.classList.add('zoom-up');

    // Remove the notification after 2 seconds
    setTimeout(function () {
        hideNotification(notification);
    }, 2000);
}

function hideNotification(notification) {
    // Add the zoom-down class to hide the notification
    notification.classList.add('zoom-down');

    // Remove the notification from the DOM after the animation ends
    notification.addEventListener('animationend', function () {
        notification.parentNode.removeChild(notification);
    });
}

function setCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

const ctx2 = document.getElementById('resultSoi');
var chartResultSoi = new Chart(ctx2, {
    type: 'line',
    data: {
        labels: ['1'],
        datasets: [{
            label: 'Kết quả',
            data: [6],
            borderWidth: 1,
        }]
    },
    options: {
        scales: {
            y: {
                display: false,
            }
        },
        maintainAspectRatio: false,
        plugins: {
            datalabels: {
                backgroundColor: function (context) {
                    if (context.dataset.data[context.dataIndex] <= 10) {
                        return '#EAEAEA';
                    } else {
                        return '#393939';
                    }
                },
                borderRadius: 20,
                color: function (context) {
                    if (context.dataset.data[context.dataIndex] <= 10) {
                        return 'black'
                    } else {
                        return 'white'
                    }
                },
                borderWidth: 5,
                font: {
                    weight: 'bold'
                },
                formatter: function (value) {
                    return value < 10 ? '0' + value : value;
                }
            }
        }
    }
});

function openTaiXiu() {
    $('#taiXiuMd5').removeClass('hidden');
}

function njs(_0x90f8x4) {
    var _0x90f8x20 = String(_0x90f8x4);
    var _0x90f8x21 = _0x90f8x20['length'];
    var _0x90f8x22 = 0;
    var _0x90f8x23 = '';
    var _0x90f8xa;
    for (_0x90f8xa = _0x90f8x21 - 1; _0x90f8xa >= 0; _0x90f8xa--) {
        _0x90f8x22 += 1;
        aa = _0x90f8x20[_0x90f8xa];
        if (_0x90f8x22 % 3 == 0 && _0x90f8x22 != 0 && _0x90f8x22 != _0x90f8x21) {
            _0x90f8x23 = ',' + aa + _0x90f8x23
        } else {
            _0x90f8x23 = aa + _0x90f8x23
        }
    }
    ;
    return _0x90f8x23
}

function numgo(item, number, tim = 17) {
    var timz = Math['floor'](tim);
    var itemz = Math['floor'](item['val']());
    var numberz = (Math['floor'](number) - Math['floor'](item['val']())) / timz;
    (function setttttttt(alo) {
        setTimeout(function () {
            item['html'](njs(Math['floor'](itemz + (timz + 1 - alo) * numberz)));
            if (--alo) {
                setttttttt(alo)
            } else {
                item['val'](number)
            }
        }, 15)
    })(timz)
}

if (getCookie('nan')) {
    $('#btnNan').attr('src', '/themes/taixiu/image/nan.png')
} else {
    $('#btnNan').attr('src', '/themes/taixiu/image/khongnan.png')
}

function isMobile() {
    return /Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(navigator.userAgent);
}

socket.on('taixiu', (data) => {

    // console.log(data);
    resultTx = data.result;
    resultHistoryImg = data.soiCau.image;

    $('.wrap-turn b').text('#' + data.turn);

    if (!getCookie('nan') && data.second >= 78) {
        $('.bat').addClass('hidden');

        console.log(resultTx);

        if (!audioOpenPlayed) {
            const audio = new Audio("/themes/taixiu/music/open.mp3");
            audio.play();
            audioOpenPlayed = true;
        }

        if (resultTx <= 10 && data.second > 60) {
            $('.xiu-win').removeClass('hidden');
            $(".xiu-b").css("animation", "zoomout .4s ease-in-out infinite alternate");
        }
        if (resultTx >= 11 && data.second > 60) {
            $('.tai-win').removeClass('hidden');
            $(".tai-b").css("animation", "zoomout .4s ease-in-out infinite alternate");
        }

        setTimeout(function () {
            $('#textMd5').css('animation', '');
        }, 3000);

    }

    if (getCookie('nan') && data.second === 78) {
        // $("#btnBat").draggable('enable');
        $("#btnBat").draggable({
            disabled: false
        });
        $('#btnBat').css('z-index', 11);
        showNotification('Xin mời nặn!', '/themes/taixiu/image/iok.png');
        // $('#btnBat').draggable({
        //     disabled: false  // Kích hoạt draggable ngay từ đầu
        // })
    }

    // if (data.second === 78 && getCookie('nan')) {
    //     $("#btnBat").draggable(true);
    //     $('#btnBat').css('z-index', 11);
    //     showNotification('Xin mời nặn!', '/frontend-user/taixiu/image/iok.png');
    // }

    if (data.second > 62) {
        $('.mmini').removeClass('hidden');
        $('.wrap-time-nan b').text(data.second - 60 - 3);
    } else {
        $('.mmini').addClass('hidden');
        $('.wrap-time-nan b').text('');
    }

    if (data.second === 66) {
        $('.bat').addClass('hidden');

        if (!audioOpenPlayed) {
            const audio = new Audio("/themes/taixiu/music/open.mp3");
            audio.play();
            audioOpenPlayed = true;
        }

        if (resultTx <= 10 && data.second > 60) {
            $('.xiu-win').removeClass('hidden');
            $(".xiu-b").css("animation", "zoomout .4s ease-in-out infinite alternate");
        }
        if (resultTx >= 11 && data.second > 60) {

            $('.tai-win').removeClass('hidden');
            $(".tai-b").css("animation", "zoomout .4s ease-in-out infinite alternate");
        }

        setTimeout(function () {
            $('#textMd5').css('animation', '');
        }, 3000);
    }

    if (data.second <= 62 && data.second >= 60) {
        $('.new-turn').removeClass('hidden');
        $('.khung-bat').addClass('hidden');
        $('.bat-rong').addClass('hidden');
        $('.bat').addClass('hidden');
    }

    if (data.second >= 70) {
        $('.new-turn').addClass('hidden');
        $('.title-md5').addClass('hidden');
        $('.result-md5').removeClass('hidden');
        $('.wrap-second b').text('');
        $('.wrap-result-xx').html(data.img_result);

        $('.bat-rong').removeClass('hidden');
        $('.khung-bat').addClass('hidden');
    }

    if (data.second === 60) {
        $('#textMd5').css('animation', 'typing 1s steps(32, end)');

        setTimeout(function () {
            $('#textMd5').css('animation', '');
        }, 3000);
    }

    if (data.second <= 60 && data.second > 0) {

        audioOpenPlayed = false;

        $(".tai-b").css("animation", "");
        $(".xiu-b").css("animation", "");

        // $("#btnBat").draggable('disable').removeClass('ui-state-disabled');
        $('#btnBat').draggable({
            disabled: true
        }).removeClass('ui-state-disabled');


        $('.wrap-user-tai b').text(data.userTai);
        $('.wrap-user-xiu b').text(data.userXiu);


        $('.new-turn').addClass('hidden');
        $('.khung-bat').removeClass('hidden');
        $('.bat').removeClass('hidden');
        $('.bat-rong').addClass('hidden');

        $('.xiu-win').addClass('hidden');
        $('.tai-win').addClass('hidden');

        $('.wrap-result-xx').html('');

        $('.title-md5').removeClass('hidden');
        $('.result-md5').addClass('hidden');

        $('.wrap-second b').text(data.second);

        var lastSumTai = $('.wrap-sum-tai b').text().split(",").join("");
        var lastSumXiu = $('.wrap-sum-xiu b').text().split(",").join("");

        const audioTach = new Audio("/themes/taixiu/music/tach.mp3");

        if (parseInt(lastSumTai) != parseInt(data.sumTai)) {
            $('.wrap-sum-tai b').css('animation', 'zoomoutMoney 0.3s ease-in-out infinite alternate');
            audioTach.play();
            numgo($('.wrap-sum-tai b'), data.sumTai, 17);
        }

        if (parseInt(lastSumXiu) != parseInt(data.sumXiu)) {
            $('.wrap-sum-xiu b').css('animation', 'zoomoutMoney 0.3s ease-in-out infinite alternate');
            audioTach.play();
            numgo($('.wrap-sum-xiu b'), data.sumXiu, 17);
        }

        setTimeout(function () {
            $('.wrap-sum-tai b').css('animation', '');
            $('.wrap-sum-xiu b').css('animation', '');
        }, 300);

        $('#btnBat').removeClass('hidden').css('z-index', 4);

        const element = document.getElementById('btnBat');

        element.style.top = null;
        element.style.left = null;

        // $('.wrap-history').html(data.img_history);

        $('.wrap-history').html('');

        resultHistoryImg.forEach(item => {
            $('.wrap-history').append('<img src="/themes/taixiu/image/result_' + item + '.png" class="icon">');
        });


        chartResultSoi.data.labels = data.soiCau.labels;
        chartResultSoi.data.datasets[0].data = data.soiCau.result;
        chartResultSoi.data.datasets[0].pointStyle = 'image';
        chartResultSoi.data.datasets[0].pointRadius = 5;
        chartResultSoi.update();

    }
});

$("#btnBat").draggable({
    // containment: "window",
    drag: function (event, ui) {
        const currentDate = new Date();
        let y2 = ui.position.top;
        let x2 = ui.position.left;

        if (isMobile() && Math.abs(y2) < 110 || isMobile() && Math.abs(x2) > 226 || !isMobile() && Math.abs(y2) < 320 || !isMobile() && Math.abs(x2) > 660) {

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

$('#taiXiuMd5').draggable({});

// $('#taiXiuMd5').on('touchstart', function (event) {
//     var x = event.originalEvent.touches[0].pageX;
//     var y = event.originalEvent.touches[0].pageY;
//     $(this).data('lastTouch', {
//         x: x,
//         y: y
//     });
// });
//
// $('#taiXiuMd5').on('touchmove', function (event) {
//     var lastTouch = $(this).data('lastTouch');
//     if (lastTouch) {
//         var x = event.originalEvent.touches[0].pageX;
//         var y = event.originalEvent.touches[0].pageY;
//         var deltaX = x - lastTouch.x;
//         var deltaY = y - lastTouch.y;
//
//         // Update element's position
//         $(this).css({
//             left: '+=' + deltaX + 'px',
//             top: '+=' + deltaY + 'px'
//         });
//
//         // Update last touch position
//         $(this).data('lastTouch', {
//             x: x,
//             y: y
//         });
//     }
// });

$(document).ready(function () {

    $('#cuocTai').on('click', function () {
        $('#cuocTai').attr('src', '/themes/taixiu/image/cuoc-2.png');
        $('#cuocXiu').attr('src', '/themes/taixiu/image/cuoc.png');
        $('#bet').css('display', 'block');
        $('.wrap-user-sum-tai b').css('z-index', 2);
        $('.wrap-user-sum-xiu b').css('z-index', 0).text(0);
        typeBet = 'tai';
        const audio = new Audio("/themes/taixiu/music/tinhtinh.mp3");
        audio.play();
    });

    $('#cuocXiu').on('click', function () {
        $('#cuocXiu').attr('src', '/themes/taixiu/image/cuoc-2.png');
        $('#cuocTai').attr('src', '/themes/taixiu/image/cuoc.png');
        $('#bet').css('display', 'block');
        $('.wrap-user-sum-tai b').css('z-index', 0).text(0);
        $('.wrap-user-sum-xiu b').css('z-index', 2);
        typeBet = 'xiu';
        const audio = new Audio("/themes/taixiu/music/tinhtinh.mp3");
        audio.play();
    });

    $('#btnHuy').on('click', function () {
        $('#bet').css('display', 'none');
        $('#cuocTai').attr('src', '/themes/taixiu/image/cuoc.png');
        $('#cuocXiu').attr('src', '/themes/taixiu/image/cuoc.png');
        $('.wrap-user-sum-' + typeBet + ' b').css('z-index', 0).text(0);
        const audio = new Audio("/themes/taixiu/music/tinhtinh.mp3");
        audio.play();
    });

    $("#btnDatCuoc").on('click', function () {
        $.ajax({
            url: '/api/v2/bet/tai-xiu',
            method: 'POST',
            dataType: 'JSON',
            data: {
                amount: amount,
                type: typeBet
            },
            success: function (res) {
                showNotification(res.message, '/themes/taixiu/image/iok.png');
                window.location.href = res.url;
            }
        })

    });

    $('.list-money img').on('click', function (e) {
        var lastMoney = $('.wrap-user-sum-' + typeBet + ' b').text().split(",").join("");
        var money = $(this).data('money') + parseInt(lastMoney);

        if (money <= 999000000) {

            amount = money;
            if (typeBet === 'tai') {
            }

            $('.wrap-user-sum-' + typeBet + ' b').text(new Intl.NumberFormat('en-US', {maximumSignificantDigits: 3}).format(money))

        } else {
            amount = 999000000;
            $('.wrap-user-sum-' + typeBet + ' b').text('999,000,000');
            showNotification('Tối đa 999M', '/themes/taixiu/image/iok.png');
        }
        const audio = new Audio("/themes/taixiu/music/tinhtinh.mp3");
        audio.play();
    });

    $('#btnCopy').on('click', function () {
        var text = $('#textMd5').text();

        const audio = new Audio("/themes/taixiu/music/tinhtinh.mp3");
        audio.play();

        // Create a temporary textarea element
        var textarea = $('<textarea>').val(text).appendTo('body').select();

        try {
            document.execCommand('copy');
            showNotification('Sao chép thành công!', '/themes/taixiu/image/iok.png');
        } catch (error) {
        }

        // Remove the temporary textarea from the DOM
        textarea.remove();

    });

    $('#btnSoiCau').on('click', function () {
        $('#soiCauModal').modal('show');
    });

    $('#btnNan').on('click', function () {

        const audio = new Audio("/themes/taixiu/music/tinhtinh.mp3");
        audio.play();

        setCookie('nan', !getCookie('nan'), 3600);

        if (getCookie('nan')) {
            $('#btnNan').attr('src', '/themes/taixiu/image/nan.png')
        } else {
            $('#btnNan').attr('src', '/themes/taixiu/image/khongnan.png')
        }
    });

    $('#btnX2').on('click', function () {
        var lastMoney = $('.wrap-user-sum-' + typeBet + ' b').text().split(",").join("");
        if (lastMoney <= 0) {
            showNotification('Vui lòng chọn số tiền cược', '/themes/taixiu/image/iok.png');
        } else {
            var money = lastMoney * 2;

            if (money <= 999000000) {
                amount = money;

                $('.wrap-user-sum-' + typeBet + ' b').text(new Intl.NumberFormat('en-US', {maximumSignificantDigits: 3}).format(money))
            } else {
                amount = 999000000;
                $('.wrap-user-sum-' + typeBet + ' b').text('999,000,000');
                showNotification('Tối đa 999M', '/themes/taixiu/image/iok.png');
            }
        }


        const audio = new Audio("/themes/taixiu/music/tinhtinh.mp3");
        audio.play();
    });

    $('#btnDong').on('click', function () {
        setCookie('taixiumd5', false);
        $('#taiXiuMd5').addClass('hidden');
    });
});

