(function (window, document, undefined) {
    'use strict';

    /*==============================
    Header
    ==============================*/
    if (document.querySelector('.header')) {
        const headerBtn = document.querySelector('.header__btn');
        const headerNav = document.querySelector('.sidebar');

        function toggleHeaderMenu() {
            headerBtn.classList.toggle('header__btn--active');
            headerNav.classList.toggle('sidebar--active');
        }

        headerBtn.addEventListener('click', toggleHeaderMenu);
    }

    /*==============================
    Scrollbar
    ==============================*/
    var Scrollbar = window.Scrollbar;

    if (document.querySelector('.dashbox__table-bank-infos')) {
        Scrollbar.init(document.querySelector('.dashbox__table-bank-infos'), {
            damping: 0.1,
            renderByPixels: true,
            alwaysShowTracks: true,
            continuousScrolling: true
        });
    }

    if (document.querySelector('#recently-histories')) {
        Scrollbar.init(document.querySelector('#recently-histories'), {
            damping: 0.1,
            renderByPixels: true,
            alwaysShowTracks: true,
            continuousScrolling: true
        });
    }


    if (document.querySelector('.dashbox__table-wrap-win-games')) {
        Scrollbar.init(document.querySelector('.dashbox__table-wrap-win-games'), {
            damping: 0.1,
            renderByPixels: true,
            alwaysShowTracks: true,
            continuousScrolling: true
        });
    }

    if (document.querySelector('.dashbox__table-wrap--4')) {
        Scrollbar.init(document.querySelector('.dashbox__table-wrap--4'), {
            damping: 0.1,
            renderByPixels: true,
            alwaysShowTracks: true,
            continuousScrolling: true
        });
    }
    if (document.querySelector('.vip-privilege')) {
        Scrollbar.init(document.querySelector('.vip-privilege'), {
            damping: 0.1,
            renderByPixels: true,
            alwaysShowTracks: true,
            continuousScrolling: true
        });
    }
    if (document.querySelector('.sidebar__nav')) {
        Scrollbar.init(document.querySelector('.sidebar__nav'), {
            damping: 0.1,
            renderByPixels: true,
            alwaysShowTracks: false,
            continuousScrolling: true
        });
    }

    /*==============================
    Filter
    ==============================*/
    if (document.querySelector('.sign__selectjs')) {
        new SlimSelect({
            select: '.sign__selectjs',
            settings: {
                showSearch: true,
            }
        });
    }
    /*==============================
    Upload
    ==============================*/
    if (document.getElementById('sign__gallery-upload')) {
        var galleryUpload = document.getElementById('sign__gallery-upload');

        galleryUpload.addEventListener('change', function(event) {
            var length = event.target.files.length;
            var galleryLabel = galleryUpload.getAttribute('data-name');
            var label = document.querySelector(galleryLabel);

            if (length > 1) {
                label.textContent = length + " files selected";
            } else {
                label.textContent = event.target.files[0].name;
            }
        });
    }

    /*==============================
    Section bg
    ==============================*/
    if (document.querySelector('.section--bg')) {
        var mainBg = document.querySelector('.section--bg');

        if (mainBg.getAttribute('data-bg')) {
            mainBg.style.background = `url(${mainBg.getAttribute('data-bg')})`;
            mainBg.style.backgroundPosition = 'center center';
            mainBg.style.backgroundRepeat = 'no-repeat';
            mainBg.style.backgroundSize = 'cover';
        }
    }

})(window, document);
$(document).on("click", ".show-notes", function (e) {
    e.preventDefault();
    var data = $(this).attr("data-content");
    $('#modal-notes .comments__text').html(data);
});
$(document).on("click", ".img-pop", function (e) {
    e.preventDefault();
    var data = $(this).attr("data-content");
    $('#modal-notes .comments__text').html('<img src="' + $(this).attr('href') + '" />');
})
$(document).on("click", ".show-bill", function () {
    var bc = $(this).attr('data-bt');
    if (bc != 'MB') {
        $('.bill-frame').css('max-width', '390px');
    }
    else {
        $('.bill-frame').css('max-width', '1360px');
    }
    $('#show-bill-ifr').attr('src', "/showbankbill/?d=" + $(this).attr('data-bi'));
    $('#ifr-bill-panel').fadeIn(300);
})
$(document).on("click", ".close-bill-frame", function () {
    $('#show-bill-ifr').attr('src', 'about:blank');
    $('#ifr-bill-panel').fadeOut(300);
});
$(document).on("click", ".sidebar__user-btn", function () {
    window.location.href = '/dangxuat';
});
var qrCode;
function loadQR(data, img, bgc) {
    qrCode = new QRCodeStyling({
        width: 200,
        height: 200,
        data: data,
        image: img,
        dotsOptions: { color: bgc, type: "rounded" },
        backgroundOptions: { color: "#FFF" },
        imageOptions: { crossOrigin: "anonymous", margin: 5, imageSize: 0.5 },
    });
    $("#canvasQr").html(""), qrCode.append(document.getElementById("canvasQr"));
}
$(document).on("click", ".qrc", function () {
    var bankCode = $(this).attr('data-bankcode');
    var bgc = "#11089c";
    if (bankCode == '970436') {
        bgc = "#136c3d";
    }
    else if (bankCode == "970418") {
        bgc = "#046c6c";
    }
    else if (bankCode == "970407") {
        bgc = "#f01c24";
    }
    else if (bankCode == "970415") {
        bgc = "#93d5f6";
    }
    else if (bankCode == "970416") {
        bgc = "#0070FF";
    }
    else if (bankCode == "9902") {
        bgc = "#008fe5";
    }
    else if (bankCode == "9903") {
        bgc = "#c86b9f";
    }
    else if (bankCode == "9901") {
        bgc = "#000";
    }
    var img = window.location.protocol + '//' + window.location.host + '/assets/images/extra/' + bankCode + '.png';
    var data = $(this).attr('data-content');
    var md = $('#qr-download').attr("mobile-device");
    if (bankCode == "ZLP") {
        $('.qr-notes').show();
    }
    else {
        $('.qr-notes').hide();
    }
    if (bankCode == "ZLP" && md == "1") {
        $('#qr-download').text('Thanh Toán Ngay').attr("data-content", data);
    }
    else {
        $('#qr-download').text('Tải QrCode về máy').attr("data-content", "");
    }
    loadQR(data, img, bgc);
});
$(document).on("click", "#qr-download", function () {
    var data = $(this).attr("data-content");
    if (data) {
        window.location.href = data;
    }
    else {
        qrCode.download({
            extension: "png",
            name: "qrcode"
        })
    }
});
$(document).on("click", ".resend-reward", function () {
    var pr = $(this).parent();
    pr.html('<span><img src="/Content/loading.gif" style="height: 13px;vertical-align: middle;" alt="loading ..." /></span>');
    gh = false;
    $.post("/home/resendreward/?d=" + $(this).attr('data-bi')).always(function () {
        pr.html('<span class="gstatus wait">WAIT</span>');
        gh = true;
    });
});
$(window).on('load', function () {
    $('.preloader').fadeOut(500);
    $('.preloader1').fadeOut(500);
});
function showLoader() {
    $('.preloader').fadeIn(500);
}
$(window).on('beforeunload', function () {
    showLoader();
});
$(window).on('pagehide', function () {
    $('.preloader').fadeOut(500);
});
$(window).on('unload', function () {
    $('.preloader').fadeOut(500);
});

const emojiMap = {
    ":)": "😊", ":D": "😁", ":(": "😞", ":P": "😛", ";)": "😉", ":O": "😮", ":|": "😐", ":'(": "😢", ":*": "😘", "XD": "😆", "B)": "😎", ">:(": "😠", "O_O": "😳", "3:)": "😈", ":3": "😺", "<3": "❤️", ":@": "😡", "D:": "😱", ":$": "😳", ":-/": "😕", ":]": "😃", ">:D": "😈", "xD": "😆", ":>": "😏", "^_^": "😊", "-_-": "😑", "8)": "😎", ":v": "😂", ":L": "😕", ":S": "😖", ":'D": "😂", "<\\3": "💔", ":X": "😶", ">:O": "😲", ":^)": "😊", ">.<": "😣", ">_>": "😒", ":smile:": "😄", ":laughing:": "😆", ":blush:": "😊", ":heart_eyes:": "😍", ":kissing_heart:": "😘", ":flushed:": "😳", ":grin:": "😁", ":wink:": "😉", ":stuck_out_tongue:": "😛", ":stuck_out_tongue_winking_eye:": "😜", ":fearful:": "😨", ":weary:": "😩", ":sob:": "😭", ":joy:": "😂", ":rage:": "😡", ":sleeping:": "😴", ":mask:": "😷", ":poop:": "💩", ":thumbsup:": "👍", ":thumbsdown:": "👎", ":clap:": "👏", ":muscle:": "💪", ":pray:": "🙏", ":fire:": "🔥", ":100:": "💯", ":ok_hand:": "👌", ":raised_hands:": "🙌", ":wave:": "👋", ":eyes:": "👀", ":crown:": "👑", ":trophy:": "🏆", ":medal:": "🎖", ":balloon:": "🎈", ":gift:": "🎁", ":confetti_ball:": "🎊", ":sparkles:": "✨", ":boom:": "💥", ":star:": "⭐", ":sunny:": "☀️", ":zap:": "⚡", ":umbrella:": "☔", ":snowflake:": "❄️", ":cloud:": "☁️", ":rainbow:": "🌈", ":crescent_moon:": "🌙", ":heart:": "❤️", ":yellow_heart:": "💛", ":green_heart:": "💚", ":blue_heart:": "💙", ":purple_heart:": "💜", ":broken_heart:": "💔", ":heartbeat:": "💓", ":star2:": "🌟", ":sunflower:": "🌻", ":rose:": "🌹", ":hibiscus:": "🌺", ":cherry_blossom:": "🌸", ":bouquet:": "💐", ":fallen_leaf:": "🍂", ":leaves:": "🍃", ":maple_leaf:": "🍁", ":cactus:": "🌵", ":palm_tree:": "🌴", ":tulip:": "🌷", ":herb:": "🌿", ":shamrock:": "☘️", ":four_leaf_clover:": "🍀"
};
function debounce(func, delay) {
    let debounceTimer;
    return function () {
        const context = this;
        const args = arguments;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(context, args), delay);
    };
}
function replaceEmojis(text) {
    for (let key in emojiMap) {
        text = text.replace(key, emojiMap[key]);
    }
    return text;
}
const handleInputEmojis = debounce(function (inputBox) {
    let currentText = inputBox.value;
    let newText = replaceEmojis(currentText);
    inputBox.value = newText;
}, 300);