function changeSizeHistoryPanel() {
    var resultBox = $('#resultBox .dashbox').css('height', 'auto').height();
    var historyBox = $('#historyBox').css('height', 'auto').height();
    if (resultBox > historyBox) {
        $('#historyBox').height(resultBox);
    } else {
        var resultBoxTable = $('#resultBox .dashbox .dashbox__table-lode').height();
        $('#historyBox .dashbox__table-wrap--4').css('max-height', resultBoxTable);
    }
}

socket.on('xsst', (data) => {

    changeSizeHistoryPanel();

    let second = data.second - 60;

    $('#second').html(second);

    if (second <= 0) {
        $('#second').html('0');
        loadResult(data);
    } else {
        loadResultOld(data);
    }

})

const loadResult = (data) => {
    if (data.result) {
        if (data.second <= 52) {
            $('#xsst-result-g1').html(`<code>${data.result.g1}</code>`)
        } else {
            $('#xsst-result-g1').html('<img src="../themes/images/loading2.gif" width="2%" />')
        }

        // Giai 2
        const resultG2Elements = document.querySelectorAll('#result-g2 span');
        resultG2Elements.forEach((span, index) => {
            if (data.second <= (50 - index * 2)) {
                $(`#xsst-result-g2-${index}`).html(`<code>${data.result.g2[index]}</code>`)
            } else {
                $(`#xsst-result-g2-${index}`).html('<img src="../themes/images/loading2.gif" width="3%" />')
            }
        });

        // Giai 3
        const resultG3Elements = document.querySelectorAll('#result-g3 span');
        resultG3Elements.forEach((span, index) => {
            if (data.second <= (46 - index * 2)) {
                $(`#xsst-result-g3-${index}`).html(`<code>${data.result.g3[index]}</code>`)
            } else {
                $(`#xsst-result-g3-${index}`).html('<img src="../themes/images/loading2.gif" width="5%" />')
            }
        });

        // Giai 4
        const resultG4Elements = document.querySelectorAll('#result-g4 span');
        resultG4Elements.forEach((span, index) => {
            if (data.second <= (34 - index * 2)) {
                $(`#xsst-result-g4-${index}`).html(`<code>${data.result.g4[index]}</code>`)
            } else {
                $(`#xsst-result-g4-${index}`).html('<img src="../themes/images/loading2.gif" width="7%" />')
            }
        });

        // Giai 5
        const resultG5Elements = document.querySelectorAll('#result-g5 span');
        resultG5Elements.forEach((span, index) => {
            if (data.second <= (26 - index * 2)) {
                $(`#xsst-result-g5-${index}`).html(`<code>${data.result.g5[index]}</code>`)
            } else {
                $(`#xsst-result-g5-${index}`).html('<img src="../themes/images/loading2.gif" width="5%" />')
            }
        });

        // Giai 6
        const resultG6Elements = document.querySelectorAll('#result-g6 span');
        resultG6Elements.forEach((span, index) => {
            if (data.second <= (12 - index * 2)) {
                $(`#xsst-result-g6-${index}`).html(`<code>${data.result.g6[index]}</code>`)
            } else {
                $(`#xsst-result-g6-${index}`).html('<img src="../themes/images/loading2.gif" width="5%" />')
            }
        });

        // Giai 7
        const resultG7Elements = document.querySelectorAll('#result-g7 span');
        resultG7Elements.forEach((span, index) => {
            if (data.second <= (8 - index * 2)) {
                $(`#xsst-result-g7-${index}`).html(`<code>${data.result.g7[index]}</code>`)
            } else {
                $(`#xsst-result-g7-${index}`).html('<img src="../themes/images/loading2.gif" width="7%" />')
            }
        });

        if (data.second <= 0) {
            $('#xsst-result-gdb').html(`<code>${data.result.gdb}</code>`)
        } else {
            $('#xsst-result-gdb').html('<img src="../themes/images/loading2.gif" width="2%" />')
        }
    }
}

const loadResultOld = (data) => {

    $('#xsst-result-g1').html(`<code>${data.result.g1}</code>`)

    // Giai 2
    const resultG2Elements = document.querySelectorAll('#result-g2 span');
    resultG2Elements.forEach((span, index) => {
        $(`#xsst-result-g2-${index}`).html(`<code>${data.result.g2[index]}</code>`)
    });

    // Giai 3
    const resultG3Elements = document.querySelectorAll('#result-g3 span');
    resultG3Elements.forEach((span, index) => {
        $(`#xsst-result-g3-${index}`).html(`<code>${data.result.g3[index]}</code>`)

    });

    // Giai 4
    const resultG4Elements = document.querySelectorAll('#result-g4 span');
    resultG4Elements.forEach((span, index) => {
        $(`#xsst-result-g4-${index}`).html(`<code>${data.result.g4[index]}</code>`)

    });

    // Giai 5
    const resultG5Elements = document.querySelectorAll('#result-g5 span');
    resultG5Elements.forEach((span, index) => {
        $(`#xsst-result-g5-${index}`).html(`<code>${data.result.g5[index]}</code>`)

    });

    // Giai 6
    const resultG6Elements = document.querySelectorAll('#result-g6 span');
    resultG6Elements.forEach((span, index) => {
        $(`#xsst-result-g6-${index}`).html(`<code>${data.result.g6[index]}</code>`)

    });

    // Giai 7
    const resultG7Elements = document.querySelectorAll('#result-g7 span');
    resultG7Elements.forEach((span, index) => {
        $(`#xsst-result-g7-${index}`).html(`<code>${data.result.g7[index]}</code>`)

    });


    $('#xsst-result-gdb').html(`<code>${data.result.gdb}</code>`)

}


$(document).ready(function () {
    changeSizeHistoryPanel();

    $("#btn-choose").on("click", function () {
        $("#modal-choose").modal('show')
    })
    // Khi người dùng nhấp vào một phần tử có class bong_tron
    $(".bong_tron").click(function () {
        // Kiểm tra nếu phần tử đã có class active hay chưa
        if ($(this).hasClass("active")) {
            // Nếu đã có, xóa class active
            $(this).removeClass("active");
        } else {
            // Nếu chưa có, thêm class active
            $(this).addClass("active");
        }
    });

    $('#gameBet').on('change', function () {
        const selectedValue = $(this).val();
        $('#bet-amount').val('');
        $("#total-amount").val('')
        if (selectedValue) {
            $.get(`/api/v2/load-choice-xsst`, {game: selectedValue}, function (data) {
                $("#selection-ball").html(data.html);
                // $("#win-ratio").val('x' + data.game.ratio);
                $("#selected-number").html('');
            }).fail(function (error) {
                console.error('Error:', error);
            });
        } else {
            $("#selection-ball").html('<p class="text-white">Chọn game cược trước</p>');
            $("#value-bet").val('0');
            $("#win-ratio").val('0');
        }
    });

    $('#selection-ball').on('click', '.bong_tron', function () {
        const $this = $(this);
        const isActive = !$this.hasClass('active');
        if (isActive) {
            $this.addClass('active');
        } else {
            $this.removeClass('active');
        }

        const elements = document.querySelectorAll('.bong_tron.small.active');
        let html = ``;
        elements.forEach((element) => {
            html += `<span class="bong_tron small">${element.textContent}</span>`;
        });
        $("#selected-number").html(html);

    });

    const debounceTime = 500;
    let debounceTimer;

    // Xử lý khi form được submit
    // $('#cuoc-xsmb').submit(function (event) {
    //     // Xóa thông báo lỗi cũ
    //     $('#err-msg').html('');
    //     // Vô hiệu hóa nút submit
    //     $('input[type=submit]', this).attr('disabled', 'disabled');
    //     return true;
    // });

    // Xử lý khi nhấn nút sign
    $('#btn-bet-xsmb').click(function () {
        const gameType = $('#gameBet').val()
        let amount = $('input#bet-amount').val().replace(/,/g, '');
        const elements = document.querySelectorAll('.bong_tron.small.active');
        let number = [];
        elements.forEach((element) => {
            number.push(element.textContent);
        });

        axios.post("../xssieutoc", {amount, number, gameType}).then(res => {
            console.log(res);
            $('#modal-notes .comments__text').html(res.data.message);
            $('#modal-notes').modal('show');
            // if (res.data.success) {
            //     $('#seconds').html(`<img src="/themes/images/dice-loading.svg">`);
            //     $('#sbbal-txt').html(Intl.NumberFormat('en-US').format(res.data.balance));
            //     loadHistory(res.data);
            // }
        }).catch(err => {
            $('#seconds').html(``);
        })
    });

});
