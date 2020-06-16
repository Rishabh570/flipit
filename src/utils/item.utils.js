const { STRIPE_SECRET_KEY } = require('../config/vars');
const stripe = require('stripe')(STRIPE_SECRET_KEY);


async function createStripeEntry(item) {
	try {
		const product = await stripe.products.create({
			name: item.name
		});
		const price = await stripe.prices.create({
			product: product.id,
			unit_amount: item.price * 100,	// For converting to rupees (defaults to paisa)
			currency: 'inr',
		});
		item.priceId = price.id;	// Saving the stripe Price obj id to DB
		await item.save();
		console.log("Returning from createStripeEntry");
	}
	catch(err) {
		console.log("ERROR: In createStripeEntry. err = ", err.message);
		throw err;
	}
}


// EXPORTS
module.exports = {
	createStripeEntry,
}
