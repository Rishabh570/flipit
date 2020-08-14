let itemIdSelectedForFaq = null;

$('#add-faq').click(function(e) {
	e.preventDefault();
	const _csrf = $('#add-faq-csrf').val();
	const question = $('#faq-form-ques').val();
	const answer = $('#faq-form-ans').val();

	// Validation
	if(
		question === undefined ||
		answer === undefined ||
		!question.length ||
		!answer.length) {
		Toastify({
			text: 'Please fill the missing fields',
		   	backgroundColor: 'darkcyan'
		}).showToast();
	   	return;
	}

	// Clear the input fields
	$('#faq-form-ques').val("");
	$('#faq-form-ans').val("");

	// Req to the backend
	$.ajax({
		url: '/faq/add',
		method: 'POST',
		data: {
			_csrf,
			question, 
			answer, 
			itemId: itemIdSelectedForFaq
		},
		dataType: 'json'
	})
	.done(() => {
		Toastify({
			text: 'Faq added successfully 🙂',
			backgroundColor: 'darkcyan'
		}).showToast();
	})
	.fail(() => {
		Toastify({
			text: 'Something went wrong!',
			backgroundColor: 'darkcyan'
		}).showToast();
	})


});

$('#cancel-faq').click(function(e) {
	e.preventDefault();
	$('#faq-form-ques').val("");
	$('#faq-form-ans').val("");
});

$('.add-faq-toggler').click(function(e) {
	itemIdSelectedForFaq = $(this).attr('id');
})
