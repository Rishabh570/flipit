'use-strict';
const mongoose = require('mongoose');

/**
 * Refresh Token Schema
 */
const wishlistSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			index: true,
		},
		itemId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Item',
			required: true,
			index: true,
		},
	},
	{
		timestamps: false,
	}
);

/**
 * @typedef Wishlist
 */
const Wishlist = mongoose.model('Wishlist', wishlistSchema);
module.exports = Wishlist;
