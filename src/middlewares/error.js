const Sentry = require('@sentry/node');
// const { env } = require('../config/vars');
const AppError = require('../utils/error.utils');

const errorHandler = (err, req, res, next) => {
	console.log('>>>> In errorHandler, err = ', err);

	/**
	 * Non-operational errors are programming errors
	 * Send these types of errors to sentry
	 */
	if (!err.isOperational) {
		Sentry.captureException(err);
	}
	next();
};
exports.errorHandler = errorHandler;

exports.stagingError = (err, req, res, next) => {
	console.log('>>>> STAGING ERR, err = ', err);

	// Not an AppError? Convert it.
	if (err.name === 'ValidationError') {
		const stagedErr = new AppError({
			name: 'ValidationError',
			message: err.message,
			statusCode: err.statusCode,
			stack: err.stack,
		});
		return errorHandler(stagedErr, req, res, next);
	} else if (!(err instanceof AppError)) {
		const stagedErr = new AppError({
			message: err.message,
			statusCode: err.status,
			stack: err.stack,
		});
		return errorHandler(stagedErr, req, res, next);
	}
	return errorHandler(err, req, res, next);
};
