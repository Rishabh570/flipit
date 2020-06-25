const { Item } = require('../models/index');

exports.homeGET = async (req, res) => {
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
};
