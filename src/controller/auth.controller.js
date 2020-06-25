const jwt = require('jsonwebtoken');
const moment = require('moment-timezone');
const { User, RefreshToken } = require('../models/index');
const { sendEmail, forgotPasswordEmail } = require('../utils/email.utils');
const { BASE_URL } = require('../config/vars');

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
		res.redirect('/v1/auth/login');
	} catch (error) {
		console.log('ERROR: In register user! = ', error.message);
		return next(User.checkDuplicateEmail(error));
	}
};

/**
 * Login controller.
 */
exports.loginGET = (req, res) => {
	res.render('login');
};

exports.loginPOST = async (req, res) => {
	try {
		const { user, accessToken } = await User.findAndGenerateToken(req.body);
		await RefreshToken.generate(user); // Creates and stores a refresh token in user db

		// Put the token in cookies
		res.cookie('token', accessToken);
		res.redirect('/v1/status');
	} catch (error) {
		console.log('ERROR: while logging in!, err = ', error.message);
		res.redirect('/v1/auth/login');
	}
};

/**
 * Logout controller.
 */
exports.logout = (req, res) => {
	console.log('Logging out...');
	res.cookie('token', req.cookies.token, { maxAge: 0 });
	req.session = null;
	req.logout();
	res.redirect('/v1/auth/login');
};

/**
 * Set password controller.
 */
exports.setPasswordGET = async (req, res) => {
	const { user } = req;
	// Default pass when user signs in using OAuth is user's email
	if (await user.passwordMatches(user.email)) {
		res.render('set-password', { user });
	} else {
		res.render('change-password', { user });
	}
};

exports.setPasswordPOST = async (req, res) => {
	const { password, confirmPassword } = req.body;
	if (password !== confirmPassword) {
		res.redirect('/v1/auth/password/set');
	} else {
		const currentUser = req.user;
		currentUser.password = password;
		await currentUser.save();
		res.redirect('/v1/status');
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
		res.redirect('/v1/auth/password/set');
	} else {
		res.render('change-password', { user });
	}
};

exports.changePasswordPOST = async (req, res) => {
	const { currentPassword, newPassword, confirmNewPassword } = req.body;
	const currentUser = req.user;

	if (await currentUser.passwordMatches(currentPassword)) {
		if (newPassword !== confirmNewPassword) {
			console.log("ERROR: New password doesn't match!!!");
			res.redirect('/v1/auth/password/change');
		} else {
			currentUser.password = newPassword;
			await currentUser.save();
			res.redirect('/v1/status');
		}
	} else {
		console.log('ERROR: Current password is incorrect!!!');
		res.redirect('/v1/auth/password/change');
	}
};

/**
 * Reset Password controller.
 */
exports.resetPasswordGET = (req, res) => {
	const { token } = req.params;
	const payload = jwt.decode(token);
	if (moment(payload.exp).isBefore(new Date().getTime() / 1000)) {
		console.log('The reset password link has expired!!!');
		res.redirect('/v1/auth/login');
	} else {
		const UrlPost = `/v1/auth/password/reset/${token}`;
		res.render('reset-password', { url: UrlPost });
	}
};

exports.resetPasswordPOST = async (req, res) => {
	const { token } = req.params;
	const { password, confirmPassword } = req.body;
	const payload = jwt.decode(token);
	if (moment(payload.exp).isBefore(new Date().getTime() / 1000)) {
		console.log('The reset password link has expired!!!');
		res.redirect('/v1/auth/login');
	} else if (password !== confirmPassword) {
		console.log("RESET: Passwords don't match!!!");
		// TODO: SHOW SOME ERROR TO USER
		res.redirect(`/v1/auth/password/reset/${token}`);
	} else {
		const user = await User.findById(payload.sub);
		if (!user) {
			console.log('ERROR: User not found!!!');
			res.redirect('/v1/auth/login');
		}

		user.password = password;
		await user.save();
		res.redirect('/v1/auth/login');
	}
};

/**
 * Forgot password controller.
 */
exports.forgotPasswordGET = (req, res) => res.render('forgot-password');

exports.forgotPasswordPOST = async (req, res) => {
	try {
		const { email } = req.body;
		const user = await User.findOne({ email });
		if (!user) {
			console.log('User with this email doesnot exist!');
			res.redirect('/v1/auth/password/forgot');
		}

		// Generate a password reset link and mail it to user
		const { name } = user;
		const resetPassToken = user.resetToken();
		const passResetLink = `${BASE_URL}/v1/auth/password/reset/${resetPassToken}`;

		// TODO: Notify user that a link to reset password is sent to the mail ID.
		res.redirect('/v1/auth/login');
		await sendEmail(forgotPasswordEmail({ name, email, passResetLink }));
	} catch (error) {
		console.log(
			'Some error occured during forgot password POST, e = ',
			error.message
		);
		res.redirect('/v1/auth/password/forgot');
	}
};

/**
 * OAuth login controller.
 * Creates a new user in DB if doesn't exist.
 */
exports.oAuth = async (req, res) => {
	console.log('In oauth controller...');
	try {
		const { user } = req;
		const accessToken = user.token();
		await RefreshToken.generate(user);

		// Put the access token in the cookie
		res.cookie('token', accessToken);
		return res.redirect('/v1/status');
	} catch (error) {
		console.log('returning error from oauth controller!');
		return res.redirect('/v1/auth/login');
	}
};

/**
 * Disconnects the linked Google account
 */
exports.disconnectGoogle = async (req, res) => {
	const { user } = req;
	const userObj = await User.findById(user.id);
	userObj.services.google = undefined;
	await userObj.save();
	res.redirect('/v1/status');
};

/**
 * Disconnects the linked Facebook account
 */
exports.disconnectFacebook = async (req, res) => {
	const { user } = req;
	const userObj = await User.findById(user.id);
	userObj.services.facebook = undefined;
	await userObj.save();
	res.redirect('/v1/status');
};
