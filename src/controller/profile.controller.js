'use-strict';
/**
 * Profile controller
 */
exports.profileGET = (req, res) => {
	res.render('profile', { user: req.user });
};
