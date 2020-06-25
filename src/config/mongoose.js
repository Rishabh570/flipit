const mongoose = require('mongoose');
const { mongo, env } = require('./vars');
const PROCESS_EXIT_FAIL = -1;

// Exit application on error
mongoose.connection.on('error', (err) => {
	console.error(`MongoDB connection error: ${err}`);
	process.exit(PROCESS_EXIT_FAIL);
});

// print mongoose logs in dev env
if (env === 'development') {
	mongoose.set('debug', true);
}

/**
 * Connect to mongo db
 */
exports.connect = () => {
	mongoose.connect(mongo.uri, {
		keepAlive: 1,
		useNewUrlParser: true,
	});
	return mongoose.connection;
};
