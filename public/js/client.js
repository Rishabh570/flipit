const priceId = $(".item-name").attr("id");
const itemId = $('#item_id').val();
const csrfToken = $('#_csrf').val();
const modalToggleBtn = $('#modalToggleBtn');
const confirmActionCsrf = $('#confirm-action-csrf').val();
const confirmActionCancel = $('#confirmActionCancel');
const confirmActionPassword = $('#confirmActionPassword');
let confirmActionPasswordValue = null;
confirmActionPassword.addEventListener('change', (e) => {
	confirmActionPasswordValue = e.target.value;
});


/* Handle any errors returns from Checkout  */
const handleResult = function (result) {
	if (result.error) {
		const displayError = document.getElementById('error-message');
		displayError.textContent = result.error.message;
	}
};

// Clears the password confirmation input on close w/o submit

confirmActionCancel.addEventListener('click', (e) => {
	confirmActionPassword.value = "";
})



// Create a Checkout Session
const createCheckoutSession = (priceId, itemId, _csrf) => {
	return fetch('/v1/item/create-checkout-session', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			itemId,
			priceId,
			_csrf,
		}),
	})
	.then(result => {
		return result.json();
	})
	.catch(err => {
		throw err;
	});
};


// Get action confirmation
const confirmAction = (password, itemId, _csrf) => {
	return fetch('/v1/auth/confirm-action', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			password,
			itemId,
			_csrf,
		})
	})
	.then(result => {
		modalToggleBtn.click();
		confirmActionPassword.value = '';
		return result;
	})
}


/* Get your Stripe publishable key to initialize Stripe.js */
fetch('/v1/item/get-stripe-pubkey')
	.then((result) => {
		return result.json();
	})
	.then((json) => {
		let stripe = Stripe(json.publicKey);

		// Setup event handler to create a Checkout Session on submit
		document.getElementById('sub').addEventListener('click', () => {
			confirmAction(confirmActionPasswordValue, itemId, confirmActionCsrf)
			.then(actionStatus => {
				if(actionStatus.status === 200) {
					createCheckoutSession(priceId, itemId, csrfToken)
					.then(data => {
						stripe.redirectToCheckout({
							sessionId: data.sessionId,
						})
						.then(handleResult);
					})
					.catch(err => {
						throw err;
					});
				}
			})
			.catch(err => {throw err}); 
		});
	})
	.catch((err) => {
		throw err;
	});
