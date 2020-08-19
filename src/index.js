'use-strict';
const fs = require('fs');
const spdy = require('spdy'); // for HTTP2
const { port, env } = require('./config/vars');
const app = require('./config/express');
const mongoose = require('./config/mongoose');
const { setup } = require('./services/socket');

// Open mongoose connection
mongoose.connect();

// HTTPS options
const options = {
	cert: fs.readFileSync('./src/config/https/cert.pem'),
	key: fs.readFileSync('./src/config/https/key.pem'),
};

// Create server
const server = spdy.createServer(options, app);

// Set up sockets
setup(server);

server.listen(port, () => {
	console.info(`--- 🌟  Started (${env}) at https://localhost:${port}`);
});

module.exports = app;
