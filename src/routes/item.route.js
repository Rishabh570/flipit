const express = require('express');
const {validate} = require('express-validation');
const bodyParser = require('body-parser');
const { sell } = require('../validations/item.validation');
const {sellGET, sellPOST} = require('../controller/item.controller');
const {verifyJWT} = require('../middlewares/auth');
const { STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET } = require('../config/vars');
const stripe = require('stripe')(STRIPE_SECRET_KEY);
const  { Item } = require('../models/index');
const { handlePurchaseFulfillment } = require('../controller/item.controller');

const router = express.Router();


/**
 * Routes for posting an item to sell
 */
router.get('/sell', verifyJWT(), sellGET);
router.post('/sell', verifyJWT(), validate(sell), sellPOST);


/**
 * Route for checkout page
 */
router.get('/checkout/:itemId', verifyJWT(), async (req, res) => {
	const item = await Item.findById(req.params.itemId);
	res.render('checkout', {user: req.user, item: item});
});


/**
 * Retrieves the price Id (registered with stripe) for a 
 * particular product (registered with stripe). This is needed
 * for a successful checkout procedure.
 */
router.get('/retrieve-price/:priceId', verifyJWT(), async (req, res) => {
	const {priceId} =  req.params ;
	try {
		const price = await stripe.prices.retrieve(priceId);
	
		res.send({
			publicKey: STRIPE_PUBLISHABLE_KEY,
			unitAmount: price.unit_amount,
			currency: price.currency,
		});
	}
	catch(err) {
		console.log("Error in /retrieve-prices/:priceId, err = ", err.message);
		throw err;
	}
});


/**
 * Creates a checkout session when a user initiates
 * a purchase process by clicking "Buy" on checkout page
 * for any item.
 */
router.post('/create-checkout-session', verifyJWT(), async (req, res) => {
	const {priceId} = req.body;
	try {
		const session = await stripe.checkout.sessions.create({
			customer_email: req.user.email,
			metadata: {priceId: priceId},
			payment_method_types: ['card'],
			mode: 'payment',
			line_items: [{
				quantity: 1,
				price: priceId,
			}],
	
			// ?session_id={CHECKOUT_SESSION_ID} means the redirect will have the session ID set as a query param
			success_url: `https://localhost:3000/v1/status`,	// TODO: redirect to home and notify payment succeeded
			cancel_url: `https://localhost:3000/v1`,			// TODO: redirect to item checkout page and notify payment failed
		});
		
		res.send({
			sessionId: session.id,
		});
	}
	catch(err) {
		console.log("error in /create-checkout-session, err = ", err.message);
		throw err;
	}
});


/**
 * This is route for incoming webhook from stripe,
 * takes care of post purchase fulfillment process.
 * 
 * Handles:
 * 1. checkout.session.completed = When payment is successful.
 */
router.post('/webhook', bodyParser.raw({type: 'application/json'}), (req, res) => {
	let data;
	let eventType;

	if (STRIPE_WEBHOOK_SECRET) {
		let event;
		let signature = req.headers['stripe-signature'];
	
		try {
			event = stripe.webhooks.constructEvent(req.body, signature, STRIPE_WEBHOOK_SECRET);
		} 
		catch (err) {
			console.log(`⚠️  Webhook signature verification failed. err = `, err.message);
			return res.sendStatus(400);
		}
		data = event.data;
		eventType = event.type;
	} 
	else {
		// If secret is not configured in .env,
		// retrieve the event data directly from the request body.
		data = req.body.data;
		eventType = req.body.type;
	}

	if (eventType === 'checkout.session.completed') {
		console.log(`🔔  Payment received!`);
		handlePurchaseFulfillment(data.object);
	}
  
	res.sendStatus(200);
})


// EXPORTS
module.exports = router;
