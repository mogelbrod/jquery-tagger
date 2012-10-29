;(function($, window, document, undefined) {
  var pluginName = 'suggester';

  var defaults = {
      data: null,                     // available suggestions
      dataAttribute: 'suggestions', // data attribute to load suggestions from
      listClass: 'suggestions',     // css class for dropdown
      activeClass: 'active',        // css class for selected item in dropdown
      limit: 10,                    // maximum number of items visible at once
      selectFirst: true,            // select first item when list is shown
      popupDelay: 400,              // delay (ms) before showing list
      updateDelay: 100,             // delay (ms) before updating list
      matchCase: false,             // match text case for suggestions
      highlighting: '<em>$1</em>'   // markup for matched text in list
  };

  var KEY = { //{{{
      UP: 38,
      DOWN: 40,
      ENTER: 13,
      ESC: 27,
      BACKSPACE: 8,
      TAB: 9,
      DEL: 46
  };//}}}

  function Plugin(element, options) { //{{{
    this.input = $(element);

    this.o = $.extend({}, defaults, options);

    this._name = pluginName;
    this._init();
  } //}}}

  Plugin.prototype = {
    _init: function() { //{{{
      this.input.attr('autocomplete', 'off');
      this.list = $('<ul />').appendTo('body').hide()
        .addClass(this.o.listClass).css('position', 'absolute');

      // Array of available suggestions
      this.suggestions = [];
      // Suggestions from data-attribute
      if (this.o.dataAttribute) {
        var data = this.input.data(this.o.dataAttribute);
        if ($.isArray(data))
          this.suggestions = data;
      }
      // Suggestions from provided options
      if (this.o.data) {
        this.suggestions = this.o.data;
        delete this.o.data;
      }

      this._active = -1;             // active item index
      this._hasFocus = 0;            // got focus?
      this._previousValue = null;    // previous input value
      this._mouseDownOnList = false; // is mouse down on suggestions list?
      this._timeout = null;          // active update/show timeout
      this.items = null;             // jQuery collection of suggestion <li>s

      this._bindHandlers();
    }, //}}}

    _bindHandlers: function() { //{{{
      var self = this;

      //{{{ Input events
      self.input.bind('keydown.'+pluginName, function(event) {
        self._hasFocus = 1;
        var key = event.keyCode;

        switch (key) {
          case KEY.TAB:
          case KEY.ENTER:
            if (self._acceptActive())
              event.preventDefault();
            return;
          case KEY.UP:
          case KEY.DOWN:
            event.preventDefault();
            self._changeActive(key == KEY.UP ? -1 : 1);
            return;
          case KEY.BACKSPACE:
          case KEY.DEL:
            self._previousValue = null;
            if (self.input.val() != '')
              break;
          case KEY.ESC:
            if (self.hide())
              event.preventDefault();
            return;
          default:
            // Don't consider ctrl/alt/shift modifiers as changes
            if (key > 15 && key < 19)
              return;
        } // switch

        self.showOrUpdate();
      }).bind('focus.'+pluginName, function(event) {
        self._hasFocus++;
      }).bind('click.'+pluginName, function(event) {
        if (self._hasFocus % 2 < 1 && !self.isVisible())
          self.show();
        else
          self.hide();
      }).bind('blur.'+pluginName, function(event) {
        self._hasFocus = 0;
        if (!self._mouseDownOnList)
          self.hide();
      });
      //}}}

      //{{{ List events
      self.list.mouseover(function(event) {
        var target = self._targetListItem(event);
        if (!target) return;
        self._selectActive(self.items.index(target));
      }).click(function(event) {
        self._acceptActive();
        return false;
      }).mousedown(function(event) {
        self._mouseDownOnList = true;
      }).mouseup(function(event) {
        self._mouseDownOnList = false;
      });
      //}}}
    }, //}}}

    data: function(data) { //{{{
      this.suggestions = data;
    }, //}}}

    show: function() { //{{{
      if (this.update())
        this.list.show();
    }, //}}}

    hide: function() { //{{{
      clearTimeout(this._timeout);
      if (!this.isVisible())
        return false;
      this.list.hide();
      this._active = -1;
      return true;
    }, //}}}

    update: function() { //{{{
      // Set correct position relative to input
      var offset = this.input.offset();
      this.list.css({
        'z-index': parseInt(this.input.css('zIndex')) + 1,
        left: offset.left,
        top: offset.top + this.input.outerHeight() + 'px'
      });

      // Check for changes before updating list
      var currentText = this.input.val();
      if (currentText == this._previousValue)
        return true;
      this._previousValue = currentText;

      // Array of matching terms
      var items = this.suggestions;
      if (currentText.length > 0)
        items = this._matchingItems(items, currentText);

      this.list.empty();

      var totalMatches = items.length;

      // Generate <li> elements for each term, highlighting current text if present
      var i = 0; // number of visible items
      for (; i < items.length && i < this.o.limit; i++) {
        var term = items[i];
        var text = currentText ? this._highlight(term, currentText) : term;
        $('<li />').data(pluginName, term)
          .append($('<a />').html(text))
          .appendTo(this.list);
      }
      this.items = this.list.find('li');

      if (i < 1) {
        this.list.hide();
        this._active = -1;
        return false;
      }

      if (i < totalMatches)
        $('<li class="more"></li>').appendTo(this.list);

      if (this.o.selectFirst)
        this._selectActive(0);

      return true;
    }, //}}}

    selected: function() { //{{{
      if (!this.isVisible())
        return false;
      var s = this.items && this.items.filter('.' + this.o.activeClass);
      if (s && s.length)
        return s.data(pluginName);
      return false;
    }, //}}}

    isVisible: function() { //{{{
      return this.list.is(':visible');
    }, //}}}

    showOrUpdate: function() { //{{{
      var self = this;
      clearTimeout(this._timeout);
      if (this.isVisible())
        this._timeout = setTimeout(function() { self.update(); }, this.o.updateDelay);
      else
        this._timeout = setTimeout(function() { self.show(); }, this.o.popupDelay);
    }, //}}}

    _selectActive: function(index) { //{{{
      if (index < 0 || index >= this.items.length)
        return false;
      this._active = index;
      this.items.removeClass(this.o.activeClass)
        .slice(index, index+1).addClass(this.o.activeClass);
      this.show();
      return true;
    }, //}}}

    _changeActive: function(step) { //{{{
      if (!this.isVisible())
        return this.show();

      var length = this.items.length;
      if (length < 1) return;

      active = this._active + step;
      if (active < 0)
        active = length - 1;
      else if (active >= length)
        active = 0;

      this._selectActive(active);
    }, //}}}

    _acceptActive: function() { //{{{
      var selected = this.selected();
      this.hide();
      if (!selected)
        return false;
      this.input.val(selected).focus();
      this._previousValue = selected;
      this.input.trigger(pluginName+'-accepted');
      return true;
    }, //}}}

    _targetListItem: function(event) { //{{{
      var t = event.target;
      while (t && t.tagName != 'LI')
        t = t.parentNode;
      if (!t || t.nodeName.toUpperCase() != 'LI' || t.className == 'more')
        return false;
      return t;
    }, //}}}

    _highlight: function(string, term) { //{{{
      var re = new RegExp('(?!<[^<>]*)(' + this._regexEscape(term) + ')(?![^<>]*>)', 'gi');
      return string.replace(re, this.o.highlighting);
    }, //}}}

    _matchingItems: function(array, term) { //{{{
      var matcher = new RegExp(this._regexEscape(term), (this.o.matchCase ? '' : 'i'));
      return $.grep(array, function(value) {
        return matcher.test(value.value || value);
      });
    }, //}}}

    _regexEscape: function(string) { //{{{
      return string.replace(/([\^\$\(\)\[\]\{\}\*\.\+\?\|\\])/gi, "\\$1");
    } //}}}
  };

  //{{{ Plugin wrapper around constructor which also allows public methods to be called.
  $.fn[pluginName] = function(options) {
    var args = arguments;
    if (options === undefined || typeof options === 'object') {
      return this.each(function () {
        if (!$.data(this, 'plugin_' + pluginName))
          $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
      });
    } else if (typeof options === 'string' && options[0] !== '_' && options !== 'init') {
      return this.each(function () {
        var instance = $.data(this, 'plugin_' + pluginName);
        if (instance instanceof Plugin && typeof instance[options] === 'function')
          instance[options].apply(instance, Array.prototype.slice.call(args, 1));
      });
    }
  }; //}}}
})(jQuery, window, document);
