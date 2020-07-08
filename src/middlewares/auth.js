'use-strict';
const passport = require('passport');
// const { User } = require('../models/index');

/**
 * JWT callback handler
 */
const handleJWT = (req, res, next) => (err, user, info) => {
	const error = err || info;
	try {
		if (error || !user) throw error;
		req.logIn(user, (err) => {
			if (err) {
				return next(err);
			}

			if (user.access_token !== undefined && user.access_token !== null) {
				// Put the access token in the cookie
				res.cookie('token', user.access_token);
				user.access_token = null;
			}
			return next();
		});
	} catch (e) {
		console.log('ERROR IN JWT HANDLER = ', e.message);
		res.redirect('/v1/auth/login');
	}
};

/** Authentication middleware using JWT
 *
 * Checks if user is currently logged in by verifying
 * the "token" present in the cookie, token is present for 30 days in the cookie
 * as set by cookie-session, if the present token is invalid "verifyJWT" renews it
 * along with refresh token and passport session.
 */
exports.verifyJWT = () => (req, res, next) =>
	passport.authenticate('jwt', handleJWT(req, res, next))(req, res, next);

// Authentication middleware using OAuth
exports.oAuthLogin = (service, options = {}) =>
	passport.authenticate(service, options);

// Checks if the user is not logged in
exports.verifyAnonymous = () => (req, res, next) => {
	if (req && req.user) {
		res.redirect('/v1/status');
	} else {
		next();
	}
};

// exports.isOnboardingDone = () => async (req, res, next) => {
// 	if(req && req.user && await req.user.passwordMatches(req.user.email)) {
// 		res.redirect('/v1/auth/password/set');
// 	} else {
// 		next();
// 	}
// }
