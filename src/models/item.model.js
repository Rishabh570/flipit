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
			required: true,
		},
		sellerId: {
			type: String,
			index: true,
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
			index: { unique: true },
		},
		pictures: {
			type: Array,
			required: true,
		},
		buyerId: {
			type: String,
			index: true,
		},
		totalSaves: {
			type: Number,
			default: 0,
		},
		bill: {
			type: Boolean,
			default: false,
		},
	},
	{
		timestamps: false,
	}
);

/**
 * @typedef Item
 */
const Item = mongoose.model('Item', itemSchema);
module.exports = Item;
