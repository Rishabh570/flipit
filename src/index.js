const fs = require('fs');
const spdy = require('spdy'); // for HTTP2
const { port, env } = require('./config/vars');
const app = require('./config/express');
const mongoose = require('./config/mongoose');

// Open mongoose connection
mongoose.connect();

// HTTPS options
const options = {
	cert: fs.readFileSync('./src/config/https/cert.pem'),
	key: fs.readFileSync('./src/config/https/key.pem'),
};

// Create server
const server = spdy.createServer(options, app);


server.listen(port, () => {
	console.info(`--- 🌟  Started (${env}) at https://localhost:${port}`);
});


module.exports = app;
