// const httpStatus = require('http-status');
const { Item, User } = require('../models/index');
const { createStripeEntry } = require('../utils/item.utils');
const {sendEmail, confirmationForBuyer, confirmationForSeller} = require('../utils/email.utils');

/**
 * Sell item controller
 */
exports.sellGET = (req, res, next) => {
	res.render('sell', {user: req.user});
}

exports.sellPOST = async (req, res, next) => {
	try {
		req.body.sellerId = req.user.id;
		const item = await new Item(req.body).save();
		await createStripeEntry(item);
		res.redirect('/v1');
	}
	catch(err) {
		console.log("Error in sellPOST controller");
		throw err;
	}
}

exports.handlePurchaseFulfillment = async (data) => {
	try {
		const item = await Item.findOne({priceId: data.metadata.priceId});	
		const buyer = await User.findOne({email: data.customer_email});
		const seller = await User.findById(item.sellerId);
		
		item.status = 0;	// Shows that the item is sold
		item.buyerId = buyer.id;	// Setting the buyer of the item
		await item.save();
	
		// Send mail to buyer and seller
		await sendEmail(confirmationForSeller(seller, item, buyer));
		await sendEmail(confirmationForBuyer(buyer, item, seller));
	}
	catch(err) {
		console.log("Error in handlePurchaseFulfillment, err = ", err.message);
		throw err;
	}
}
