'use-strict';
const express = require('express');
const bodyParser = require('body-parser');
const upload = require('../middlewares/upload');
const { verifyJWT } = require('../middlewares/auth');
const itemController = require('../controller/item.controller');
const { MAX_PRODUCT_IMAGES_ALLOWED } = require('../config/vars');

const router = express.Router();

/**
 * Shows listings posted by the logged in user
 */
router.route('/me').get(verifyJWT(), itemController.listings);

/**
 * Shows purchased items
 */
router.route('/purchased').get(verifyJWT(), itemController.purchased);

/**
 * Routes for posting an item to sell
 */
router
	.route('/sell')
	.get(verifyJWT(), itemController.sellGET)
	.post(
		verifyJWT(),
		upload.array('upload_imgs', MAX_PRODUCT_IMAGES_ALLOWED),
		itemController.sellPOST
	);

/**
 * Wishlist routes
 */
router
	.route('/wishlist')
	.get(verifyJWT(), itemController.wishlistGET)
	.post(verifyJWT(), itemController.wishlistPOST);

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
