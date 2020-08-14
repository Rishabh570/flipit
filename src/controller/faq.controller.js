'use-strict';
const { Faq } = require('../models/index');

exports.addFaq = async (req, res, next) => {
	const { question, answer, itemId } = req.body;
	try {
		await Faq.create({ itemId, question, answer });
		return res.send(true);
	} catch (err) {
		next(err);
		return res.send(false);
	}
};
