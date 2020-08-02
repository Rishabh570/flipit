// Spinner class adding and removing based on ajax events
$(document).on({
    ajaxStart: function() { $('body').addClass("loading");    },
    ajaxStop: function() { $('body').removeClass("loading"); }    
});


$('#avatarInput').css('display', 'none');

$('.overlay').click(e => {
	$('#avatarInput').click();
})

$('#avatar-form').submit(function(e) {
	const formData = new FormData($(this)[0]);
	const csrf = $('meta[name="_csrf"]').attr('content');

	$.ajax({
		type: 'POST',
		url: '/profile/update-avatar',
		headers: {
			"CSRF-Token": csrf
		},
		xhrFields: {
			withCredentials: true
		},
		data: formData,
		contentType: false,
        processData: false
	})
	.done(data => {
		$('#avatar').attr('src', data);
		$('#avatar-nav').attr('src', data);
	})
	.fail(err => {
		console.log('Some error occured while updating avatar: ', err);
	})
	e.preventDefault();
})

$('#avatarInput').on("change", e => {
	$('#avatar-form').submit();
})
