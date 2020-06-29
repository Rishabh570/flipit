const jwt = require('jsonwebtoken');
const httpStatus = require('http-status');
const moment = require('moment-timezone');
const { User, RefreshToken } = require('../models/index');
const { sendEmail, forgotPasswordEmail } = require('../utils/email.utils');
const { BASE_URL } = require('../config/vars');
const AppError = require('../utils/error.utils');

/**
 * Register user controller.
 */
exports.registerGET = (req, res) => {
	res.render('register');
};

exports.registerPOST = async (req, res, next) => {
	try {
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
 */
exports.loginGET = (req, res) => {
	res.render('login');
};

exports.loginPOST = async (req, res, next) => {
	try {
		const { user, accessToken } = await User.findAndGenerateToken(req.body);
		await RefreshToken.generate(user); // Creates and stores a refresh token in user db

		res.cookie('token', accessToken); // Put the token in cookies
		req.flash('notification', 'Successfully logged in 🙂');
		res.redirect('/v1/status');
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
	res.redirect('/v1/auth/login');
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
			res.redirect('/v1/status');
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
				res.redirect('/v1/status');
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
exports.resetPasswordGET = (req, res, next) => {
	const { token } = req.params;
	const payload = jwt.decode(token);
	if (moment(payload.exp).isBefore(new Date().getTime() / 1000)) {
		const finalErr = new AppError(
			'The reset password link has expired 😟',
			httpStatus.UNAUTHORIZED,
			true
		);
		next(finalErr);
		req.flash('notification', finalErr.message);
		res.redirect('/v1/auth/login');
	} else {
		const UrlPost = `/v1/auth/password/reset/${token}`;
		res.render('reset-password', { url: UrlPost });
	}
};

exports.resetPasswordPOST = async (req, res, next) => {
	const { token } = req.params;
	const { password, confirmPassword } = req.body;
	try {
		const payload = jwt.decode(token);
		if (moment(payload.exp).isBefore(new Date().getTime() / 1000)) {
			const finalErr = new AppError(
				'The reset password link has expired!',
				httpStatus.UNAUTHORIZED,
				true
			);
			req.flash('notification', finalErr.message);
			res.redirect('/v1/auth/login');
			throw finalErr;
		} else if (password !== confirmPassword) {
			const finalErr = new AppError(
				"Passwords don't match",
				httpStatus.UNAUTHORIZED,
				true
			);
			req.flash('notification', finalErr.message);
			res.redirect(`/v1/auth/password/reset/${token}`);
			throw finalErr;
		} else {
			const user = await User.findById(payload.sub);
			if (!user) {
				const finalErr = new AppError(
					'User not found!',
					httpStatus.NOT_FOUND,
					true
				);
				req.flash('notification', finalErr.message);
				res.redirect('/v1/auth/login');
				throw finalErr;
			}

			user.password = password;
			await user.save();
			req.flash('notification', 'Password reset successful 🙂');
			res.redirect('/v1/auth/login');
		}
	} catch (error) {
		next(error);
	}
};

/**
 * Forgot password controller.
 */
exports.forgotPasswordGET = (req, res) => res.render('forgot-password');

exports.forgotPasswordPOST = async (req, res, next) => {
	const { email } = req.body;
	try {
		const user = await User.findOne({ email });
		if (!user) {
			const finalErr = new AppError(
				'User with this email does not exist!',
				httpStatus.NOT_FOUND,
				true
			);
			req.flash('notification', finalErr.message);
			res.redirect('/v1/auth/password/forgot');
			throw finalErr;
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
		req.flash('notification', 'Successfully logged in 🙂');
		res.redirect('/v1/status');
	} catch (error) {
		const finalErr = new AppError(
			'Something went wrong during social login!',
			httpStatus.INTERNAL_SERVER_ERROR,
			false
		);
		req.flash('notification', finalErr.message);
		res.redirect('/v1/auth/login');
		next(finalErr);
	}
};

/**
 * Disconnects the linked Google account
 */
exports.disconnectGoogle = async (req, res, next) => {
	const { user } = req;
	try {
		const userObj = await User.findById(user.id);
		userObj.services.google = undefined;
		await userObj.save();
		res.redirect('/v1/status');
	} catch (error) {
		const finalErr = new AppError(
			'Something went wrong during the unlinking of Google account!',
			httpStatus.INTERNAL_SERVER_ERROR,
			false
		);
		next(finalErr);
		req.flash('notification', finalErr.message);
		res.redirect('/v1/status');
	}
};

/**
 * Disconnects the linked Facebook account
 */
exports.disconnectFacebook = async (req, res, next) => {
	const { user } = req;
	try {
		const userObj = await User.findById(user.id);
		userObj.services.facebook = undefined;
		await userObj.save();
		res.redirect('/v1/status');
	} catch (error) {
		const finalErr = new AppError(
			'Something went wrong during the unlinking of Facebook account!',
			httpStatus.INTERNAL_SERVER_ERROR,
			false
		);
		next(finalErr);
		req.flash('notification', finalErr.message);
		res.redirect('/v1/status');
	}
};
