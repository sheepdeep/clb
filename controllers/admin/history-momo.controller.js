const momoModel = require('../../models/momo.model');
const momoHelper = require('../../helpers/momo.helper');


const historyMomoController = {
    checkTrans: async (req, res, next) => {
        const momoData = await momoModel.findOne({}).lean();
        if (req.query?.transId) {
            const transId = req.query.transId;

            return res.json(await momoHelper.getDetails(momoData.phone, transId, 'transfer_aioqr'));
        }

        return res.json(await momoHelper.getHistory(momoData.phone));
    }
}

module.exports = historyMomoController;
