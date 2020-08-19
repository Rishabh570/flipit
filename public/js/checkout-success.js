let rating = 0;
$('.ratings-input-class').click(function(e) {
	e.preventDefault();
	rating = $(this).val();
})

$('#review-form-submit').click(function(e) {
	e.preventDefault();
	const stripePriceId = $('input[name=priceId]').val();
	const _csrf = $('meta[name=_csrf]')[0].content;
	
	$.ajax({
		url: '/review',
		method: 'POST',
		data: { rating, stripePriceId, _csrf },
		dataType: 'json'
	})
	.done(isDone => {
		Toastify({
			text: 'Thanks for your feedback 🎉',
			backgroundColor: 'darkcyan',
		}).showToast();
	})
	.fail(err => {
		Toastify({
			text: 'Something went wrrongg!',
			backgroundColor: 'darkcyan',
		}).showToast();
	})
})
