'use-strict';
const crypto = require('crypto');
const mongoose = require('mongoose');
const moment = require('moment-timezone');

/**
 * Refresh Token Schema
 */
const refreshTokenSchema = new mongoose.Schema({
	token: {
		type: String,
		required: true,
		index: true,
	},
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	userEmail: {
		type: 'String',
		ref: 'User',
		required: true,
	},
	expires: {
		type: Date,
	},
});

refreshTokenSchema.statics = {
	/**
	 * Generate a refresh token object and saves it into the database
	 */
	generate(user) {
		const userId = user._id;
		const userEmail = user.email;
		const token = `${userId}.${crypto.randomBytes(40).toString('hex')}`;
		const expires = moment()
			.add(30, 'days') // 30 days expiration of refresh token
			.toDate();
		const tokenObject = new RefreshToken({
			token,
			userId,
			userEmail,
			expires,
		});

		tokenObject.save();
		return tokenObject;
	},
};

/**
 * @typedef RefreshToken
 */
const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
module.exports = RefreshToken;
