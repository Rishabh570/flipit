const winston = require('winston');
const appRoot = require('app-root-path');

// Define the custom settings for each transport (file, console)
const options = {
	file: {
		level: 'info',
		filename: `${appRoot}/logs/app.log`,
		handleExceptions: true,
		json: true,
		maxsize: 5242880, // 5MB
		maxFiles: 5,
		colorize: false,
	},
	console: {
		level: 'debug',
		handleExceptions: true,
		json: false,
		colorize: true,
	},
};

// Create a Winston Logger
const logger = winston.createLogger({
	transports: [
		new winston.transports.File(options.file),
		new winston.transports.Console(options.console),
	],
	exitOnError: false,
});

// Create a stream object with a 'write' function that will be used by Morgan
logger.stream = {
	write: function (message) {
		// use the 'info' log level so the output will be picked up
		// by both transports (file and console) (see priority table)
		logger.info(message);
	},
};

// EXPORTS
module.exports = logger;
