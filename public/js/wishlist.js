$('.wishlist-remove').click(function(e) {
	e.preventDefault();
	const itemId = $(this).attr('id');
	const _csrf = $('meta[name=_csrf]')[0].content;

	$.ajax({
		url: '/item/wishlist',
		method: 'POST',
		data: {itemId, _csrf},
		dataType: 'json'
	})
	.done(isDone => {
		Toastify({
			text: 'Item removed from wishlist',
			backgroundColor: 'darkcyan',
		}).showToast();	
		const parentDiv = $(this).parents()[2];
		parentDiv.style.display = 'none';
	})
	.fail(err => {
		console.log('err while removing from wishlist: ', err);
	})

})
