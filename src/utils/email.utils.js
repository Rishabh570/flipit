const fs = require('fs');
const ejs = require('ejs');
const sgMail = require('@sendgrid/mail');
const { SENDGRID_API_KEY, EMAIL_TEMPLATE_BASE, EMAIL_FROM_SUPPORT } = require('../config/vars');


/** 
 * Templates fetcher
 */
const genFromTemplate = (fileName, data) => {
	const content = fs.readFileSync(EMAIL_TEMPLATE_BASE + fileName, 'utf8');
	const compiledVersion = ejs.compile(content);
	return compiledVersion(data);
}


/**
 * Templates for Emails
 */

// 1. Forgot Password Email Template
function forgotPasswordEmail({ name, email, passResetLink }) {
	return {
		from: EMAIL_FROM_SUPPORT,
		to: `${name} <${email}>`,
		subject: `Flipit: Your password reset link`,
		text: genFromTemplate('forgot-password.txt', { name, passResetLink }),
		html: genFromTemplate('forgot-password.html', { name, passResetLink })
	};
  }


function sendEmail(emailContent) {
	return new Promise((resolve, reject) => {
		try {
			sgMail.setApiKey(SENDGRID_API_KEY);
			
			sgMail.send(emailContent, (err, data) => {
				if(err) {
					console.log("ERROR: some err occured while sending mail :(");
					reject(err);
				} else {
					console.log("MAIL SENT!!");
					resolve(data);
				}
			});
		}
		catch(err) {
			console.log("SEND EMAIL ERROR = ", err.message);
			reject(err);
		}
	})
}


module.exports = {
	sendEmail,
	forgotPasswordEmail	
};
