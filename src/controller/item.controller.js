// const httpStatus = require('http-status');
const { Item } = require('../models/index');
const { createStripeEntry } = require('../utils/item.utils');


/**
 * Sell item controller
 */
exports.sellGET = (req, res, next) => {
	res.render('sell', {user: req.user});
}

exports.sellPOST = async (req, res, next) => {
	try {
		req.body.ownerId = req.user.id;
		const item = await new Item(req.body).save();
		await createStripeEntry(item);
		res.redirect('/v1');
	}
	catch(err) {
		console.log("Error in sellPOST controller");
		throw err;
	}
}
