const express = require('express');
const passport = require('passport');
const { validate } = require('express-validation');
const authController = require('../controller/auth.controller');
const {
	oAuthLogin,
	verifyJWT,
	verifyAnonymous,
} = require('../middlewares/auth');
const {
	login,
	register,
	setPassword,
	changePassword,
	forgotPassword,
	resetPassword,
} = require('../validations/auth.validation');

const router = express.Router();

/**
 * Register routes
 */
router.get('/register', verifyAnonymous(), authController.registerGET);
router
	.route('/register')
	.post(verifyAnonymous(), validate(register), authController.registerPOST);

/**
 * Login routes
 */
router.get('/login', verifyAnonymous(), authController.loginGET);
router.post(
	'/login',
	verifyAnonymous(),
	validate(login),
	authController.loginPOST
);

/**
 * Logout route
 */
router.get('/logout', verifyJWT(), authController.logout);

/**
 * Set Password routes
 */
router.route('/password/set').get(verifyJWT(), authController.setPasswordGET);
router
	.route('/password/set')
	.post(verifyJWT(), validate(setPassword), authController.setPasswordPOST);

/**
 * Change Password routes
 */
router
	.route('/password/change')
	.get(verifyJWT(), authController.changePasswordGET);
router
	.route('/password/change')
	.post(
		verifyJWT(),
		validate(changePassword),
		authController.changePasswordPOST
	);

/**
 * Reset Password routes
 */
router
	.route('/password/reset/:token')
	.get(verifyAnonymous(), authController.resetPasswordGET);
router
	.route('/password/reset/:token')
	.post(
		verifyAnonymous(),
		validate(resetPassword),
		authController.resetPasswordPOST
	);

/**
 * Forgot Password route
 */
router
	.route('/password/forgot')
	.get(verifyAnonymous(), authController.forgotPasswordGET);
router
	.route('/password/forgot')
	.post(
		verifyAnonymous(),
		validate(forgotPassword),
		authController.forgotPasswordPOST
	);

/**
 * Google Auth Routes
 */
router.get(
	'/google/callback',
	oAuthLogin('google', {
		failureRedirect: '/login',
	}),
	authController.oAuth
);

router.get('/google', oAuthLogin('google', { scope: ['profile', 'email'] }));

router.get(
	'/connect/google/callback',
	passport.authorize('google', {
		failureRedirect: '/v1/auth/login',
	}),
	authController.oAuth
);

router.get(
	'/connect/google',
	passport.authorize('google', { scope: ['profile', 'email'] })
);

router.get('/disconnect/google', verifyJWT(), authController.disconnectGoogle);

/**
 * Facebook auth routes
 */

router.get(
	'/facebook/callback',
	oAuthLogin('facebook', {
		failureRedirect: '/v1/auth/login',
	}),
	authController.oAuth
);

router.get('/facebook', oAuthLogin('facebook', { scope: ['email'] }));

router.get(
	'/connect/facebook/callback',
	passport.authorize('facebook', {
		failureRedirect: '/v1/auth/login',
	}),
	authController.oAuth
);

router.get(
	'/connect/facebook',
	passport.authorize('facebook', { scope: ['email'] })
);

router.get(
	'/disconnect/facebook',
	verifyJWT(),
	authController.disconnectFacebook
);

module.exports = router;
