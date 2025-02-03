const crypto = require('crypto');

const securityHelper = {
    encrypt: async (text) => {
        const secretKey = 'FE81ZPW4SH8VE0XMDXUZ2UC68HC9WB65';  // 32 bytes cho AES-256
        const iv = crypto.randomBytes(16);  // Initialization vector (16 bytes)

        const algorithm = 'aes-256-cbc';

        const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv);
        let encrypted = cipher.update(text, 'utf-8', 'base64');
        encrypted += cipher.final('base64');
        return encrypted + ":" + iv.toString('base64'); // Trả về Base64 và IV
    },
}

module.exports = securityHelper;