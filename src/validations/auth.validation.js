'use-strict';
const { body } = require('express-validator');

exports.validate = (method) => {
	switch (method) {
		case 'registerPOST': {
			return [
				body('email', 'Invalid email')
					.exists()
					.isEmail()
					.trim()
					.escape()
					.normalizeEmail(),
				body('password')
					.exists()
					.trim()
					.escape()
					.isLength({ min: 6, max: 64 }),
			];
		}
		case 'loginPOST': {
			return [
				body('email', 'Invalid email')
					.exists()
					.isEmail()
					.trim()
					.normalizeEmail(),
				body('password')
					.exists()
					.trim()
					.escape()
					.isLength({ min: 6, max: 64 }),
			];
		}
		case 'setPasswordPOST': {
			return [
				body('_csrf', 'Invalid CSRF token').exists(),
				body('password')
					.exists()
					.trim()
					.escape()
					.isLength({ min: 6, max: 64 }),
				body('confirmPassword')
					.exists()
					.trim()
					.escape()
					.isLength({ min: 6, max: 64 }),
			];
		}
		case 'changePasswordPOST': {
			return [
				body('_csrf', 'Invalid CSRF token').exists(),
				body('currentPassword')
					.exists()
					.trim()
					.escape()
					.isLength({ min: 6, max: 64 }),
				body('newPassword')
					.exists()
					.trim()
					.escape()
					.isLength({ min: 6, max: 64 }),
				body('confirmNewPassword')
					.exists()
					.trim()
					.escape()
					.isLength({ min: 6, max: 64 }),
			];
		}
		case 'resetPasswordPOST': {
			return [
				body('_csrf', 'Invalid CSRF token').exists(),
				body('password')
					.exists()
					.trim()
					.escape()
					.isLength({ min: 6, max: 64 }),
				body('confirmPassword')
					.exists()
					.trim()
					.escape()
					.isLength({ min: 6, max: 64 }),
			];
		}
		case 'forgotPasswordPOST': {
			return [
				body('_csrf', 'Invalid CSRF token').exists(),
				body('email', 'Invalid email')
					.exists()
					.isEmail()
					.trim()
					.escape()
					.normalizeEmail(),
			];
		}
	}
};
