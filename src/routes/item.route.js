'use-strict';
const express = require('express');
const bodyParser = require('body-parser');
const upload = require('../middlewares/upload');
const { verifyJWT } = require('../middlewares/auth');
const { sellGET, sellPOST } = require('../controller/item.controller');
const itemController = require('../controller/item.controller');
const { MAX_PRODUCT_IMAGES_ALLOWED } = require('../config/vars');

const router = express.Router();

/**
 * My listings route
 * Shows listings posted by the logged in user
 */
router.route('/me').get(verifyJWT(), itemController.listings);

/**
 * Purchased items route
 * Shows purchased items
 */
router.route('/purchased').get(verifyJWT(), itemController.purchased);

/**
 * Routes for posting an item to sell
 */
router
	.route('/sell')
	.get(verifyJWT(), sellGET)
	.post(
		verifyJWT(),
		upload.array('upload_imgs', MAX_PRODUCT_IMAGES_ALLOWED),
		sellPOST
	);

/**
 * Checkout successful page
 */
router
	.route('/checkout/success')
	.get(verifyJWT(), itemController.checkoutSuccess);

/**
 * Route for the product checkout page
 */
router.route('/checkout/:itemId').get(verifyJWT(), itemController.checkoutItem);

/**
 * Retrieves the stripe public key
 */
router
	.route('/get-stripe-pubkey')
	.get(verifyJWT(), itemController.stripePubKey);

/**
 * Creates a checkout session when a user initiates
 * a purchase process by clicking "Buy" on checkout page
 * for any item.
 */
router
	.route('/create-checkout-session')
	.post(verifyJWT(), itemController.createCheckoutSession);

/**
 * This is route for incoming webhook from stripe,
 * takes care of post purchase fulfillment process.
 *
 * Handles:
 * 1. checkout.session.completed = When payment is successful.
 */
router
	.route('/webhook')
	.post(bodyParser.raw({ type: 'application/json' }), itemController.webhook);

// EXPORTS
module.exports = router;
