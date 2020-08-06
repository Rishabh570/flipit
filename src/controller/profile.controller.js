'use-strict';
const { User } = require('../models/index');
const AppError = require('../utils/error.utils');
const httpStatus = require('http-status');
const { uploadToS3 } = require('../utils/item.utils');
const { CLOUDFRONT_URL } = require('../config/vars');

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
		const userObj = await User.findById(user.id).select({ name: 1 });
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

exports.updateAvatar = async (req, res, next) => {
	const { user } = req;
	try {
		const [avatarBuffer, userObj] = await Promise.all([
			uploadToS3(req.files),
			User.findById(user.id).select({ picture: 1 }),
		]);

		const imageUrl = `${CLOUDFRONT_URL}/${req.files[0].filename}`;
		userObj.picture = imageUrl;
		await userObj.save();

		const imgSrc =
			'data:image/jpeg;base64,' +
			new Buffer.from(avatarBuffer).toString('base64');
		return res.send(imgSrc);
	} catch (err) {
		const finalErr = new AppError(
			'Something went wrong :(',
			httpStatus['500'],
			false
		);
		next(finalErr);
		req.flash(finalErr.message);
		res.redirect('/profile');
	}
};
