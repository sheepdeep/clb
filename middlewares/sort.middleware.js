"use strict";

const tableSort = async (req, res, next) => {
    res.locals._sort = {
        column: 'updatedAt',
        type: 'desc'
    }

    if (req.query.hasOwnProperty('_sort')) {
        res.locals._sort.column = req.query.column
        res.locals._sort.type = req.query._sort
    }

    next();
};

module.exports = tableSort;