var Shuffle = window.Shuffle;

class Demo {
  constructor(element) {
    this.element = element;
    this.shuffle = new Shuffle(element, {
      itemSelector: '.picture-item',
      sizer: element.querySelector('.my-sizer-element'),
    });

    // Log events.
    this.addShuffleEventListeners();
    this._activeFilters = [];
    this.addFilterButtons();
    this.addSorting();
    this.addSearchFilter();
  }

  /**
   * Shuffle uses the CustomEvent constructor to dispatch events. You can listen
   * for them like you normally would (with jQuery for example).
   */
  addShuffleEventListeners() {
    this.shuffle.on(Shuffle.EventType.LAYOUT, (data) => {
      console.log('layout. data:', data);
    });
    this.shuffle.on(Shuffle.EventType.REMOVED, (data) => {
      console.log('removed. data:', data);
    });
  }

  addFilterButtons() {
    const options = document.querySelector('.filter-options');
    if (!options) {
      return;
    }
    
    const filterButtons = Array.from(options.children);
    const onClick = this._handleFilterClick.bind(this);
    filterButtons.forEach((button) => {
      button.addEventListener('click', onClick, false);
    });
  }

  _handleFilterClick(evt) {
    const btn = evt.currentTarget;
    const isActive = btn.classList.contains('active');
    const btnGroup = btn.getAttribute('data-group');
    
    this._removeActiveClassFromChildren(btn.parentNode);
    
    let filterGroup;
    if (isActive) {
      btn.classList.remove('active');
      filterGroup = Shuffle.ALL_ITEMS;
    } else {
      btn.classList.add('active');
      filterGroup = btnGroup;
    }
    
    this.shuffle.filter(filterGroup);
  }

  _removeActiveClassFromChildren(parent) {
    const { children } = parent;
    for (let i = children.length - 1; i >= 0; i--) {
      children[i].classList.remove('active');
    }
  }

  addSorting() {
    const buttonGroup = document.querySelector('.sort-options');
    if (!buttonGroup) {
      return;
    }
    buttonGroup.addEventListener('change', this._handleSortChange.bind(this));
  }

  _handleSortChange(evt) {
    // Add and remove `active` class from buttons.
    const buttons = Array.from(evt.currentTarget.children);
    buttons.forEach((button) => {
      if (button.querySelector('input').value === evt.target.value) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
    
    // Create the sort options to give to Shuffle.
    const { value } = evt.target;
    let options = {};
    
    function sortByDate(element) {
      return element.getAttribute('data-created');
    }
    
    function sortByTitle(element) {
      return element.getAttribute('data-title').toLowerCase();
    }
    
    if (value === 'date-created') {
      options = {
        reverse: true,
        by: sortByDate,
      };
    } else if (value === 'title') {
      options = {
        by: sortByTitle,
      };
    }
    this.shuffle.sort(options);
  }

  // Advanced filtering
  addSearchFilter() {
    const searchInput = document.querySelector('.js-shuffle-search');
    if (!searchInput) {
      return;
    }
    searchInput.addEventListener('keyup', this._handleSearchKeyup.bind(this));
  }

  /**
   * Filter the shuffle instance by items with a title that matches the search input.
   * @param {Event} evt Event object.
   */
  _handleSearchKeyup(evt) {
    const searchText = evt.target.value.toLowerCase();
    this.shuffle.filter((element, shuffle) => {
      // If there is a current filter applied, ignore elements that don't match it.
      if (shuffle.group !== Shuffle.ALL_ITEMS) {
        // Get the item's groups.
        const groups = JSON.parse(element.getAttribute('data-groups'));
        const isElementInCurrentGroup = groups.indexOf(shuffle.group) !== -1;
        // Only search elements in the current group
        if (!isElementInCurrentGroup) {
          return false;
        }
      }
      const titleElement = element.querySelector('.picture-item__title');
      const titleText = titleElement.textContent.toLowerCase().trim();
      return titleText.indexOf(searchText) !== -1;
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.demo = new Demo(document.getElementById('grid'));
});




// CUSTOM SCRIPTS

$('.card').hover(function(e) {
	$(this).children('.bookmarker').css('display', 'block');
}, function(e) {
	$(this).children('.bookmarker').css('display', 'none');
})

$('.bookmarker').hover(function(e) {
	$(this).attr('class', 'fa fa-lg fa-bookmark bookmarker');
}, function(e) {
	$(this).attr('class', 'fa fa-lg fa-bookmark-o bookmarker');
})

$('.bookmarker').click(function(e) {
	e.preventDefault();
	const parent = $(this).parent();
	const _csrf = $('meta[name=_csrf]')[0].content;
	const itemId = parent.attr('id');
	
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


// Bill filter

$('#bill-filter').click(function(e) {
	e.preventDefault();
	const billBtn = $(this).children('button');
	const isActive = billBtn.attr('id');
	if(isActive === 'on') {
		console.log("turning off");
		billBtn.attr('id', 'off');
		billBtn.css('backgroundColor', '#fddbd7');
		billBtn.css('color', 'rgb(121, 0, 0)');
		billBtn.css('fontWeight', '450');
		location.reload();
		return;
	}
	// Change styles and toggle button attr 'id
	billBtn.attr('id', 'on');
	billBtn.css('backgroundColor', '#e73930');
	billBtn.css('color', 'whitesmoke');
	billBtn.css('fontWeight', 'bold');

	// Fetch items containing bill
	$.ajax({
		url: '/filter/bill',
		method: 'GET',
		dataType: 'json'
	})
	.done(data => {
		$('#grid').html("");
		const itemsMarkup = data.map(item => {
			return `
			<div class="card mx-auto my-2 col-xs-3 col-sm-4 col-md-3 picture-item"  id='${item._id}'>
				<i class="fa fa-lg fa-bookmark-o bookmarker"></i>
				<img class="card-img" src="https://d1azyv1vbeu0vt.cloudfront.net/${item.pictures[0]}">
				<div class="card-body">
					<h5 class="picture-item__title card-title">${item.name}</h5>
					<p> ${item.description.slice(0, 50)}...</p>
					<small>Available for</small>
					<p class="card-text lead price-tag">₹${item.price}</p>
					<a href='/item/checkout/${item._id}' class="btn btn-secondary btn-sm">More Info</a>
				</div>
			</div>`;
		});
		$('#grid').append(itemsMarkup);
		$('#grid').append('<div class="col-sm-1 col-xs-1 my-sizer-element"></div>');

		window.demo = new Demo(document.getElementById('grid'));
	})
	.fail(err => {
		console.log('err: ', err);

	})
})
