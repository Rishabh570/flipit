// const { env } = require('../config/vars');
const AppError = require('../utils/error.utils');

const errorHandler = (err, req, res, next) => {
	console.log('>>>> In errorHandler, err = ', err);
	// Do something here...
	next();
};
exports.errorHandler = errorHandler;

exports.stagingError = (err, req, res, next) => {
	console.log('>>>> STAGING ERR, err = ', err);

	// Not an AppError? Convert it.
	if (!(err instanceof AppError)) {
		const stagedErr = new AppError({
			message: err.message,
			statusCode: err.status,
			stack: err.stack,
		});
		return errorHandler(stagedErr, req, res, next);
	}
	return errorHandler(err, req, res, next);
};
