const gameModel = require("../models/game.model");
const bankModel = require("../models/bank.model");

const taixiuController = {
    index: async (req, res, next) => {
        try {
            let games = await gameModel.find({display: 'show'}).lean();

            res.render('pages/phongtx', {games});
        } catch (e) {
            next(e);
        }
    }
}

module.exports = taixiuController;