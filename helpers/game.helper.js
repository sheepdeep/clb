const gameService = require('../services/game.service');
const momoService = require('../services/momo.service');
const rewardModel = require('../models/reward.model');

exports.checkWin = async (phone, amount, transId, comment) => {
    try {
        comment = comment ? comment.replace(/^\s+|\s+$/gm, '') : comment;
        // comment = String(amount).slice(-2);
        let checkVaild = await gameService.checkGame(comment);

        if (!checkVaild.gameName) {
            return ({
                gameName: null,
                gameType: null,
                status: 'errorComment',
                win: false,
                won: false,
                bonus: 0
            })
        }

        let { gameName, gameType } = checkVaild;
        let rewardData = await rewardModel.find({ content: { $regex: `^${comment}$`, $options: 'i' } });
        let result, paid, win = false, won = false, bonus = 0;

        for (let rewardContent of rewardData) {
            let { numberTLS, resultType, amount } = rewardContent;
            let id = String(transId);

            resultType.includes("count_") && (id = String(transId).slice(-Number(resultType.replace(/[^\d]/g, ""))).split("").reduce((count, value) => count + Number(value), 0)), resultType.includes("minus_") && (id = String(transId).slice(-Number(resultType.replace(/[^\d]/g, ""))).split("").reduce((count, value) => count - Number(value), 0));

            for (let i = 0; i < numberTLS.length; i++) {
                let number = String(numberTLS[i]);
                if (resultType == 'end' && id.slice(-number.length) == number || resultType != 'end' && id == number){
                    bonus = amount, win = true;
                    break;
                }
            }
        }

        result = win ? 'win' : 'lose';
        paid = win ? 'wait' : 'done';
        !win && (won = true);
        await momoService.limitBet(phone, amount) && (result = "exceed");

        return {
            gameName,
            gameType,
            result,
            paid,
            win,
            won,
            bonus
        }

    } catch (err) {
        console.log(err);
        return ({
            gameName: null,
            gameType: null,
            result: null,
            paid: null,
            win: false,
            won: false,
            bonus: 0
        })
    }
}