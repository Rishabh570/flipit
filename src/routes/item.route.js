const express = require('express');
const {validate} = require('express-validation');
const { sell } = require('../validations/item.validation');
const {sellGET, sellPOST} = require('../controller/item.controller');
const {verifyJWT} = require('../middlewares/auth');
const { STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY } = require('../config/vars');
const stripe = require('stripe')(STRIPE_SECRET_KEY);
const  { Item } = require('../models/index');

const router = express.Router();


router.get('/sell', verifyJWT(), sellGET);
router.post('/sell', verifyJWT(), validate(sell), sellPOST);

/**
 * Payments using stripe
 */
router.get('/checkout/:itemId', verifyJWT(), async (req, res) => {
	console.log("In checkout router...");
	const item = await Item.findById(req.params.itemId);
	res.render('checkout', {user: req.user, item: item});
});

router.get('/retrieve-price/:priceId', verifyJWT(), async (req, res) => {
	const {priceId} =  req.params ;
	const price = await stripe.prices.retrieve(priceId);

	res.send({
	  publicKey: STRIPE_PUBLISHABLE_KEY,
	  unitAmount: price.unit_amount,
	  currency: price.currency,
	});
});

router.post('/create-checkout-session', verifyJWT(), async (req, res) => {
	const {quantity, priceId} = req.body;

	const session = await stripe.checkout.sessions.create({
		payment_method_types: ['card'],
		mode: 'payment',
		line_items: [
		  {
			price: priceId,
			quantity: quantity
		  },
		],
		// ?session_id={CHECKOUT_SESSION_ID} means the redirect will have the session ID set as a query param
		success_url: `https://localhost:3000/v1/status`,	// TODO: redirect to home and notify payment succeeded
		cancel_url: `https://localhost:3000/v1`,			// TODO: redirect to item checkout page and notify payment failed
	  });
	
	  res.send({
		sessionId: session.id,
	  });
});


module.exports = router;
