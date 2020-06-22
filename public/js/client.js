/* Handle any errors returns from Checkout  */
const handleResult = function (result) {
	if (result.error) {
		const displayError = document.getElementById('error-message');
		displayError.textContent = result.error.message;
	}
};

// Create a Checkout Session
const createCheckoutSession = (priceId, item_id) => {
	return fetch('/v1/item/create-checkout-session', {
		method: 'POST',
	  	headers: {
			'Content-Type': 'application/json',
	  	},
	  	body: JSON.stringify({
			itemId: item_id,
			priceId: priceId,
	  	}),
	})
	.then(result => {
	  	return result.json();
	})
	.catch(err => {
		throw err;
	})
};
  

const containerEle = document.getElementsByClassName('container')[0];
const priceId = containerEle.getAttribute('id');
const itemId = document.getElementById('item_id').value;

/* Get your Stripe publishable key to initialize Stripe.js */
fetch('/v1/item/get-stripe-pubkey')
.then(result => {
	return result.json();
})
.then(json => {
	let stripe = Stripe(json.publicKey);
	  
	// Setup event handler to create a Checkout Session on submit
  	document.querySelector('#submit').addEventListener('click', function (evt) {
		createCheckoutSession(priceId, itemId)
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
  