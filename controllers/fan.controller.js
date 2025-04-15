const gameModel = require("../models/game.model");

const fanController = {
    index: async (req, res, next) => {
        try {
            let games = await gameModel.find({ display: 'show' }).lean();

            res.render('pages/fan', {games});
        } catch (e) {
            next(e);
        }
    },
    check : async (req, res, next) => {
        try {

        } catch (e) {
            console.log(e);
        }
    }
}

module.exports = fanController;
