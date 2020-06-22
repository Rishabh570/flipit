// import .env variables
require('dotenv-safe').config();

const env = process.env; // this has ".env" keys & values

module.exports = {
	env: env.NODE_ENV,
	port: env.PORT,
	JWT_SECRET: env.JWT_SECRET,
	JWT_EXPIRATION_MINUTES: env.JWT_EXPIRATION_MINUTES,
	RESET_TOKEN_EXPIRATION_MINUTES: env.RESET_TOKEN_EXPIRATION_MINUTES,
	GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
	FACEBOOK_APP_ID: env.FACEBOOK_APP_ID,
	FACEBOOK_APP_SECRET: env.FACEBOOK_APP_SECRET,
	COOKIE_SECRET: env.COOKIE_SECRET,
	SENDGRID_USERNAME: env.SENDGRID_USERNAME,
	SENDGRID_API_KEY: env.SENDGRID_API_KEY,
	EMAIL_TEMPLATE_BASE: env.EMAIL_TEMPLATE_BASE,
	EMAIL_FROM_SUPPORT: env.EMAIL_FROM_SUPPORT,
	UPLOAD_LIMIT: 5, // MB
	mongo: {
		uri: env.NODE_ENV === 'test' ? env.MONGO_URI_TESTS : env.MONGO_URI
	},
	logs: env.NODE_ENV === 'production' ? 'combined' : 'dev',
	STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
	STRIPE_PUBLISHABLE_KEY: env.STRIPE_PUBLISHABLE_KEY,
	STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET,
	MAX_PRODUCT_IMAGES_ALLOWED: env.MAX_PRODUCT_IMAGES_ALLOWED
}
