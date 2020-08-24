'use-strict';
const httpStatus = require('http-status');
const { Item, User, Wishlist, Faq } = require('../models/index');
const AppError = require('../utils/error.utils');
const {
	createStripeEntry,
	uploadToS3,
	getImagesFromS3,
} = require('../utils/item.utils');
const {
	BASE_URL,
	STRIPE_SECRET_KEY,
	STRIPE_WEBHOOK_SECRET,
	STRIPE_PUBLISHABLE_KEY,
	MAX_PRODUCT_IMAGES_ALLOWED,
} = require('../config/vars');
const stripe = require('stripe')(STRIPE_SECRET_KEY);

const {
	sendEmail,
	confirmationForBuyer,
	confirmationForSeller,
} = require('../utils/email.utils');

/**
 * Shows the listings posted by the logged in user
 */
exports.listings = async (req, res, next) => {
	const { user } = req;
	try {
		const listings = await Item.find({
			sellerId: user.id,
		})
			.select({ name: 1, price: 1, status: 1 })
			.lean();

		res.render('my-listings', { user, listings });
	} catch (err) {
		const finalErr = new AppError(
			'Something went wrong while fetching your listings',
			httpStatus['500'],
			false
		);
		next(finalErr);
		req.flash('notification', finalErr.message);
		res.redirect('/profile');
	}
};

/**
 * Shows purchased items
 */
exports.purchased = async (req, res, next) => {
	const { user } = req;
	try {
		const purchasedItems = await Item.find({
			buyerId: user.id,
		})
			.select({ name: 1, price: 1, updatedAt: 1 })
			.lean();

		res.render('purchased', { user, purchasedItems });
	} catch (err) {
		const finalErr = new AppError(
			'Something went wrong while fetching your listings',
			httpStatus['500'],
			false
		);
		next(finalErr);
		req.flash('notification', finalErr.message);
		res.redirect('/profile');
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
	const questions = JSON.parse(req.body.questions);
	const answers = JSON.parse(req.body.answers);
	try {
		// Check for Item Condition field
		if (req.body.condition === undefined) {
			throw new AppError(
				'Please add a rating',
				httpStatus.BAD_REQUEST,
				true
			);
		}
		// Set sellerId to the user id
		req.body.sellerId = req.user.id;

		// Check for file upload
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
		req.body.bill = req.body.bill === 'on' ? true : false;

		const [, item] = await Promise.all([
			uploadToS3(req.files),
			new Item(req.body).save(),
		]);

		if (questions && questions.length > 0) {
			const faqs = questions.map((question, i) => {
				return { itemId: item._id, question, answer: answers[i] };
			});
			await Promise.all([Faq.insertMany(faqs), createStripeEntry(item)]);
		} else {
			await createStripeEntry(item);
		}

		return res.send(true);
	} catch (error) {
		console.log('error: ', error);
		next(error);
		return res.send(false);
	}
};

/**
 * Shows wishlist
 */
exports.wishlistGET = async (req, res, next) => {
	const userId = req.user._id;
	try {
		const wishlist = await Wishlist.find({ userId });
		const wishlistItems = wishlist.map((wishlistObj) => {
			return new Promise((resolve, reject) => {
				Item.findById(wishlistObj.itemId)
					.then((item) => resolve(item))
					.catch((err) => reject(err));
			});
		});

		const savedItems = await Promise.all(wishlistItems);
		res.render('wishlist', { user: req.user, wishlist: savedItems });
	} catch (err) {
		const finalErr = new AppError(
			'Failed to load your wishlist :(',
			httpStatus['500'],
			false
		);
		next(finalErr.message);
		req.flash('notification', finalErr.message);
		res.redirect('/listings');
	}
};

/**
 * Adds or removes item from wishlist
 * Accessed through AJAX
 */
exports.wishlistPOST = async (req, res, next) => {
	const { user } = req;
	const { itemId } = req.body;
	try {
		const [checkIfWishlisted, itemObj] = await Promise.all([
			Wishlist.findOneAndRemove({ userId: user._id, itemId }),
			Item.findById(itemId).select({ totalSaves: 1 }),
		]);

		if (checkIfWishlisted) {
			itemObj.totalSaves = Math.max(0, itemObj.totalSaves - 1);
			await itemObj.save();
			return res.send(false);
		}
		await Wishlist.create({ userId: user._id, itemId });
		itemObj.totalSaves += 1;
		await itemObj.save();
		return res.send(true);
	} catch (err) {
		const finalErr = new AppError(
			'Item could not be added to the wishlist :(',
			httpStatus['500'],
			false
		);
		next(finalErr.message);
		res.send(false);
	}
};

const handlePurchaseFulfillment = async (data) => {
	try {
		const item = await Item.findOne({ priceId: data.metadata.priceId });
		const [buyer, seller] = await Promise.all([
			User.findOne({ email: data.customer_email })
				.select({ name: 1, email: 1 })
				.lean(),
			User.findById(item.sellerId).select({ name: 1, email: 1 }).lean(),
		]);

		item.status = 0; // Shows that the item is sold
		item.buyerId = buyer._id; // Setting the buyer of the item
		await item.save();

		// Send mail to buyer and seller (Also, stripe sends the receipt to the buyer only)
		await Promise.all([
			sendEmail(confirmationForSeller(seller, item, buyer)),
			sendEmail(confirmationForBuyer(buyer, item, seller)),
		]);
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
		const item = await Item.findById(req.params.itemId).lean();
		const itemImagesPaths = getImagesFromS3(item.pictures);
		const seller = await User.findById(item.sellerId)
			.select({
				name: 1,
				picture: 1,
				email: 1,
				rating: 1,
			})
			.lean();

		const faqs = await Faq.find({ itemId: item._id });
		res.render('checkout', { user, item, itemImagesPaths, seller, faqs });
	} catch (error) {
		const finalErr = new AppError(
			"Cannot find the item you're looking for :(",
			httpStatus.NOT_FOUND,
			true
		);
		next(finalErr);
		req.flash('notification', finalErr.message);
		res.redirect('/listings');
	}
};

/**
 * Checkout success
 */
exports.checkoutSuccess = async (req, res, next) => {
	const { session_id } = req.query;
	if (session_id === undefined || session_id === null) {
		return res.redirect('/listings');
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
			return res.redirect('/listings');
		}
		if (checkout_session.customer_email === req.user.email) {
			return res.render('checkout-success', {
				user: req.user,
				checkout_session,
			});
		}
		return res.redirect('/listings');
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
			success_url: `${BASE_URL}/item/checkout/success?session_id={CHECKOUT_SESSION_ID}`,

			/**
			 * Redirect to item checkout page if user clicks away/cancels checkout
			 */
			cancel_url: `${BASE_URL}/item/checkout/${itemId}`,
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
		res.redirect(`${BASE_URL}/item/checkout/${itemId}`);
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
		handlePurchaseFulfillment(data.object);
	}

	res.sendStatus(200);
};
