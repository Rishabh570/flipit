const { Joi } = require('express-validation');

module.exports = {
	// POST /v1/auth/register
	register: {
		body: Joi.object({
			_csrf: Joi.string().required(),
			email: Joi.string().email().required(),
			password: Joi.string().required().min(6).max(128),
		}),
	},

	// POST /v1/auth/login
	login: {
		body: Joi.object({
			_csrf: Joi.string().required(),
			email: Joi.string().email().required(),
			password: Joi.string().required().max(128),
		}),
	},

	// POST /v1/auth/google
	oAuth: {
		body: Joi.object({
			idtoken: Joi.string().required(),
		}),
	},

	// POST /v1/auth/password/set
	setPassword: {
		body: Joi.object({
			_csrf: Joi.string().required(),
			password: Joi.string().required(),
			confirmPassword: Joi.string().required(),
		}),
	},

	// POST /v1/auth/password/change
	changePassword: {
		body: Joi.object({
			_csrf: Joi.string().required(),
			currentPassword: Joi.string().required(),
			newPassword: Joi.string().required(),
			confirmNewPassword: Joi.string().required(),
		}),
	},

	// POST /v1/auth/forgot-password
	forgotPassword: {
		body: Joi.object({
			_csrf: Joi.string().required(),
			email: Joi.string().email().required(),
		}),
	},

	// POST /v1/auth/password/reset/:token
	resetPassword: {
		body: Joi.object({
			_csrf: Joi.string().required(),
			password: Joi.string().required(),
			confirmPassword: Joi.string().required().min(6).max(128),
		}),
	},
};
