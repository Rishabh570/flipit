'use-strict';
const mongoose = require('mongoose');

/**
 * Item Schema
 */
const itemSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			maxlength: 256,
			required: true,
			lowercase: true,
			trim: true,
		},
		description: {
			type: String,
			required: true,
			maxlength: 512,
		},
		price: {
			type: Number,
			required: true,
		},
		condition: {
			type: Number,
			default: 3,
		},
		sellerId: {
			type: String,
			index: { background: true },
			required: true,
		},
		status: {
			type: Number,
			required: true,
			default: 1, // 1 -- available, 0 -- sold
		},
		priceId: {
			// References the stripe Price object
			type: String,
			index: true,
		},
		pictures: {
			type: Array,
			required: true,
		},
		buyerId: {
			type: String,
			index: { background: true },
		},
	},
	{
		timestamps: true,
		autoIndex: true,
	}
);

/**
 * @typedef Item
 */
const Item = mongoose.model('Item', itemSchema);
module.exports = Item;
