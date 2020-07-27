'use-strict';
const { User } = require('../models/index');
const AppError = require('../utils/error.utils');
const httpStatus = require('http-status');

/**
 * Profile controller
 */
exports.profileGET = (req, res) => {
	res.render('profile', { user: req.user });
};

exports.profilePOST = async (req, res, next) => {
	const { user } = req;
	const { name } = req.body;
	try {
		const userObj = await User.findById(user.id);
		userObj.name = name;
		await userObj.save();
		res.redirect('/profile');
	} catch (err) {
		const finalErr = new AppError(
			'Something went wrong while updating profile',
			httpStatus['500'],
			false
		);
		next(finalErr);
		req.flash('notification', finalErr.message);
		res.redirect('/profile');
	}
};
