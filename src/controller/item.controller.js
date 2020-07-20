'use-strict';
const httpStatus = require('http-status');
const { Item, User } = require('../models/index');
const AppError = require('../utils/error.utils');
const { createStripeEntry } = require('../utils/item.utils');
const {
	BASE_URL,
	STRIPE_SECRET_KEY,
	STRIPE_WEBHOOK_SECRET,
	STRIPE_PUBLISHABLE_KEY,
	MAX_PRODUCT_IMAGES_ALLOWED,
} = require('../config/vars');
const stripe = require('stripe')(STRIPE_SECRET_KEY);

// const {
// 	sendEmail,
// 	confirmationForBuyer,
// 	confirmationForSeller,
// } = require('../utils/email.utils');

/**
 * Shows the listings posted by the logged in user
 */
exports.listings = async (req, res, next) => {
	const { user } = req;
	try {
		const listings = await Item.find({ sellerId: user.id });
		res.render('my-listings', { user, listings });
	} catch (err) {
		const finalErr = new AppError(
			'Something went wrong while fetching your listings',
			httpStatus['500'],
			false
		);
		next(finalErr);
		req.flash('notification', finalErr.message);
		res.redirect('/v1/profile');
	}
};

/**
 * Shows purchased items
 */
exports.purchased = async (req, res, next) => {
	const { user } = req;
	try {
		const purchasedItems = await Item.find({ buyerId: user.id });
		res.render('purchased', { user, purchasedItems });
	} catch (err) {
		const finalErr = new AppError(
			'Something went wrong while fetching your listings',
			httpStatus['500'],
			false
		);
		next(finalErr);
		req.flash('notification', finalErr.message);
		res.redirect('/v1/profile');
	}
};

/**
 * Sell item controller
 */
exports.sellGET = (req, res) => {
	const { user } = req;
	res.render('sell', { user });
};

exports.sellPOST = async (req, res, next) => {
	try {
		req.body.sellerId = req.user.id;
		if (req.files.length === 0) {
			throw new AppError(
				'Please add product images',
				httpStatus.BAD_REQUEST,
				true
			);
		} else if (req.files.length > MAX_PRODUCT_IMAGES_ALLOWED) {
			throw new AppError(
				`You can only upload maximum of ${MAX_PRODUCT_IMAGES_ALLOWED} images of the product.`,
				httpStatus.BAD_REQUEST,
				true
			);
		}
		const pictures_array = req.files.map((picture) => picture.filename);
		req.body.pictures = pictures_array; // Storing the names in the DB for reference

		const item = await new Item(req.body).save();
		await createStripeEntry(item);
		req.flash('notification', 'Item posted successfully 🙂');
		res.redirect('/v1/listings');
	} catch (error) {
		next(error);
		req.flash('notification', error.message);
		res.redirect('/v1/item/sell');
	}
};

const handlePurchaseFulfillment = async (data) => {
	try {
		const item = await Item.findOne({ priceId: data.metadata.priceId });
		const buyer = await User.findOne({ email: data.customer_email });
		// const seller = await User.findById(item.sellerId);

		item.status = 0; // Shows that the item is sold
		item.buyerId = buyer.id; // Setting the buyer of the item
		await item.save();

		// Send mail to buyer and seller (This is handled by stripe now, not tested on live yet.)
		// await sendEmail(confirmationForSeller(seller, item, buyer));
		// await sendEmail(confirmationForBuyer(buyer, item, seller));
	} catch (err) {
		throw new AppError(
			'Something went wrong in purchase fulfillment!',
			httpStatus.INTERNAL_SERVER_ERROR,
			false
		);
	}
};
exports.handlePurchaseFulfillment = handlePurchaseFulfillment; // Inline export

/**
 * Checkout item
 */
exports.checkoutItem = async (req, res, next) => {
	const { user } = req;
	try {
		const item = await Item.findById(req.params.itemId);
		res.render('checkout', { user, item });
	} catch (error) {
		const finalErr = new AppError(
			"Cannot find the item you're looking for :(",
			httpStatus.NOT_FOUND,
			true
		);
		next(finalErr);
		req.flash('notification', finalErr.message);
		res.redirect('/v1/listings');
	}
};

/**
 * Checkout success
 */
exports.checkoutSuccess = async (req, res, next) => {
	const { session_id } = req.query;
	if (session_id === undefined || session_id === null) {
		return res.redirect('/v1/listings');
	}
	stripe.checkout.sessions.retrieve(session_id, (err, checkout_session) => {
		if (err) {
			const finalErr = new AppError(
				'Invalid checkout session!',
				httpStatus.BAD_REQUEST,
				true
			);
			next(finalErr);
			req.flash('notification', finalErr.message);
			return res.redirect('/v1/listings');
		}
		if (checkout_session.customer_email === req.user.email) {
			return res.render('checkout-success', { user: req.user });
		}
		return res.redirect('/v1/listings');
	});
};

/**
 * Returns stripe publishable key
 */
exports.stripePubKey = (req, res) => {
	res.send({
		publicKey: STRIPE_PUBLISHABLE_KEY,
	});
};

/**
 * Creates checkout session
 */
exports.createCheckoutSession = async (req, res, next) => {
	const { priceId, itemId } = req.body;
	try {
		const session = await stripe.checkout.sessions.create({
			customer_email: req.user.email,
			metadata: { priceId },
			payment_method_types: ['card'],
			mode: 'payment',
			line_items: [
				{
					quantity: 1,
					price: priceId,
				},
			],

			payment_intent_data: {
				receipt_email: req.user.email,
			},

			/**
			 * Redirect to success page and notify payment succeeded,
			 * CHECKOUT_SESSION_ID is populated by stripe
			 */
			success_url: `${BASE_URL}/v1/item/checkout/success?session_id={CHECKOUT_SESSION_ID}`,

			/**
			 * Redirect to item checkout page if user clicks away/cancels checkout
			 */
			cancel_url: `${BASE_URL}/v1/item/checkout/${itemId}`,
		});

		res.send({
			sessionId: session.id,
		});
	} catch (error) {
		next(
			new AppError(
				'Something went wrong while creating checkout session',
				httpStatus.INTERNAL_SERVER_ERROR,
				false
			)
		);
		res.redirect(`${BASE_URL}/v1/item/checkout/${itemId}`);
	}
};

/**
 * This webhook listens stripe events
 */
exports.webhook = async (req, res, next) => {
	let data;
	let eventType;

	if (STRIPE_WEBHOOK_SECRET) {
		let event;
		const signature = req.headers['stripe-signature'];

		try {
			event = stripe.webhooks.constructEvent(
				req.body,
				signature,
				STRIPE_WEBHOOK_SECRET
			);
		} catch (error) {
			next(
				new AppError(
					'⚠️  Webhook signature verification failed.',
					httpStatus.BAD_REQUEST,
					true
				)
			);
			return res.sendStatus(400);
		}
		data = event.data;
		eventType = event.type;
	} else {
		// If secret is not configured in .env,
		// retrieve the event data directly from the request body.
		data = req.body.data;
		eventType = req.body.type;
	}

	if (eventType === 'checkout.session.completed') {
		console.log('🔔  Payment received!');
		handlePurchaseFulfillment(data.object);
	}

	res.sendStatus(200);
};
