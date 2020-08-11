const priceId = $(".main-box").attr("id");
const itemId = $('#item_id').val();
const csrfToken = $('#_csrf').val();
const modalToggleBtn = $('#modalToggleBtn');
const confirmActionCsrf = $('#confirm-action-csrf').val();
const confirmActionPassword = $('#confirmActionPassword');
let confirmActionPasswordValue = null;
confirmActionPassword.on('change', e => {
	confirmActionPasswordValue = e.target.value;
})
$('#confirmActionPassword').keyup(function(e) {
	if(e.keyCode === 13) {
		e.preventDefault();
		$('#sub').click();
	}
})


/* Handle any errors returns from Checkout  */
const handleResult = function (result) {
	if (result.error) {
		const displayError = document.getElementById('error-message');
		displayError.textContent = result.error.message;
	}
};


$('.clipboard').click(function(e) {
	console.log("clip clicked");
	const el = document.createElement('textarea');
	el.value = `https://localhost:3000/item/checkout/${$(this).attr('id')}`;
	el.setAttribute('readonly', '');
	el.style.position = 'absolute';
	el.style.left = '-9999px';
	document.body.appendChild(el);
	el.select();
	document.execCommand('copy');
	document.body.removeChild(el);
})


// ask the seller
$('#ats-submit').click(function(e) {
	e.preventDefault();
	const _csrf = $('#ats-csrf').val();
	const message = $('#ats-message').val();
	const itemId = $('#ats-item').val();	
	const recepientEmail = $('#ats-email').val();
	if(!recepientEmail || !message) {
		Toastify({
 			text: 'Please fill the missing fields',
			backgroundColor: 'darkcyan'
		}).showToast();
		return;
	}

	$.ajax({
		url: '/ask-seller',
		method: 'POST',
		data: {_csrf, message, itemId, recepientEmail},
		dataType: 'json'
	})
	.done(isDone => {
		$('#ats-cancel').click();
		$('#ats-message').html("");
		Toastify({
			text: 'Mail sent',
			backgroundColor: 'darkcyan'
		}).showToast();
	})
	.fail(err => {
		$('#ats-cancel').click();
		$('#ats-message').html("");
		Toastify({
			text: 'Something went wrong!',
			backgroundColor: 'darkcyan'
		}).showToast();
	})
})


// Create a Checkout Session
const createCheckoutSession = (priceId, itemId, _csrf) => {
	return fetch('/item/create-checkout-session', {
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
	return fetch('/auth/confirm-action', {
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
		confirmActionPassword.val("");
		if(result.status == 200) {
			Toastify({
				text: 'Redirecting you to checkout, please wait ⏳',
				backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
				className: "info",
				duration: 6000,
			}).showToast();
		}
		else {
			Toastify({
				text: 'Password is incorrect, please try again!',
				backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
				className: "info",
			}).showToast();
		}
		return result;
	})
}

/* Get your Stripe publishable key to initialize Stripe.js */
fetch('/item/get-stripe-pubkey')
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
