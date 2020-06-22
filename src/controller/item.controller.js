const { Item, User } = require('../models/index');
const { createStripeEntry } = require('../utils/item.utils');
const { MAX_PRODUCT_IMAGES_ALLOWED } = require('../config/vars');
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
		if(req.files.length === 0) {
			throw Error("Please add product images!");
		}
		else if(req.files.length > MAX_PRODUCT_IMAGES_ALLOWED) {
			throw Error(`You can only upload maximum of ${MAX_PRODUCT_IMAGES_ALLOWED} images of the product.`);
		}
		const pictures_array = req.files.map(picture => picture.filename);
		req.body.pictures = pictures_array;		// Store only names of the pictures in DB, actual blob will be saved in S3
		const item = await new Item(req.body).save();
		await createStripeEntry(item);	// Try to put this task in the background when handling concurrency
		res.redirect('/v1');
	}
	catch(err) {
		console.log("Error in sellPOST controller, err = ", err.message);
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
	
		// Send mail to buyer and seller (This is handled by stripe now, not tested on live yet.)
		// await sendEmail(confirmationForSeller(seller, item, buyer));
		// await sendEmail(confirmationForBuyer(buyer, item, seller));
	}
	catch(err) {
		console.log("Error in handlePurchaseFulfillment, err = ", err.message);
		throw err;
	}
}
