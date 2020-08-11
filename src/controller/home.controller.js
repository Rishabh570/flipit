'use-strict';
const httpStatus = require('http-status');
const { User, Item } = require('../models/index');
const AppError = require('../utils/error.utils');

const { sendEmail, askSeller } = require('../utils/email.utils');

exports.homeGET = async (req, res, next) => {
	try {
		const items = await Item.find({
			$and: [{ sellerId: { $ne: req.user.id } }, { status: 1 }],
		})
			.select({
				name: 1,
				description: 1,
				price: 1,
				condition: 1,
				pictures: 1,
			})
			.lean();

		res.render('home', { user: req.user, items });
	} catch (error) {
		const finalErr = new AppError(
			'Something went wrong while fetching data!',
			httpStatus.INTERNAL_SERVER_ERROR,
			false
		);
		next(finalErr);
		req.flash('notification', finalErr.message);
		res.redirect('/listings');
	}
};

exports.landingGET = async (req, res) => {
	res.render('landing');
};

exports.reviewPOST = async (req, res, next) => {
	const { rating, stripePriceId } = req.body;
	try {
		const itemObj = await Item.findOne({ priceId: stripePriceId })
			.select({ sellerId: 1 })
			.lean();
		const sellerObj = await User.findById(itemObj.sellerId).select({
			stars: 1,
		});
		const newRating = Math.ceil((sellerObj.stars + rating) / 2);
		sellerObj.stars = newRating;
		await sellerObj.save();
		return res.send(true);
	} catch (err) {
		next(err);
		return res.send(false);
	}
};

exports.askSeller = async (req, res, next) => {
	const { message, itemId, recepientEmail } = req.body;
	try {
		const itemObj = await Item.findById(itemId)
			.select({ name: 1, sellerId: 1 })
			.lean();
		const sellerObj = await User.findById(itemObj.sellerId)
			.select({ name: 1, email: 1 })
			.lean();
		sendEmail(
			askSeller(
				sellerObj.name,
				sellerObj.email,
				itemObj.name,
				message,
				recepientEmail
			)
		); // We are not awaiting for it
		return res.send(true);
	} catch (err) {
		next(err);
		return res.send(false);
	}
};
