$(function() {
	// {{{ Suggestions
	var Suggestions = function(input, data, opts) {
		// Options
		opts = $.extend({
			listClass: 'sg_list',
			activeClass: 'active',
			limit: 4,
			selectFirst: true,
			delay: 200,
			matchCase: false,
			highlight: function(value, term) {
				return value.replace(
					new RegExp('(?!<[^<>]*)(' + regexEscape(term) + ')(?![^<>]*>)', 'gi'),
					'<strong>$1</strong>');
			}
		}, opts);

		var $input = $(input).attr('autocomplete', 'off');
		var $list = $('<ul />').appendTo('body').hide()
			.addClass(opts.listClass).css('position', 'absolute');

		var hasFocus = 0;
		var lastKey = -1;
		var previousValue;

		var active = -1;
		var listItems;

		var blockSubmit = false;
		var mouseDownOnList = false;
		var timeout;

		var KEY = {
			LEFT: 37,
			UP: 38,
			RIGHT: 39,
			DOWN: 40,
			DEL: 46,
			TAB: 9,
			ENTER: 13,
			ESC: 27,
			COMMA: 188,
			BACKSPACE: 8
		};

		$.browser.opera && $input.closest('form').bind('submit.sg', function() {
			if (blockSubmit) {
				blockSubmit = false;
				return false;
			}
		});

		// {{{ Input handlers
		$input.bind('keydown.sg', function(event) {
			hasFocus = 1;
			lastKey = event.keyCode;
			
			switch (lastKey) {
				case KEY.TAB:
				case KEY.ENTER:
					event.preventDefault();
					selectCurrent();
					return false;
					break;

				case KEY.UP:
				case KEY.DOWN:
					event.preventDefault();
					moveActive(lastKey == KEY.UP ? -1 : 1);
					break;

				case KEY.ESC:
					event.preventDefault();
					hide();
					break;

				case KEY.DEL:
					onChange();
					break;

				default:
					// Prevent ctrl/alt/shift modifiers from resetting the timeout
					if (lastKey > 15 && lastKey < 19)
						return;

					clearTimeout(timeout);
					timeout = setTimeout(onChange, opts.delay);
			}
		}).bind('focus.sg', function(event) {
			hasFocus = 1;
		}).bind('click.sg', function(event) {
			if (hasFocus++ % 2 < 1 && !isVisible())
				show();
			else
				hide();
		}).bind('blur.sg', function() {
			if (!mouseDownOnList)
				hide();	
		});
		// }}}

		// {{{ List handlers 
		$list.mouseover(function(event) {
			var target = targetLi(event);
			if (!target) return;
			active = listItems.removeClass(opts.activeClass).index(target);
			$(target).addClass(opts.activeClass);
		}).click(function(event) {
			listItems.removeClass(opts.activeClass);
			var val = $(targetLi(event)).addClass(opts.activeClass).data('sg');
			selectCurrent();
			return false;
		}).mousedown(function(event) {
			mouseDownOnList = true;
		}).mouseup(function(event) {
			mouseDownOnList = false;
		});
		// }}}

		function onChange() { // {{{
			if ((lastKey > 8 && lastKey < 32) || lastKey == KEY.DEL)
				return sg.hide();

			var current = input.val();
			if (current == previousValue || lastKey == KEY.LEFT || lastKey == KEY.RIGHT)
				return;

			previousValue = current;
			
			if (current.length >= 1)
				sg.show();
			else
				sg.hide();
		} // }}}

		function show() { // {{{
			var offset = $input.offset();
			$list.css({
				'z-index': parseInt($input.css('zIndex')) + 1,
				left: offset.left,
				top: offset.top + $input.outerHeight() + 'px'
			});

			var val = $input.val();
			var items = (val.length > 0) ? filter(data, val) : data;

			renderList(items, val);

			// Hide if no results
			if (listItems.length < 1)
				return $list.hide();

			if (opts.selectFirst) {
				listItems.slice(0, 1).addClass(opts.activeClass);
				active = 0;
			}

			$list.show();
		} // }}}

		function hide() { // {{{
			clearTimeout(timeout);
			$list.hide();
			listItems && listItems.removeClass(opts.activeClass);
			active = -1;
		} // }}}

		function currentSelection() { // {{{
			if (!isVisible()) return false;
			var s = listItems && listItems.filter('.'+opts.activeClass)
				.removeClass(opts.activeClass);
			if (s && s.length) return $.data(s[0], 'sg');
			return false;
		} // }}}

		function selectCurrent() { // {{{
			if (!isVisible()) return false;
			var sel = currentSelection();
			hide();
			if (!sel) return false;
			$input.val(sel).focus();
			previousValue = sel;
			return true;
		} // }}}

		function targetLi(event) { // {{{
			var t = event.target;
			while (t && t.tagName != 'LI')
				t = t.parentNode;
			if (!t || t.nodeName.toUpperCase() != 'LI' || t.className == 'more')
				return false;
			return t;
		} // }}}

		function renderList(items, term) { // {{{
			$list.empty();
			var i = 0;
			for (; i < items.length && i < opts.limit ; i++) {
				var text = term ? opts.highlight(items[i], term) : items[i];
				$('<li />').data('sg', items[i])
					.append($('<a />').html(text))
					.appendTo($list);
			}
			listItems = $list.find('li');

			if (items.length > opts.limit)
				$('<li class="more"></li>').appendTo($list);
		} // }}}

		function filter(array, term) { // {{{
			var matcher = new RegExp(regexEscape(term), (opts.matchCase ? '' : 'i'));
			return $.grep(array, function(value) {
				return matcher.test(value.value || value);
			});
		} // }}}

		function regexEscape(term) { // {{{
			return term.replace(/([\^\$\(\)\[\]\{\}\*\.\+\?\|\\])/gi, "\\$1");
		} // }}}

		function moveActive(step) { // {{{
			if (!isVisible())
				return show();

			var length = listItems.length;
			if (length < 1) return;

			active += step;
			if (active < 0)
				active = length - 1;
			else if (active >= length)
				active = 0;

			listItems.removeClass(opts.activeClass)
				.slice(active, active+1).addClass(opts.activeClass);
		} // }}}

		function isVisible() { // {{{
			return $list.is(':visible');
		} // }}}

		// {{{ Returned
		return {
			show: show,
			hide: hide,
			prev: function() { moveActive(-1); },
			next: function() { moveActive(1); },
			selected: currentSelection,
			visible: isVisible,
			update: onChange
		};
		// }}}
	};
	// }}}

	var input = $('#t');
	var $container = $('<div class="tag-container">').insertAfter(input)
		.click(function() { if (!input.is(':focus')) input.focus(); });
	input.appendTo($container);

	// {{{ addTag()
	function addTag(name) {
		$('<a href="#" class="tag"></a>').text(name)
			.append($(' <span>x</span>')).click(function() {
				$(this).remove();
				input.focus();
				return false;
			})
			.append($('<input name="tags[]" type="hidden" />').val(name))
			.insertBefore(input);
	}
	// }}}

	var existing = input.val().split(',');
	if (existing) for (var i in existing)
		addTag(existing[i]);
	input.val('');

	input.removeAttr('name');

	var data = ['auto', 'complete', 'test', 'example', 'examples', 'code',
		'html', 'css', 'XHTML', 'js', 'JavaScript', 'JSON'];
	var sg = Suggestions(input, data);

	input.keydown(function(event) {
		var key = event.keyCode;
		// Tab, space and comma adds the tag
		switch (key) {
			case 9: // tab
			case 32: // space
			case 188: // comma
				event.preventDefault();
				if (input.val().length > 0) {
					addTag(input.val());
					input.val('');
				}
				break;
		}
		updateInputWidth();
	}).click(updateInputWidth).blur(updateInputWidth).focus(updateInputWidth);

	function updateInputWidth() { // {{{
		// Update input box width to match contents
		var width = ((input.val().length + 1)*1.1) + 'ex';
		if (!$.browser.msie) {
			var wspan = $('<span class="tag" style="display:none" />')
				.text(input.val()).appendTo('body');
			width = Math.max(wspan.width() + 15, 30) + 'px';
			wspan.remove();
		}
		input.css('width',  width);
	} // }}}
});
