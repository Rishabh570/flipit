/**
 * @extends Error
 * Creates an App level error
 */
class AppError extends Error {
	constructor(message, statusCode, isOperational, stack) {
		super(message);

		this.name = this.constructor.name;
		this.statusCode = statusCode;
		this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
		this.stack = stack;
		/**
		 * For operational errors:
		 * 1. Actual error message is shown to the user
		 * 2. It is not pushed to sentry.
		 *
		 * For non-operational/programmatical errors:
		 * 1. Users are only shown generic notification ('Something went wrong!')
		 * 2. Actual error is pushed to sentry
		 */
		this.isOperational = isOperational;

		Error.captureStackTrace(this, this.constructor);
	}
}

module.exports = AppError;
