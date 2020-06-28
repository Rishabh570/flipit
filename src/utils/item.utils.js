const httpStatus = require('http-status');
const AppError = require('../utils/error.utils');
const { STRIPE_SECRET_KEY } = require('../config/vars');
const stripe = require('stripe')(STRIPE_SECRET_KEY);

async function createStripeEntry(item) {
	try {
		const product = await stripe.products.create({
			name: item.name,
		});
		const price = await stripe.prices.create({
			product: product.id,
			unit_amount: item.price * 100, // For converting to rupees (defaults to paisa)
			currency: 'inr',
		});
		item.priceId = price.id; // Saving the stripe Price obj id to DB
		await item.save();
	} catch (error) {
		throw new AppError(
			'Something went wrong in creating stripe entry',
			httpStatus['500'],
			false
		);
	}
}

// EXPORTS
module.exports = {
	createStripeEntry,
};
