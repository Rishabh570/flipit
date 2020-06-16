const initializeQtyBtnsState = () => {
	const inputEl = document.getElementById('quantity-input');
	const maxQty = inputEl.getAttribute('max');
	const addBtn = document.getElementById('add');
	const subtractBtn = document.getElementById('subtract');
	subtractBtn.disabled = true;
	if(maxQty == 1) {
		addBtn.disabled = true;
	}
}

/* Method for changing the product quantity when a customer clicks the increment / decrement buttons */
let updateQtyBtnsState = function (evt) {
	if (evt && evt.type === 'keypress' && evt.keyCode !== 13) {
	  return;
	}
  
	const isAdding = evt && evt.target.id === 'add';
	const inputEl = document.getElementById('quantity-input');
	const submitBtn = document.getElementById('submit');
	const addBtn = document.getElementById('add');
	const subtractBtn = document.getElementById('subtract');
	const maxQty = inputEl.getAttribute('max');	
	
	const currentQuantity = parseInt(inputEl.value);
  
	// Calculate new quantity
	const quantity = evt
	? isAdding
	? currentQuantity + 1
	: currentQuantity - 1
	: currentQuantity;
	
	// Update number input with new value.
	inputEl.value = quantity;

	// Calculate the total amount and format it to show in the "Buy" button.
	let amount = config.unitAmount;
	let totalAmount = amount * quantity;
	// Show total Amount in the buy button
	submitBtn.innerHTML = `Buy for ${totalAmount}`;

	// Disable quantity buttons if they reach their respective limit
	if(quantity == maxQty) {
		addBtn.disabled = true;
	}
	if(quantity == 1) {
		subtractBtn.disabled = true;
	}
};
  
  /* Attach method */
  Array.from(document.getElementsByClassName('increment-btn')).forEach(
	(element) => {
	  element.addEventListener('click', updateQtyBtnsState);
	}
  );
  
  /* Handle any errors returns from Checkout  */
  let handleResult = function (result) {
	  console.log('In handleResult, result = ', result);
	if (result.error) {
	  let displayError = document.getElementById('error-message');
	  displayError.textContent = result.error.message;
	}
  };
  
  // Create a Checkout Session with the selected quantity
  let createCheckoutSession = function (priceId) {
	let inputEl = document.getElementById('quantity-input');
	let quantity = parseInt(inputEl.value);
	
	return fetch('/v1/item/create-checkout-session', {
	  method: 'POST',
	  headers: {
		'Content-Type': 'application/json',
	  },
	  body: JSON.stringify({
		quantity: quantity,
		priceId: priceId
	  }),
	})
	.then(function (result) {
	  	return result.json();
	})
	.catch(err => {
		console.log("Err = ", err.message);
		throw err;
	})
  };
  

  let containerEle = document.getElementsByClassName('container')[0];
  let priceId = containerEle.getAttribute('id');
  const url = `/v1/item/retrieve-price/${priceId}`;

  /* Get your Stripe publishable key to initialize Stripe.js */
  fetch(url)
	.then(function (result) {
	  return result.json();
	})
	.then(function (json) {
	  window.config = json;
	  let stripe = Stripe(config.publicKey);
	  initializeQtyBtnsState();		// Initializes the quantity buttons state on checkout page
	  
	  // Setup event handler to create a Checkout Session on submit
	  document.querySelector('#submit').addEventListener('click', function (evt) {
		createCheckoutSession(priceId).then(function (data) {
		  stripe
			.redirectToCheckout({
			  sessionId: data.sessionId,
			})
			.then(handleResult);
		});
	  });
	})
	.catch(err => {
		console.log("throwing further...");
		throw err;
	})
  