'use-strict';
const fs = require('fs');
const AWS = require('aws-sdk');
const httpStatus = require('http-status');
const AppError = require('../utils/error.utils');
const {
	AWS_BUCKET_NAME,
	CLOUDFRONT_URL,
	AWS_ACCESS_KEY_ID,
	AWS_SECRET_ACCESS_KEY,
	STRIPE_SECRET_KEY,
} = require('../config/vars');
const stripe = require('stripe')(STRIPE_SECRET_KEY);

async function createStripeEntry(item) {
	try {
		const product = await stripe.products.create({
			name: item.name,
		});
		const price = await stripe.prices.create({
			product: product.id,
			unit_amount: item.price * 100, // For converting to rupees (defaults to paisa)
			currency: 'inr',
		});
		item.priceId = price.id; // Saving the stripe Price obj id to DB
		await item.save();
	} catch (error) {
		throw new AppError(
			'Something went wrong in creating stripe entry',
			httpStatus.INTERNAL_SERVER_ERROR,
			false
		);
	}
}

async function uploadToS3(files) {
	const s3Bucket = new AWS.S3({
		accessKeyId: AWS_ACCESS_KEY_ID,
		secretAccessKey: AWS_SECRET_ACCESS_KEY,
		Bucket: AWS_BUCKET_NAME,
	});

	const promises = files.map((picture) => {
		return new Promise((resolve) => {
			fs.readFile(`${picture.path}`, (err, fileContent) => {
				if (err) {
					throw new AppError(
						'Something went wrong 😞',
						httpStatus['500'],
						false
					);
				}
				const params = {
					Bucket: AWS_BUCKET_NAME,
					Key: picture.filename,
					Body: fileContent,
					/**
					 * Without this, s3 saves it as an binary octet stream
					 * and forces to download instead of showing the image
					 */
					ContentType: 'image/png',
				};

				s3Bucket.upload(params, (err) => {
					if (err) {
						throw new AppError(
							'Something went wrong 😞',
							httpStatus['500'],
							false
						);
					}
					fs.unlink(picture.path, (err) => {
						if (err) console.log('err in unlinking');
						else console.log('unlink done');
					});
					resolve(fileContent);
				});
			});
		});
	});

	const imageUrl = await Promise.all(promises);
	return imageUrl[0];
}

/**
 * We use AWS Cloudfront to access images from S3
 * NOTE: You can't access the images by directly visiting the s3 hosted URL
 */
function getImagesFromS3(files) {
	const images = [];
	files.map((picture) => {
		images.push(`${CLOUDFRONT_URL}/${picture}`);
	});
	return images;
}

// EXPORTS
module.exports = {
	uploadToS3,
	createStripeEntry,
	getImagesFromS3,
};
