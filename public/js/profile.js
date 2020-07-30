$('#avatar-upload').css('display', 'none');
$('#avatar-form-submit').css('display', 'none');

$('#avatar-upload').click(e => {
	setTimeout(() => {
		$('#avatar-form-submit').css('display', 'block');
	}, 1000);
})

$('#avatar').click(e => {
	$('#avatar-upload').click();
})
