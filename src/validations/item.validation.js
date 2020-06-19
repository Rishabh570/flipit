const {Joi} = require("express-validation");

module.exports = {
	// POST /v1/item/sell
	sell: {
		body: Joi.object({
			name: Joi.string()
					.required(),
			price: Joi.number()
					.required(),
			condition: Joi.number()
						.required()
		})
	},
};
