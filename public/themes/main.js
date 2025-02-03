const clipboard = new ClipboardJS('.copy-text');
const socket = io();

let i = 0,
    j = 0,
    isBackspacing = false,
    isParagraph = false,
    speedForward = 0,
    speedWait = 30000,
    speedBetweenLines = 10,
    speedBackspace = 0;

let musterTime = setInterval(countDown, 1000);

clipboard.on('success', (e) => numberCopy(e));

$(document).ready(function () {

    localStorage.getItem('notification') ? Date.now() >= localStorage.getItem('notification') && localStorage.clear("notification") : $("#notiModal").modal("show");
    setInterval(getPhone, (180 * 1000));
    
    getReward();
    getPhone();
    getHistory();
    getMuster();
    getHistoryMuster();

    socket.on('musterData', (data) => {
        if (!data) return;

        loadMuster(null, { success: true, data });

        clearInterval(musterTime);

        musterTime = setInterval(countDown, 1000);
    });

    socket.on('jackpotCount', (data) => {
        $('.jackpot-amount>span').html(0);
        animate('.jackpot-amount>span', data)
    });

    socket.on("historyData", (data) => {
        data && loadHistory(null, { success: true, data })
    });

    socket.on("phoneData", (data) => {
        data && loadPhone(null, { success: true, data })
    });

    socket.on("gameData", (data) => {
        data && loadGame(null, { success: true, data })
    });

    socket.on("rewardData", (data) => {
        let gameType = $('.games.btn-primary').data('type');
        data == gameType && loadReward(null, { success: true, data })
    });

    socket.on('historyMuster', (data) => {
        data && loadHistoryMuster(null, { success: true, data })
    });

    socket.on('notiWin', (data) => {
        new Notify({
            status: 'success',
            title: `Trò chơi: ${data.gameName}`,
            text: `Chúc mừng <b>${data.phone}</b> đã thắng ${Intl.NumberFormat('en-US').format(data.amount)} VNĐ`,
            autoclose: true,
            autotimeout: 3500,
            customIcon: iconNotify
        });
    })

    $('body').on('click', '#closeNoti', (e) => localStorage.setItem('notification', Date.now() + 3600 * 1000))

    $('body').on('click', '.games', function (e) {
        let _this = $(this);

        _this.removeClass('btn-default');
        $('.games.btn-primary').removeClass('btn-primary').addClass('btn-default');
        _this.addClass('btn-primary');

        !_this.data('game') && getReward();
    })

    $('body').on('click', '#checkMission button', function (e) {
        let phone = $('#checkMission input[name="phone"]').val();

        loadMission('start');
        axios.post('../api/v2/checkMission', { phone })
            .then(res => {
                loadMission(null, null, res.data);
            }).catch(err => {
                loadMission(null, err, null);
            })
    })

    $('body').on('click', '#addMuster button', function (e) {
        let phone = $('#addMuster input[name="phone"]').val();

        addMuster();
        axios.post('../api/v2/muster/add', { phone })
            .then(res => {
                addMuster(null, null, res.data);
            }).catch(err => {
                addMuster(null, err, null);
            })
    })

    $('body').on('click', '#checkGift button', function (e) {
        let phone = $('#checkGift input[name="phone"]').val();
        let code = $('#checkGift input[name="code"]').val();

        checkGift();
        axios.post('../api/v2/checkGift', { phone, code })
            .then(res => {
                checkGift(null, null, res.data);
            }).catch(err => {
                checkGift(null, err, null);
            })
    })


    $('body').on('change', '#jackpot input[name="phone"]', function (e) {
        let phone = $('#jackpot input[name="phone"]').val();

        jackpotCheck();
        axios.post('../api/v2/jackpot/checkJoin', { phone })
            .then(res => {
                jackpotCheck(null, null, res.data);
            }).catch(err => {
                jackpotCheck(null, err);
            })

    })

})


function typingEffect(element, textArray) {
    let h3 = $(element).children("h3");
    let h4 = $(element).children("h4");

    if (!isBackspacing) {
        if (i < textArray[j].length) {
            if (textArray[j].charAt(i) == "|") {
                isParagraph = true;
                h3.removeClass("cursor");
                h4.addClass("cursor");
                i++;
                setTimeout(() => typingEffect(element, textArray), speedBetweenLines);
                return;
            }

            !isParagraph ? h3.text(h3.text() + textArray[j].charAt(i)) : h4.text(h4.text() + textArray[j].charAt(i));
            i++;
            setTimeout(() => typingEffect(element, textArray), speedForward);

        } else if (i == textArray[j].length) {
            isBackspacing = true;
            setTimeout(() => typingEffect(element, textArray), speedWait);
        }

        return;
    }

    if (h3.text().length || h4.text().length) {
        h4.text().length ? h4.text(h4.text().substring(0, h4.text().length - 1)) : h4.removeClass("cursor") && h3.addClass("cursor") && h3.text(h3.text().substring(0, h3.text().length - 1));
        setTimeout(() => typingEffect(element, textArray), speedBackspace);
        return;
    }

    isBackspacing = false;
    i = 0;
    isParagraph = false;
    j = (j + 1) % textArray.length;
    setTimeout(() => typingEffect(element, textArray), 50);

    return;
}

function getReward() {
    let gameType = $('.games.btn-primary').data('type');

    axios.post('../api/v2/getReward', {
        gameType
    })
        .then(res => {
            loadReward(null, res.data);
        }).catch(err => {
            loadReward(err);
        });
}

function getPhone() {
    axios.get('../api/v2/getPhone')
        .then(res => {
            loadPhone(null, res.data);
        }).catch(err => {
            loadPhone(err);
        })
}

function getHistory() {
    axios.get('../api/v2/getHistory')
        .then(res => {
            loadHistory(null, res.data);
        }).catch(err => {
            loadHistory(err);
        })
}

function getMuster() {
    axios.get('../api/v2/muster/session')
        .then(res => {
            loadMuster(null, res.data);
        }).catch(err => {
            loadMuster(err);
        })
}

function getHistoryMuster() {
    axios.get('../api/v2/muster/history')
        .then(res => {
            loadHistoryMuster(null, res.data);
        }).catch(err => {
            loadHistoryMuster(err);
        })
}

function countDown() {
    let second = $('.muster-time').html();

    if (second < 1) return clearInterval(musterTime) && $('.muster-time').html(0);
    $('.muster-time').html(second - 1);
}

function convertCurrency(number) {
    return (number > 999 && number < 1000000) ? (number / 1000) + 'K' : (number >= 1000000 ? (number / 1000000) + 'M' : Intl.NumberFormat().format(number));
}

function animate(element, value, speed = 200) {
    const data = Number($(element).text().replace(/,/g, ""));
    const time = value / speed;

    data < value ? ($(element).html(Intl.NumberFormat("en-US").format(Math.ceil(data + time))), setTimeout(() => animate(element, value), 1)) : $(element).html(Intl.NumberFormat("en-US").format(value))
}
