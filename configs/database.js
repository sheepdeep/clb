const mongoose = require('mongoose');

let isConnected = false; // Biến để kiểm tra trạng thái kết nối

const connectDB = async () => {
    if (isConnected) {
        // console.log('Đã kết nối trước đó. Dùng kết nối hiện tại.');
        return mongoose.connection;
    }

    try {
        mongoose.set('strictQuery', true);
        const conn = await mongoose.connect(process.env.MONGODB_URL, {
            useUnifiedTopology: true,
            useNewUrlParser: true,
        });
        isConnected = conn.connections[0].readyState === 1;  // 1 = connected
        // console.log(`Kết nối MongoDB thành công: ${conn.connection.host}`);
        return conn.connection;
    } catch (err) {
        console.error('Kết nối MongoDB thất bại:', err);
        process.exit(1);
    }
};

module.exports = {connectDB};
