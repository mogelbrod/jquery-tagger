$(function() {
	var data = ['auto', 'complete', 'test', 'example', 'examples', 'code',
		'html', 'css', 'xhtml', 'js', 'javascript', 'json'];

	var input = $('#t');
	var $container = $('<div class="tag-container">').insertAfter(input)
		.click(function() { if (!input.is(':focus')) input.focus(); });
	input.appendTo($container).attr('autocomplete', 'off');

	var $list = $('<ul />').appendTo('body').hide()
		.addClass('ac_list').css('position', 'absolute');

	var activeClass = 'active';
	var hasFocus = 0;
	var lastKeyCode = null;
	var prevValue = '';
	var selected = -1;
	var listItems;

	var blockSubmit = false;

	function addTag(name) {
		$('<a href="#" class="tag"></a>').text(name)
			.append($(' <span>x</span>')).click(function() {
				$(this).remove();
				return false;
			})
			.append($('<input name="tags[]" type="hidden" />').val(name))
			.insertBefore(input);
	}

	var existing = input.val().split(',');
	if (existing) for (var i in existing)
		addTag(existing[i]);
	input.val('');

	input.removeAttr('name');

	$.browser.opera && input.closest('form').bind('submit.ac', function() {
		if (blockSubmit) {
			blockSubmit = false;
			return false;
		}
	});

	input.keydown(function(e) {
		hasFocus = 1;
		lastKeyPressCode = e.keyCode;

		// Tab, space and comma adds the tag
		switch (e.keyCode) {
			case 9: // tab
			case 32: // space 
			case 13: // return
			case 188: // comma
				e.preventDefault();
				
				// Insert completed value if list is visible
				var completed = selectedValue();
				if (completed) {
					input.val(completed);
					hide();
				}

				if (input.val().length > 0) {
					addTag(input.val());
					input.val('');
				}

				updateInputWidth();
				return false;
				break;

			case 38: // up
				e.preventDefault();
				moveSelected(-1);
				break;

			case 40: // down
				e.preventDefault();
				moveSelected(1);
				break;

			case 27: // escape
				e.preventDefault();
				hide();
				break;

			case 46: // delete
				input.change();
		}

		updateInputWidth();
	}).focus(function() {
		hasFocus = 1;
	}).click(function() {
		if (hasFocus++ % 2 < 1 && !isVisible())
			show();
		else
			hide();

		updateInputWidth();
	}).blur(function() {
		hasFocus = 0;
		hide();

		updateInputWidth();
	}).change(function() {
		if (lastKeyCode > 8 && lastKeyCode < 32)
			return hide();
		var v = input.val();
		if (v == prevValue) return;
	});

	$list.mouseover(function(event) {
		var target = targetLi(event);
		if (!target) return;
		selected = listItems.removeClass(activeClass).index(target);
		$(target).addClass(activeClass);
	}).click(function(event) {
		listItems.removeClass(activeClass);
		$(targetLi(event)).addClass(activeClass);
		// select
		input.focus();
		return false;
	});

	function updateInputWidth() {
		// Update input box width to match contents
		var width = ((input.val().length + 1)*1.1) + 'ex';
		if (!$.browser.msie) {
			var wspan = $('<span class="tag" style="display:none" />')
				.text(input.val()).appendTo('body');
			width = Math.max(wspan.width() + 15, 30) + 'px';
			wspan.remove();
		}
		input.css('width',  width);
	}

	function targetLi(event) {
		var target = event.target;
		while (target && target.tagName != 'LI')
			target = target.parentNode;
		if (!target || target.nodeName.toUpperCase() != 'LI') return false;
		return target;
	}

	function filter(array, term) {
		var matcher = new RegExp(term.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), 'i');
		return $.grep(array, function(value) {
			return matcher.test(value.value || value);
		});
	}

	function renderList(items) {
		console.log('renderList');
		$list.empty();
		$.each(items, function(i, item) {
			return $('<li />').data('ac_value', item)
				.append($('<a />').text(item)).appendTo($list);
		});
		listItems = $list.find('li');
	}

	function isVisible() {
		return $list.is(':visible');
	}

	function show() {
		var offset = input.offset();
		$list.css({
			'z-index': parseInt(input.css('zIndex')) + 1,
			left: offset.left,
			top: offset.top + input.outerHeight() + 'px'
		});

		var val = input.val();
		var items = (val.length > 0) ? filter(data, val) : data;

		renderList(items);
		if (listItems.length) $list.show();
	}

	function hide() {
		$list.hide();
		listItems && listItems.removeClass(activeClass);
		selected = -1;
	}

	function selectedValue() {
		if (!isVisible()) return false;
		var s = listItems && listItems.filter('.active').removeClass(activeClass);
		return s && s.length && $.data(s[0], 'ac_value');
	}

	function moveSelected(step) {
		if (!isVisible()) show();

		var length = listItems.length;
		if (length < 1) return;

		selected += step;
		if (selected < 0)
			selected = length - 1;
		else if (selected >= length)
			selected = 0;

		listItems.removeClass(activeClass)
			.slice(selected, selected+1).addClass(activeClass);
	}
});
