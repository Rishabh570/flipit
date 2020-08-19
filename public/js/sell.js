$(document).on('change', '.btn-file :file', function() {
	var input = $(this),
		numFiles = input.get(0).files ? input.get(0).files.length : 1,
		label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
	input.trigger('fileselect', [numFiles, label]);
});

$('.btn-file :file').on('fileselect', function(event, numFiles, label) {
	var input_label = $(this).closest('.input-group').find('.file-input-label'),
		log = numFiles > 1 ? numFiles + ' files selected' : label;

	if( input_label.length ) {
		input_label.text(log);
	} else {
		if( log ) alert(log);
	}
});

// Tooltip on condition ratings input
$('.rating__label').mouseover((e) => {
	const ratingVal = (e.target.id).split('-')[1];
	if(ratingVal === '1') $('#ratings-feedback').html("<small>Used for a significant amount of time 🐢</small>");
	else if (ratingVal === '2') $('#ratings-feedback').html("<small>Used for a little over one month 🗓️</small>");
	else if (ratingVal === '3') $('#ratings-feedback').html("<small>Celebrating its one week anniversary 😃</small>");
	else if (ratingVal === '4') $('#ratings-feedback').html("<small>Barely used it 📦</small>");
	else if (ratingVal === '5') $('#ratings-feedback').html("<small>Haven't used it once 🎉</small>");
})

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

// Show the add faq form
$('#right-form-heading a').click(function(e) {
	e.preventDefault();
	$('#faq-form-ques').val("");
	$('#faq-form-ans').val("");

	// Show the faq form
	$('#faq').show();
})

// Hide the add faq form
$('#cancel-faq').click(function(e) {
	e.preventDefault();
	$('#faq-form-ques').val("");
	$('#faq-form-ans').val("");

	// Hide the faq form
	$('#faq').hide();
})

// Adds the faq on the frontend
$('#add-faq').click(function(e) {
	e.preventDefault();
	const ques = $('#faq-form-ques').val();
	const ans = $('#faq-form-ans').val();
	if(
		ques === undefined ||
		ans === undefined || 
		!ques.length || 
		!ans.length) {
		Toastify({
			text: 'Please fill the missing fields',
		   backgroundColor: 'darkcyan'
		}).showToast();
	   return;
	}

	const childrenCnt = $('.accordian').children().length;
	
	// Hide the faq form
	$('#faq').hide();

	if(childrenCnt === 0) {
		$('.accordian').append(`
		<div class="card">
			<div class="card-header" id="heading-${childrenCnt}">
				<button class="btn btn-link faq-questions" type="button" data-toggle="collapse" data-target="#collapse-${childrenCnt}" aria-expanded="false" aria-controls="collapse-${childrenCnt}">
					${ques}
				</button>
			</div>
			
			<div id="collapse-${childrenCnt}" class="collapse show" aria-labelledby="heading-${childrenCnt}" data-parent="#accordionExample">
				<div class="card-body faq-answers">
					${ans}
				</div>
			</div>
		</div>
		`);
	}
	else {
		$('.accordian').append(`
		<div class="card">
			<div class="card-header" id="heading-${childrenCnt}">
				<button class="btn btn-link collapsed faq-questions" type="button" data-toggle="collapse" data-target="#collapse-${childrenCnt}" aria-expanded="false" aria-controls="collapse-${childrenCnt}">
					${ques}
				</button>
			</div>
			
			<div id="collapse-${childrenCnt}" class="collapse" aria-labelledby="heading-${childrenCnt}" data-parent="#accordionExample">
				<div class="card-body faq-answers">
					${ans}
				</div>
			</div>
		</div>
		`);
	}
});


// Submit form on clicking submit alias
$('#submit-alias').click(function(e) {
	e.preventDefault();
	$('#sell-form-submit').click();
})


// Sell form submit listener
$('#sell-form').submit(function(e) {
	e.preventDefault();
	const formData = new FormData($(this)[0]);
	const csrf = $('meta[name="_csrf"]').attr('content');
	const questions = $('.faq-questions');
	const answers = $('.faq-answers');

	let quesFaq = [...questions].map(question => question.innerText.trim());
	let ansFaq = [...answers].map(answer => answer.innerText.trim());
	quesFaq = [...quesFaq];
	ansFaq = [...ansFaq];

	formData.append('questions', JSON.stringify(quesFaq));
	formData.append('answers', JSON.stringify(ansFaq));

	$.ajax({
		url: '/item/sell',
		method: 'POST',
		data: formData,
		headers: {
			"CSRF-Token": csrf
		},
		xhrFields: {
			withCredentials: true
		},
		dataType: 'json',
		contentType: false,
        processData: false
	})
	.done(data => {
		Toastify({
			text: 'Item posted successfully 🙂',
			backgroundColor: 'darkcyan'
		}).showToast();
		window.location.href = '/listings';
	})
	.fail(err => {
		Toastify({
			text: 'Something went wrong!',
			backgroundColor: 'darkcyan'
		}).showToast();
	});
});

