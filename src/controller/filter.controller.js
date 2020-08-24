'use-strict';
const { Item } = require('../models/index');

exports.bill = async (req, res, next) => {
	try {
		const items = await Item.find({
			$and: [
				{ sellerId: { $ne: req.user.id } },
				{ bill: true },
				{ status: 1 },
			],
		}).lean();
		console.log('items: ', items);
		return res.send(items);
	} catch (err) {
		console.log('bill err: ', err);
		next(err);
		return res.send(false);
	}
};
