function getPhone() {
    axios.get("../api/v2/getPhone").then(res => {
        $('#alertPhone').html('');
        loadPhone(null, res.data)
    }).catch(err => {
        loadPhone(err)
    })
}

function countDown() {
    let second = $(".muster-time").html();
    if (second < 1) return clearInterval(musterTime) && $(".muster-time").html(0);
    $(".muster-time").html(second - 1)
}

function convertCurrency(number) {
    return number > 999 && number < 1e6 ? number / 1e3 + "K" : number >= 1e6 ? number / 1e6 + "M" : Intl.NumberFormat().format(number)
}

function animate(element, value, speed = 200) {
    const data = Number($(element).text().replace(/,/g, "")), time = value / speed;
    data < value ? ($(element).html(Intl.NumberFormat("en-US").format(Math.ceil(data + time))), setTimeout(() => animate(element, value), 1)) : $(element).html(Intl.NumberFormat("en-US").format(value))
}
function loadPhone(err, response) {
    err && Swal.fire("Thông Báo", `Có lỗi xảy ra ${err.message}`, "warning"), !response.success && Swal.fire("Thông Báo", response.message, "error"), response.success && ($("#tablePhone, #tableStatus").html(""), response.data.map(data => {
        "active" == data.status && (data.amountDay + 2 * data.betMax >= data.limitDay || data.amountMonth + 2 * data.betMax >= data.limitMonth || data.count + 10 >= data.number) && (data.status = "pendingStop")
        $('#alertPhone').append(`<p><b>4. Hạn mức: ${Intl.NumberFormat("en-US").format(data.amountDay)}</span>/<span class="text-primary">${convertCurrency(data.limitDay)}</b></p>`);
        $('#alertPhone').append(`<p><b>5. Giới hạn đặt cược <span style="color: #ff0000"> ${Intl.NumberFormat("en-US").format(data.betMin)} VNĐ</span> - <span style="color: #ff0000">${Intl.NumberFormat("en-US").format(data.betMax)} VNĐ</span> </p>`);
        $('#alertPhone').append(`<p><b>6. Trạng thái: ${"active" == data.status ? '<em class="text-success text-xs">Hoạt động</em>' : "pendingStop" == data.status ? '<em class="text-warning text-xs">Sắp bảo trì</em>' : '<em class="text-danger text-xs">Bảo trì</em>'}</b></p>`)
        // "active" == data.status && (data.amountDay + 2 * data.betMax >= data.limitDay || data.amountMonth + 2 * data.betMax >= data.limitMonth || data.count + 10 >= data.number) && (data.status = "pendingStop"), $("#tablePhone").append(`<tr><td>${data.brandName} <span class="badge badge-info copy-text mr-2" data-clipboard-text="${data.brandName}" data-name="${data.brandName}" data-min="${data.betMin}" data-max="${data.betMax}"><i class="fa fa-clipboard"></i></span><span class="badge badge-success mr-2" data-qr-text="${data.baseQr}" onclick="showQr({trigger: this})" ><i class="fa fa-qrcode"></i></span><span class="badge badge-warning" data-name-text="${data.brandName}" data-base-text="${data.baseQr}" onclick="downloadQr({trigger: this})"><i class="fa fa-download"></i></span><br><img src="data:image/jpeg;base64,${data.baseQr}" /><br><small><b><span class="text-success">${Intl.NumberFormat("en-US").format(data.amountDay)}</span>/<span class="text-primary">${convertCurrency(data.limitDay)}</span> ~ <span class="text-info">${data.count}</span>/<span class="text-primary">${data.number}</span></b></small></td><td>${Intl.NumberFormat("en-US").format(data.betMin)} VNĐ</td><td>${Intl.NumberFormat("en-US").format(data.betMax)} VNĐ</td><td>${"active" == data.status ? '<span class="badge badge-success">Hoạt động</span>' : "pendingStop" == data.status ? '<span class="badge badge-warning">Sắp bảo trì</span>' : '<span class="badge badge-danger">Bảo trì</span>'}</td></tr>`), $("#tableStatus").append(`<tr><td>${data.phone} <span class="badge badge-info copy-text" data-clipboard-text="${data.phone}" data-name="${data.name}" data-min="${data.betMin}" data-max="${data.betMax}"><i class="fa fa-clipboard"></i></span></td><td>${data.name}</td><td><span class="text-success">${Intl.NumberFormat("en-US").format(data.amountDay)}</span>/${convertCurrency(data.limitDay)}</td><td><span class="text-success">${data.count}</span>/${data.number}</td></tr>`)
    }))
}

function getReward() {
    let gameType = $(".games.activeGame").data("type");
    $('#listButtonBet').html('');
    axios.post("../api/v2/rewards", {gameType: gameType}).then(res => {
        loadReward(null, res.data)
    }).catch(err => {
        loadReward(err)
    })
}

function loadReward(err, response) {
    let dataGame = $(".games.activeGame");
    err && Swal.fire("Thông Báo", `Có lỗi xảy ra ${err.message}`, "warning"), !response.success && Swal.fire("Thông Báo", response.message, "error"), response.success && ($("#gameName").html(`Cách Chơi ${dataGame.data("name")}`), $("#gameNoti").html(dataGame.data("description")), $("#tableReward").html(""), response.data.map(data => {
        $('#listButtonBet').append(`<!--<div class="col-md-6 col-xs-6 form-group"><button class="btn w-100 btn btn-primary" style="border-color: #f0e2af;" onclick="bet(${data.content},this)"><b>${data.content}</b></button></div>-->`);
        $('#listButtonBet').append(`<div class="col-md-6 col-xs-6 form-group"><p><button onclick="bet(${data.content},this)" class="sign__btn" type="button" id="btn-withdraw"><span>${data.content}</span></button></p></div>`);
        $("#tableReward").append(`<tr><td><b>${data.content}</b></td><td><span class="badge badge-info">${data.numberTLS.join('</span> - <span class="badge badge-info">')}</span></td><td><strong><span style="color: red;">x</span> ${data.amount}</strong></td></tr>`)
    }))
}

function bet(comment) {
    let amount = $('#soTienCuoc input[name="amount"]').val();

    axios.post(`../api/v2/bet`, {amount, comment}).then(res => {
        window.location.href = res.data.payUrl;
    }).catch(err => {
    })
}

function getHistory() {
    axios.get("../api/v2/history").then(res => {
        loadHistory(null, res.data)
    }).catch(err => {
        loadHistory(err)
    })
}

function loadHistory(err, response) {
    err && Swal.fire("Thông Báo", `Có lỗi xảy ra ${err.message}`, "warning"), !response.success && Swal.fire("Thông Báo", response.message, "error"), response.success && ($("#tableHistory").html(""), response.data.map(data => {
        $("#tableHistory").append(`<tr><td>${data.time}</td><td>${data.phone}</td><td>${Intl.NumberFormat("en-US").format(data.amount)}</td><td>${Intl.NumberFormat("en-US").format(data.bonus)}</td><td>${data.gameName}</td><td><div class="dashbox__table-text"><code>${data.content}</code></div></td><td><span class="gstatus win">Thắng</span></td></tr>`)
    }))
}

$("body").on("click", ".games", (function (e) {
    let _this = $(this);
    _this.removeClass("activeGame"), $(".games.activeGame").removeClass("activeGame").addClass(""), _this.addClass("activeGame"), !_this.data("game") && getReward()
}))
setInterval(getPhone, 18e4),setInterval(getHistory, 18e4), getPhone(), getHistory()