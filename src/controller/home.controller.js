'use-strict';
const httpStatus = require('http-status');
const { Item } = require('../models/index');
const AppError = require('../utils/error.utils');

exports.homeGET = async (req, res, next) => {
	try {
		const items = await Item.find(
			{
				$and: [{ sellerId: { $ne: req.user.id } }, { status: 1 }],
			},
			{
				createdAt: 0,
				updatedAt: 0,
				__v: 0,
			}
		);

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
