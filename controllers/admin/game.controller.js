const moment = require('moment');
const gameModel = require('../../models/game.model');
const gameService = require('../../services/game.service');

const gameController = {
    index: async (req, res, next) => {
        try {
            let filters = {};
            let _sort = { updatedAt: 'desc' };

            if (req.query?.search) {
                filters.$or = [
                    {
                        name: { $regex: req.query.search }
                    },
                    {
                        gameType: { $regex: req.query.search }
                    },
                    {
                        description: { $regex: req.query.search }
                    },
                    {
                        display: { $regex: req.query.search == 'Hiển Thị' ? 'show' : 'hide' }
                    }
                ];
                res.locals.search = req.query.search;
            }

            if (req.query.hasOwnProperty('_sort')) {
                _sort = {
                    [req.query.column]: req.query._sort
                }
            }

            let games = await gameModel.find(filters).sort(_sort).lean();

            res.render('admin/game', { title: 'Quản Lý Mini Game', games })
        } catch (err) {
            console.log(err);
            next(err);
        }
    },
    add: async (req, res, next) => {
        try {
            let { gameType, name, description, display } = req.body;

            if (!name || !gameType || !description || !display) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập đầy đủ thông tin!'
                })
            }

            if (await gameModel.findOne({ gameType })) {
                return res.json({
                    success: false,
                    message: 'Loại game đã tồn tại, không được trùng!'
                })
            }

            let newGame = await new gameModel({
                name,
                gameType,
                description,
                display
            }).save();

            socket.emit('gameData', await gameService.getGame());
            res.json({
                success: true,
                message: 'Thêm thành công!',
                data: newGame
            })
        } catch (err) {
            next(err);
        }
    },
    update: async (req, res, next) => {
        try {
            let id = req.params.id;

            if (!await gameModel.findByIdAndUpdate(id, { $set: { ...req.body } })) {
                return res.json({
                    success: false,
                    message: 'Không tìm thấy #' + id
                })
            }

            socket.emit('gameData', await gameService.getGame());
            res.json({
                success: true,
                message: 'Lưu thành công #' + id
            })
        } catch (err) {
            next(err);
        }
    },
    remove: async (req, res, next) => {
        try {
            let id = req.params.id;

            if (!await gameModel.findByIdAndDelete(id)) {
                return res.json({
                    success: false,
                    message: 'Không tìm thấy #' + id
                })
            }

            socket.emit('gameData', await gameService.getGame());
            res.json({
                success: true,
                message: 'Xóa thành công #' + id
            })
        } catch (err) {
            next(err);
        }
    }
}

module.exports = gameController;