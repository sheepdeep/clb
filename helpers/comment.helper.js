const moment = require('moment');

exports.dataComment = async (content, commentData) => {
    const regex = /\{(.*?)\}/g;
    const matches = content.matchAll(regex);

    for (const match of matches) {
        let data = commentData.find(e => e.name === match[1]);

        data && (content = content.replace(match[0], data.value));
    }

    return content;
}