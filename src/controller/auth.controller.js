'use-strict';
const jwt = require('jsonwebtoken');
const httpStatus = require('http-status');
const { validationResult } = require('express-validator');
const { User, RefreshToken } = require('../models/index');
const { sendEmail, forgotPasswordEmail } = require('../utils/email.utils');
const { BASE_URL, JWT_SECRET } = require('../config/vars');
const AppError = require('../utils/error.utils');

/**
 * Validation utility
 */
const handleValidation = (req) => {
	const validationErrors = validationResult(req);
	if (!validationErrors.isEmpty()) {
		throw new AppError(
			'Please enter valid details!',
			httpStatus.BAD_REQUEST,
			true
		);
	}
};

/**
 * Register user controller.
 */
exports.registerGET = (req, res) => {
	res.render('register');
};

exports.registerPOST = async (req, res, next) => {
	try {
		// Check for validation errors first
		handleValidation(req);

		req.body.name = req.body.email.split('@')[0];
		await new User(req.body).save();
		req.flash('notification', 'Successfully registered, please login 🙂');
		res.redirect('/v1/auth/login');
	} catch (error) {
		const finalErr = User.checkDuplicateEmail(error);
		next(finalErr);
		req.flash('notification', finalErr.message);
		res.redirect('/v1/auth/register');
	}
};

/**
 * Login controller.
 * If access token is expired and present in cookie,
 * re-generate a fresh access token and refresh token
 */
exports.loginGET = async (req, res) => {
	const { token } = req.cookies;
	if (token === undefined || token === null) {
		return res.render('login');
	}
	const payload = jwt.decode(token);
	const refreshObject = await RefreshToken.findOneAndRemove({
		userId: payload.sub,
	});

	const { user, accessToken } = await User.findAndGenerateToken({
		email: refreshObject.userEmail,
		refreshObject,
	});

	await RefreshToken.generate(user); // Save new refresh token obj to DB
	res.cookie('token', accessToken); // Set the newly generated token in the cookie
	res.redirect('/v1/listings');
};

exports.loginPOST = async (req, res, next) => {
	try {
		// Check for validation errors first
		handleValidation(req);

		const { user, accessToken } = await User.findAndGenerateToken(req.body);
		await RefreshToken.generate(user); // Creates and stores a refresh token in user db

		res.cookie('token', accessToken); // Put the token in cookies
		req.flash('notification', 'Successfully logged in 🙂');
		res.redirect('/v1/listings');
	} catch (error) {
		next(error);
		req.flash('notification', error.message);
		res.redirect('/v1/auth/login');
	}
};

/**
 * Logout controller.
 */
exports.logout = (req, res) => {
	res.cookie('token', req.cookies.token, { maxAge: 0 });
	req.session = null;
	req.logout();
	res.redirect('/v1');
};

/**
 * Set password controller.
 * This is not directly accessible to the users,
 * only through change password
 */
exports.setPasswordGET = async (req, res) => {
	const { user } = req;
	res.render('set-password', { user });
};

exports.setPasswordPOST = async (req, res, next) => {
	const { password, confirmPassword } = req.body;
	try {
		// Check for validation errors first
		handleValidation(req);

		if (password !== confirmPassword) {
			throw new AppError(
				"⚠️ Passwords don't match, please try again.",
				httpStatus.BAD_REQUEST,
				true
			);
		} else {
			const currentUser = req.user;
			currentUser.password = password;
			await currentUser.save();
			req.flash('notification', 'Password set successfully 🙂');
			res.redirect('/v1/listings');
		}
	} catch (error) {
		next(error);
		req.flash('notification', error.message);
		res.redirect('/v1/auth/password/set');
	}
};

/**
 * Change password controller.
 */
exports.changePasswordGET = async (req, res) => {
	const { user } = req;

	// If user has signed-up using OAuth strategy,
	// then redirect the user to set his local password
	// because it is not set yet. (DEFAULT PASS: email)
	if (await user.passwordMatches(user.email)) {
		req.flash(
			'notification',
			'No password set, please set a new password.'
		);
		res.redirect('/v1/auth/password/set');
	} else {
		res.render('change-password', { user });
	}
};

exports.changePasswordPOST = async (req, res, next) => {
	const { currentPassword, newPassword, confirmNewPassword } = req.body;
	const user = req.user;
	try {
		// Check for validation errors first
		handleValidation(req);

		if (await user.passwordMatches(currentPassword)) {
			if (newPassword !== confirmNewPassword) {
				throw new AppError(
					"⚠️ New passwords don't match! Please try again 😟",
					httpStatus.UNAUTHORIZED,
					true
				);
			} else {
				user.password = newPassword;
				await user.save();
				req.flash('notification', 'Successfully changed password 🙂');
				res.redirect('/v1/listings');
			}
		} else {
			throw new AppError(
				'Current password is incorrect 😟',
				httpStatus.UNAUTHORIZED,
				true
			);
		}
	} catch (error) {
		next(error);
		req.flash('notification', error.message);
		res.redirect('/v1/auth/password/change');
	}
};

/**
 * Reset Password controller.
 */
exports.resetPasswordGET = async (req, res, next) => {
	const { token } = req.params;
	try {
		await jwt.verify(token, JWT_SECRET, (err, payload) => {
			if (err || payload === null) {
				throw new AppError(
					'The reset password link has either expired or is invalid 😟',
					httpStatus.BAD_REQUEST,
					true
				);
			}
			const UrlPost = `/v1/auth/password/reset/${token}`;
			res.render('reset-password', { url: UrlPost });
		});
	} catch (error) {
		next(error);
		req.flash('notification', error.message);
		res.redirect('/v1/auth/login');
	}
};

exports.resetPasswordPOST = async (req, res, next) => {
	const { token } = req.params;
	const { password, confirmPassword } = req.body;
	try {
		// Check for validation errors first
		handleValidation(req);

		await jwt.verify(token, JWT_SECRET, async (err, payload) => {
			if (err || payload === null) {
				throw new AppError(
					'The reset password link has either expired or is invalid 😟',
					httpStatus.BAD_REQUEST,
					true
				);
			}

			if (password !== confirmPassword) {
				throw new AppError(
					"Passwords don't match",
					httpStatus.UNAUTHORIZED,
					true
				);
			} else {
				const user = await User.findById(payload.sub);
				if (!user) {
					throw new AppError(
						'No matching user found!',
						httpStatus.NOT_FOUND,
						true
					);
				}

				user.password = password;
				await user.save();
				req.flash('notification', 'Password reset successful 🙂');
				res.redirect('/v1/auth/login');
			}
		});
	} catch (error) {
		next(error);
		req.flash('notification', error.message);
		res.redirect(`/v1/auth/password/reset/${token}`);
	}
};

/**
 * Forgot password controller.
 */
exports.forgotPasswordGET = (req, res) => res.render('forgot-password');

exports.forgotPasswordPOST = async (req, res, next) => {
	const { email } = req.body;
	try {
		// Check for validation errors first
		handleValidation(req);

		const user = await User.findOne({ email });
		if (!user) {
			throw new AppError(
				'User with this email does not exist!',
				httpStatus.NOT_FOUND,
				true
			);
		}

		// Generate a password reset link and mail it to user
		const { name } = user;
		const resetPassToken = user.resetToken();
		const passResetLink = `${BASE_URL}/v1/auth/password/reset/${resetPassToken}`;

		req.flash(
			'notification',
			'Password reset link has been sent to your registered email 🙂'
		);
		res.redirect('/v1/auth/login');
		await sendEmail(forgotPasswordEmail({ name, email, passResetLink }));
	} catch (error) {
		next(error);
		req.flash('notification', error.message);
		res.redirect('/v1/auth/login');
	}
};

exports.confirmAction = async (req, res, next) => {
	const { user } = req;
	const { password } = req.body;
	try {
		if (await user.passwordMatches(password)) {
			return res.status(200).send('ok');
		}
		return res.status(httpStatus['BAD_REQUEST']).send('failed');
	} catch (err) {
		next(err);
	}
};

/**
 * OAuth login controller.
 * Creates a new user in DB if doesn't exist.
 */
exports.oAuth = async (req, res, next) => {
	const { user } = req;
	try {
		const accessToken = user.token();
		await RefreshToken.generate(user);

		res.cookie('token', accessToken); // Put the access token in the cookie
		next();
	} catch (error) {
		next(error);
		req.flash('notification', error.message);
		res.redirect('/v1/auth/login');
	}
};

/**
 * Disconnects the linked Google account
 */
// exports.disconnectGoogle = async (req, res, next) => {
// 	const { user } = req;
// 	try {
// 		const userObj = await User.findById(user.id);
// 		userObj.google = { profileId: null, email: null };
// 		await userObj.save();
// 		res.redirect('/v1/listings');
// 	} catch (error) {
// 		const finalErr = new AppError(
// 			'Something went wrong during the unlinking of Google account!',
// 			httpStatus.INTERNAL_SERVER_ERROR,
// 			false
// 		);
// 		next(finalErr);
// 		req.flash('notification', finalErr.message);
// 		res.redirect('/v1/listings');
// 	}
// };

/**
 * Disconnects the linked Facebook account
 */
// exports.disconnectFacebook = async (req, res, next) => {
// 	const { user } = req;
// 	try {
// 		const userObj = await User.findById(user.id);
// 		userObj.facebook = { profileId: null, email: null };
// 		await userObj.save();
// 		res.redirect('/v1/listings');
// 	} catch (error) {
// 		const finalErr = new AppError(
// 			'Something went wrong during the unlinking of Facebook account!',
// 			httpStatus.INTERNAL_SERVER_ERROR,
// 			false
// 		);
// 		next(finalErr);
// 		req.flash('notification', finalErr.message);
// 		res.redirect('/v1/listings');
// 	}
// };

/**
 * Redirects to home page (currently /v1/listings)
 */
exports.redirectLoggedIn = (req, res) => {
	req.flash('notification', 'Successfully logged in 🙂');
	res.redirect('/v1/listings');
};
