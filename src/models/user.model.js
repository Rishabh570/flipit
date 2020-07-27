'use-strict';
const mongoose = require('mongoose');
const httpStatus = require('http-status');
const bcrypt = require('bcrypt');
const moment = require('moment-timezone');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/error.utils');
const {
	JWT_SECRET,
	JWT_EXPIRATION_MINUTES,
	RESET_TOKEN_EXPIRATION_MINUTES,
} = require('../config/vars');

/**
 * User Schema
 */
const userSchema = new mongoose.Schema(
	{
		email: {
			type: String,
			match: /^\S+@\S+\.\S+$/,
			required: true,
			unique: true,
			trim: true,
			lowercase: true,
			index: { unique: true, background: true },
		},
		password: {
			type: String,
			required: true,
			minlength: 6,
			maxlength: 64,
		},
		name: {
			type: String,
			maxlength: 128,
			trim: true,
		},
		google: {
			profileId: String,
			email: String,
		},
		facebook: {
			profileId: String,
			email: String,
		},
		picture: {
			type: String,
			trim: true,
		},
	},
	{
		timestamps: true,
	}
);

/**
 * Pre-save Hooks
 */
userSchema.pre('save', async function save(next) {
	try {
		// Encrypt the password if it's modified
		const rounds = 12;
		if (this.isModified('password')) {
			const hash = await bcrypt.hash(this.password, rounds);
			this.password = hash;
		}

		return next(); // normal save
	} catch (error) {
		return next(error);
	}
});

/**
 * Methods
 */
userSchema.method({
	token() {
		const playtheload = {
			exp: moment()
				.add(JWT_EXPIRATION_MINUTES, 'minutes') // expires in 1 week but stays in cookie for 30 days
				.unix(),
			iat: moment().unix(),
			sub: this._id,
		};
		return jwt.sign(playtheload, JWT_SECRET);
	},

	/**
	 * This token is issued for forgot password requests
	 * Expires early to prevent misuse.
	 */
	resetToken() {
		const playtheload = {
			exp: moment()
				.add(RESET_TOKEN_EXPIRATION_MINUTES, 'minutes') // expires in 10 min
				.unix(),
			iat: moment().unix(),
			sub: this._id,
		};
		return jwt.sign(playtheload, JWT_SECRET);
	},

	async passwordMatches(password) {
		return bcrypt.compare(password, this.password);
	},
});

/**
 * Statics
 */
userSchema.statics = {
	/**
	 *	Find user by email and tries to generate a JWT token
	 *	It successfully generates the token in two cases:
	 *	1. During login when user has provided correct email and password, and
	 *	2. When provided with an email and refreshObject to generate a new token after it has expired.
	 */
	async findAndGenerateToken(options) {
		const { email, refreshObject, password } = options;

		const user = await this.findOne({
			$or: [
				{ email },
				{ 'google.email': email },
				{ 'facebook.email': email },
			],
		}).exec();
		if (!user) {
			throw new AppError(
				'Incorrect email!',
				httpStatus.UNAUTHORIZED,
				true
			);
		}

		if (password) {
			if (await user.passwordMatches(password)) {
				return { user, accessToken: user.token() };
			}
			throw new AppError(
				'Incorrect password',
				httpStatus.UNAUTHORIZED,
				true
			);
		} else if (refreshObject && refreshObject.userEmail === email) {
			if (
				moment(refreshObject.expires).isBefore(
					new Date().getTime() / 1000
				)
			) {
				throw new AppError(
					'Invalid refresh token.',
					httpStatus.UNAUTHORIZED,
					true
				);
			} else {
				return { user, accessToken: user.token() };
			}
		}
		throw new AppError(
			'Something went wrong while logging in!',
			httpStatus.INTERNAL_SERVER_ERROR,
			false
		);
	},

	/**
	 * Return new validation error
	 * if error is a mongoose duplicate key error
	 */
	checkDuplicateEmail(error) {
		if (error.name === 'MongoError' && error.code === 11000) {
			return new AppError(
				'A user with same email already exists!',
				httpStatus.BAD_REQUEST,
				true
			);
		}
		return error;
	},

	/**
	 * Oauth Login for User
	 * Creates a new entry in DB if it doesn't exist
	 */
	async oAuthLogin(service, id, email, displayName, picture) {
		const user = await this.findOne({
			$or: [
				{ [`${service}.profileId`]: id },
				{ [`${service}.email`]: email },
			],
		});

		if (user) {
			user.service = { profileId: id, email };
			if (!user.name) user.name = displayName;
			if (!user.picture) user.picture = picture;
			return user.save();
		}
		// Default password for a new user's oauth login is his/her email.
		const password = email;

		return this.create({
			[`${service}`]: { profileId: id, email: email },
			email,
			password,
			name: displayName,
			picture,
		});
	},
};

/**
 * @typedef User
 */
const User = mongoose.model('User', userSchema);
module.exports = User;
