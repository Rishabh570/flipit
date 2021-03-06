'use-strict';
const fs = require('fs');
const ejs = require('ejs');
const sgMail = require('@sendgrid/mail');
const {
	SENDGRID_API_KEY,
	EMAIL_TEMPLATE_BASE,
	EMAIL_FROM_SUPPORT,
} = require('../config/vars');

/**
 * Templates fetcher
 */
const genFromTemplate = (fileName, data) => {
	const content = fs.readFileSync(EMAIL_TEMPLATE_BASE + fileName, 'utf8');
	const compiledVersion = ejs.compile(content);
	return compiledVersion(data);
};

/**
 * Templates for Emails
 */

// 1. Forgot password email template
function forgotPasswordEmail({ name, email, passResetLink }) {
	return {
		from: EMAIL_FROM_SUPPORT,
		to: `${name} <${email}>`,
		subject: 'Flipit: Your password reset link',
		text: genFromTemplate('forgot-password.txt', { name, passResetLink }),
		html: genFromTemplate('forgot-password.html', { name, passResetLink }),
	};
}

// 2. Item purchase successful email template for the "Seller"
function confirmationForSeller(seller, itemSold, buyer) {
	return {
		from: EMAIL_FROM_SUPPORT,
		to: `${seller.name} <${seller.email}>`,
		subject: `Congrats!!! Someone bought ${itemSold.name} for ₹${itemSold.price}! 💵💵💵`,
		text: genFromTemplate('sold-confirmation-seller.txt', {
			seller,
			itemSold,
			buyer,
		}),
		html: genFromTemplate('sold-confirmation-seller.html', {
			seller,
			itemSold,
			buyer,
		}),
	};
}

// 3. Item purchase successful email template for the "Buyer"
function confirmationForBuyer(buyer, itemSold, seller) {
	return {
		from: EMAIL_FROM_SUPPORT,
		to: `${buyer.name} <${buyer.email}>`,
		subject: `Congrats!!! Purchase of ${itemSold.name} is completed successfully! 🎉🎉🎉`,
		text: genFromTemplate('bought-confirmation-buyer.txt', {
			buyer,
			itemSold,
			seller,
		}),
		html: genFromTemplate('bought-confirmation-buyer.html', {
			buyer,
			itemSold,
			seller,
		}),
	};
}

// 4. Ask the seller
function askSeller(sellerName, sellerEmail, itemName, message, recepientEmail) {
	return {
		from: EMAIL_FROM_SUPPORT,
		to: `${sellerName} <${sellerEmail}>`,
		subject: `Query regarding your listing ${itemName}`,
		text: genFromTemplate('ask-seller.txt', {
			sellerName,
			sellerEmail,
			itemName,
			message,
			recepientEmail,
		}),
		html: genFromTemplate('ask-seller.html', {
			sellerName,
			sellerEmail,
			itemName,
			message,
			recepientEmail,
		}),
	};
}

/**
 * Send Email function
 */
function sendEmail(emailContent) {
	return new Promise((resolve, reject) => {
		try {
			sgMail.setApiKey(SENDGRID_API_KEY);

			sgMail.send(emailContent, (err, data) => {
				if (err) reject(err);
				else resolve(data);
			});
		} catch (err) {
			reject(err);
		}
	});
}

// EXPORTS
module.exports = {
	sendEmail,
	askSeller,
	forgotPasswordEmail,
	confirmationForSeller,
	confirmationForBuyer,
};
