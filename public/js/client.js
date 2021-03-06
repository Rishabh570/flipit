const priceId = $(".main-box").attr("id");
const itemId = $('#item_id').val();
const csrfToken = $('#_csrf').val();
const modalToggleBtn = $('#modalToggleBtn');
const confirmActionCsrf = $('#confirm-action-csrf').val();
const confirmActionPassword = $('#confirmActionPassword');
let confirmActionPasswordValue = null;

// Socket
var socket = io();
socket.emit('message', itemId);
socket.on('viewersCnt', data => {
	$('#currentViewers').text(data);
});

$(window).on("unload", function(e) {
	socket.emit('decrementViewers', itemId);
});


// event listeners

confirmActionPassword.on('change', e => {
	confirmActionPasswordValue = e.target.value;
})
$('#confirmActionPassword').keyup(function(e) {
	if(e.keyCode === 13) {
		e.preventDefault();
		$('#sub').click();
	}
})

// Copy to clipboard
$('.clipboard').click(function(e) {
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

// Click to zoom images
$('img[data-enlargable]').addClass('img-enlargable').click(function(){
    var src = $(this).attr('src');
    var modal;
    function removeModal(){ modal.remove(); $('body').off('keyup.modal-close'); }
    modal = $('<div>').css({
        background: 'RGBA(0,0,0,.5) url('+src+') no-repeat center',
        backgroundSize: 'contain',
        width:'100%', height:'100%',
        position:'fixed',
        zIndex:'10000',
        top:'0', left:'0',
        cursor: 'zoom-out'
    }).click(function(){
        removeModal();
    }).appendTo('body');
	
	//handling ESC
    $('body').on('keyup.modal-close', function(e){
      if(e.key==='Escape'){ removeModal(); } 
    });
});

// Save to wishlist
$('.bookmarker').click(function(e) {
	e.preventDefault();
	const itemId = $(this).attr('id');
	const _csrf = $('meta[name=_csrf]')[0].content;
	
	$.ajax({
		url: '/item/wishlist',
		method: 'POST',
		data: { itemId, _csrf },
		dataType: 'json'
	})
	.done(isWishlisted => {
		if(isWishlisted) {
			Toastify({
				text: 'Item saved to wishlist',
				backgroundColor: 'darkcyan',
			}).showToast();
 		} else {
			Toastify({
				text: 'Item removed from wishlist',
				backgroundColor: 'darkcyan',
			}).showToast();	
		}
	})
	.fail(err => {
		console.log("Save to wishlist failed");
	});

})

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

// Create a Checkout Session
const checkoutSession = () => {
	return fetch('/item/create-checkout-session', {
		method: 'POST',
		xhrFields: {
			withCredentials: true
		},
		headers: {
			'Content-Type': 'application/json',
			"CSRF-Token": csrfToken
		},
		body: JSON.stringify({
			itemId,
			priceId
		})
	})
	.then(result => {
		return result.json();
	})
	.catch(err => {
		throw err;
	});
}

const checkoutPromise = checkoutSession(); // Pre-fetches the response (promise) for perf

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
					checkoutPromise
					.then(data => {
						stripe.redirectToCheckout({
							sessionId: data.sessionId,
						})
					})
					.catch(err => {
						console.log('err: ', err);
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
