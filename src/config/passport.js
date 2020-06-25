const passport = require('passport');
const moment = require('moment-timezone');
const { ExtractJwt } = require('passport-jwt');
const jwtStrategy = require('passport-jwt').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStategy = require('passport-google-oauth20').Strategy;
const { User, RefreshToken } = require('../models/index');
const {
	JWT_SECRET,
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET,
	FACEBOOK_APP_ID,
	FACEBOOK_APP_SECRET,
} = require('./vars');

const time_multiplier = 1000;

/**
 * It is invoked right when the any strategy
 * passes the user obj to callback and it takes that
 * user obj and stores user.id in the session (req.session.passport.user).
 */
passport.serializeUser((user, done) => {
	done(null, user.id);
});

/**
 * User object is searched with the help of ID that is passed here
 * The result of this i.e., found user object is attached to the
 * request object. (req.user = {result of de-serialize})
 */
passport.deserializeUser(async (id, done) => {
	const user = await User.findById(id);
	if (!user) {
		done(null, false);
	}
	done(null, user);
});

/**
 * Passport strategies
 */

// Custom extractor for JWT
const cookieExtractor = (req) => {
	let token = null;
	if (req && req.cookies) {
		token = req.cookies.token;
	}
	return token;
};

const jwtOptions = {
	secretOrKey: JWT_SECRET,
	jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
	ignoreExpiration: true, // Passes the payload to verify callback function even if token is expired
};

const googleOptions = {
	clientID: GOOGLE_CLIENT_ID,
	clientSecret: GOOGLE_CLIENT_SECRET,
	callbackURL: '/v1/auth/google/callback',
	passReqToCallback: true,
};

const facebookOptions = {
	clientID: FACEBOOK_APP_ID,
	clientSecret: FACEBOOK_APP_SECRET,
	callbackURL: '/v1/auth/facebook/callback',
	profileFields: ['id', 'displayName', 'photos', 'email'],
	passReqToCallback: true,
	// enableProof: true,
};

/**
 * Passport strategy for JWT authentication
 */
const jwt = async (payload, done) => {
	try {
		const userObj = await User.findById(payload.sub);

		if (
			moment(payload.exp).isBefore(new Date().getTime() / time_multiplier)
		) {
			const refreshObject = await RefreshToken.findOneAndRemove({
				userEmail: userObj.email,
			});

			const { user, accessToken } = await User.findAndGenerateToken({
				email: userObj.email,
				refreshObject,
			});
			await RefreshToken.generate(user); // Save new refresh token obj to DB

			// Store the access token in user object TEMPORARILY.
			// This is deleted right after we've updated its value in the cookie
			user.access_token = accessToken;

			return done(null, user);
		}

		return done(null, userObj);
	} catch (error) {
		return done(null, error);
	}
};

/**
 * Passport strategy for authentication using Google OAuth (2.0)
 */
const googleAuth = async (req, accessToken, refreshToken, profile, done) => {
	try {
		if (req.user) {
			const { user } = req;
			const userObj = await User.findById(user.id);
			if (userObj.services === undefined) {
				userObj.services = {};
			}
			userObj.services.google = profile.id;
			await userObj.save();
			done(null, userObj);
		} else {
			const user = await User.oAuthLogin(
				profile.provider,
				profile.id,
				profile._json.email,
				profile.displayName,
				profile._json.picture
			);
			done(null, user);
		}
	} catch (e) {
		console.log('Error in google verify function!!!');
		done(e);
	}
};

const facebookAuth = async (req, accessToken, refreshToken, profile, done) => {
	try {
		if (req.user) {
			const { user } = req;
			const userObj = await User.findById(user.id);
			if (userObj.services === undefined) {
				userObj.services = {};
			}
			userObj.services.facebook = profile.id;
			await userObj.save();
			done(null, userObj);
		} else {
			const user = await User.oAuthLogin(
				profile.provider,
				profile.id,
				profile.emails[0].value,
				profile.displayName,
				profile.photos[0].value
			);
			done(null, user);
		}
	} catch (e) {
		console.log('Error in fb auth verify callback!!!');
		done(e);
	}
};

exports.jwt = new jwtStrategy(jwtOptions, jwt);
exports.google = new GoogleStategy(googleOptions, googleAuth);
exports.facebook = new FacebookStrategy(facebookOptions, facebookAuth);
