const express = require('express');
const passport = require('passport');
const authController = require('../controller/auth.controller');
const {
	oAuthLogin,
	verifyJWT,
	verifyAnonymous,
} = require('../middlewares/auth');
const { validate } = require('../validations/auth.validation');
const router = express.Router();

/**
 * Register routes
 */
router
	.route('/register')
	.get(verifyAnonymous(), authController.registerGET)
	.post(
		verifyAnonymous(),
		validate('registerPOST'),
		authController.registerPOST
	);

/**
 * Login routes
 */
router
	.route('/login')
	.get(verifyAnonymous(), authController.loginGET)
	.post(verifyAnonymous(), validate('loginPOST'), authController.loginPOST);

/**
 * Logout route
 */
router.route('/logout').get(verifyJWT(), authController.logout);

/**
 * Set Password routes
 */
router
	.route('/password/set')
	.get(verifyJWT(), authController.setPasswordGET)
	.post(
		verifyJWT(),
		validate('setPasswordPOST'),
		authController.setPasswordPOST
	);

/**
 * Change Password routes
 */
router
	.route('/password/change')
	.get(verifyJWT(), authController.changePasswordGET)
	.post(
		verifyJWT(),
		validate('changePasswordPOST'),
		authController.changePasswordPOST
	);

/**
 * Reset Password routes
 */
router
	.route('/password/reset/:token')
	.get(verifyAnonymous(), authController.resetPasswordGET)
	.post(
		verifyAnonymous(),
		validate('resetPasswordPOST'),
		authController.resetPasswordPOST
	);

/**
 * Forgot Password route
 */
router
	.route('/password/forgot')
	.get(verifyAnonymous(), authController.forgotPasswordGET)
	.post(
		verifyAnonymous(),
		validate('forgotPasswordPOST'),
		authController.forgotPasswordPOST
	);

/**
 * Google Auth Routes
 */
router
	.route('/google/callback')
	.get(
		oAuthLogin('google', { failureRedirect: '/v1/auth/login' }),
		authController.oAuth,
		authController.redirectLoggedIn
	);

router
	.route('/google')
	.get(oAuthLogin('google', { scope: ['profile', 'email'] }));

router
	.route('/connect/google/callback')
	.get(
		passport.authorize('google', { failureRedirect: '/v1/auth/login' }),
		authController.oAuth,
		authController.redirectLoggedIn
	);

router
	.route('/connect/google')
	.get(passport.authorize('google', { scope: ['profile', 'email'] }));

// router
// 	.route('/disconnect/google')
// 	.get(verifyJWT(), authController.disconnectGoogle);

/**
 * Facebook auth routes
 */

router
	.route('/facebook/callback')
	.get(
		oAuthLogin('facebook', { failureRedirect: '/v1/auth/login' }),
		authController.oAuth,
		authController.redirectLoggedIn
	);

router.route('/facebook').get(oAuthLogin('facebook', { scope: ['email'] }));

router
	.route('/connect/facebook/callback')
	.get(
		passport.authorize('facebook', { failureRedirect: '/v1/auth/login' }),
		authController.oAuth,
		authController.redirectLoggedIn
	);

router
	.route('/connect/facebook')
	.get(passport.authorize('facebook', { scope: ['email'] }));

// router
// 	.route('/disconnect/facebook')
// 	.get(verifyJWT(), authController.disconnectFacebook);

// EXPORTS
module.exports = router;
