'use-strict';
const passport = require('passport');
const { ExtractJwt } = require('passport-jwt');
const jwtStrategy = require('passport-jwt').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStategy = require('passport-google-oauth20').Strategy;
const { User } = require('../models/index');
const {
	JWT_SECRET,
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET,
	FACEBOOK_APP_ID,
	FACEBOOK_APP_SECRET,
} = require('./vars');

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
 * Utility functions
 */
const checkEmailAvailability = async (email) => {
	// Check if this email is already used in some other account
	const duplicateEmailObj = await User.findOne({
		$or: [
			{ email },
			{ 'google.email': email },
			{ 'facebook.email': email },
		],
	}).exec();

	if (duplicateEmailObj) return false;
	return true;
};

/**
 * Passport strategy options
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
	ignoreExpiration: false, // When true, Passes the payload to verify callback function regardless
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
			const isEmailAvailable = await checkEmailAvailability(
				profile._json.email
			);
			if (!isEmailAvailable) {
				req.flash('notification', 'This email is already in use!');
				return done(null, false);
			}

			const { user } = req;
			const userObj = await User.findById(user.id);

			// Link this google account to the logged in user
			userObj.google = {
				profileId: profile.id,
				email: profile._json.email,
			};
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
	} catch (err) {
		console.log('Error in google verify function!!!, e = ', err);
		done(err);
	}
};

const facebookAuth = async (req, accessToken, refreshToken, profile, done) => {
	try {
		if (req.user) {
			const isEmailAvailable = await checkEmailAvailability(
				profile.emails[0].value
			);
			if (!isEmailAvailable) {
				req.flash('notification', 'This email is already in use!');
				return done(null, false);
			}

			const { user } = req;
			const userObj = await User.findById(user.id);

			// Link this facebook account to the logged in user
			userObj.facebook = {
				profileId: profile.id,
				email: profile.emails[0].value,
			};
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
	} catch (err) {
		console.log('Error in fb auth verify callback!!!, err = ', err);
		done(err);
	}
};

exports.jwt = new jwtStrategy(jwtOptions, jwt);
exports.google = new GoogleStategy(googleOptions, googleAuth);
exports.facebook = new FacebookStrategy(facebookOptions, facebookAuth);
