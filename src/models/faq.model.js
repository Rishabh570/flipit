'use-strict';
const mongoose = require('mongoose');

/**
 * Refresh Token Schema
 */
const faqSchema = new mongoose.Schema(
	{
		itemId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Item',
			required: true,
			index: true,
		},
		question: {
			type: String,
			required: true,
		},
		answer: {
			type: String,
			required: true,
		},
	},
	{
		timestamps: false,
	}
);

/**
 * @typedef Faq
 */
const Faq = mongoose.model('Faq', faqSchema);
module.exports = Faq;
