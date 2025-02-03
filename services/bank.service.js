const bankModel = require("../models/bank.model");
const momoService = {
    limitBet: async (accountNumber, amount) => {
        try {
            let dataBank = await bankModel.findOne({accountNumber});

            console.log(`${accountNumber}: ${amount} > ${dataBank.betMax}: ${amount > dataBank.betMax} hoặc ${amount} < ${dataBank.betMin}: ${amount < dataBank.betMin}`)

            return amount > dataBank.betMax || amount < dataBank.betMin;
        } catch (err) {
            console.log(err);
            return false;
        }
    },
}

module.exports = momoService;