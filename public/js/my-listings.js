let itemIdSelectedForFaq = null;

// HTML Escaper
const entityMap = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;',
	'/': '&#x2F;',
	'`': '&#x60;',
	'=': '&#x3D;'
  };
  
function escapeHtml (string) {
	return String(string).replace(/[&<>"'`=\/]/g, function (s) {
		return entityMap[s];
	});
}

// Caps the characters in faq ques and answer textfield
$('.inputs').on("keyup", function(e) {
	const quesInp = $(this).children('textarea');
	const maxLimit = quesInp.attr('id') === "faq-form-ques" ? 150 : 300;
	console.log(maxLimit);
	if(quesInp.val().length === maxLimit) {
		e.preventDefault();
	}
	else if(quesInp.val().length > maxLimit) {
		quesInp.val(quesInp.val().substring(0, maxLimit));
		return;
	}
	const countInp = $(this).children('small');
	countInp.text(`${quesInp.val().length}/${maxLimit} Characters`);
})

// Adds faq to the front-end
$('#add-faq').click(function(e) {
	e.preventDefault();
	const _csrf = $('#add-faq-csrf').val();
	const question = escapeHtml($('#faq-form-ques').val());
	const answer = escapeHtml($('#faq-form-ans').val());

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
	$('#ques-limit').text("0/150 Characters");
	$('#ans-limit').text("0/300 Characters");
})
