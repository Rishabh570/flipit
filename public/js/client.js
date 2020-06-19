/* Handle any errors returns from Checkout  */
let handleResult = function (result) {
	console.log('In handleResult, result = ', result);
	if (result.error) {
		let displayError = document.getElementById('error-message');
		displayError.textContent = result.error.message;
	}
};
  
// Create a Checkout Session
let createCheckoutSession = (priceId) => {
	return fetch('/v1/item/create-checkout-session', {
		method: 'POST',
	  	headers: {
			'Content-Type': 'application/json',
	  	},
	  	body: JSON.stringify({
			priceId: priceId
	  	}),
	})
	.then(result => {
	  	return result.json();
	})
	.catch(err => {
		throw err;
	})
};
  

let containerEle = document.getElementsByClassName('container')[0];
let priceId = containerEle.getAttribute('id');
const url = `/v1/item/retrieve-price/${priceId}`;

/* Get your Stripe publishable key to initialize Stripe.js */
fetch(url)
.then(result => {
	return result.json();
})
.then(json => {
	window.config = json;
  	let stripe = Stripe(config.publicKey);
	  
	// Setup event handler to create a Checkout Session on submit
  	document.querySelector('#submit').addEventListener('click', function (evt) {
		createCheckoutSession(priceId)
		.then(data => {
			stripe.redirectToCheckout({
				sessionId: data.sessionId,
			})
			.then(handleResult);
		});
	});
})
.catch(err => {
	throw err;
});
  