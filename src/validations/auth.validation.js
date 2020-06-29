const { body } = require('express-validator');

exports.validate = (method) => {
	switch (method) {
		case 'registerPOST': {
			return [
				body('email', 'Invalid email').exists().isEmail(),
				body('password').exists().isLength({ min: 6, max: 128 })
			];
		}
		case 'loginPOST': {
			return [
				body('email', 'Invalid email').exists().isEmail(),
				body('password').exists().isLength({ min: 6, max: 128 })
			];
		}
		case 'setPasswordPOST': {
			return [
				body('_csrf', 'Invalid CSRF token').exists(),
				body('password').exists().isLength({ min: 6, max: 128 }),
				body('confirmPassword').exists().isLength({ min: 6, max: 128 })
			];
		}
		case 'changePasswordPOST': {
			return [
				body('_csrf', 'Invalid CSRF token').exists(),
				body('currentPassword').exists().isLength({ min: 6, max: 128 }),
				body('newPassword').exists().isLength({ min: 6, max: 128 }),
				body('confirmNewPassword')
					.exists()
					.isLength({ min: 6, max: 128 })
			];
		}
		case 'resetPasswordPOST': {
			return [
				body('_csrf', 'Invalid CSRF token').exists(),
				body('password').exists().isLength({ min: 6, max: 128 }),
				body('confirmPassword').exists().isLength({ min: 6, max: 128 })
			];
		}
		case 'forgotPasswordPOST': {
			return [
				body('_csrf', 'Invalid CSRF token').exists(),
				body('email', 'Invalid email').exists().isEmail()
			];
		}
	}
};
