//{{{ Suggester
;(function($, window, document, undefined) {
  var pluginName = 'suggester';

  var defaults = {
      suggestions: [],
      listClass: 'suggestions',
      activeClass: 'active',
      limit: 10,
      selectFirst: true,
      delay: 100,
      matchCase: false,
      highlighting: '<em>$1</em>'
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

      this._active = -1; // active item index
      this._hasFocus = 0; // got focus?
      this._previousValue = null; // previous input value
      this._mouseDownOnList = false;
      this._timeout = null;
      this.items = null; // jQuery collection of <li> items in dropdown

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

        self.resetTimeout();
      }).bind('focus.'+pluginName, function(event) {
        self._hasFocus = 1;
      }).bind('click.'+pluginName, function(event) {
        if (self._hasFocus++ % 2 < 1 && !self.isVisible())
          self.show();
        else
          self.hide();
      }).bind('blur.'+pluginName, function(event) {
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

    show: function() { //{{{
      // Set correct position relative to input
      var offset = this.input.offset();
      this.list.css({
        'z-index': parseInt(this.input.css('zIndex')) + 1,
        left: offset.left,
        top: offset.top + this.input.outerHeight() + 'px'
      });

      this.update(this.input.val());
    }, //}}}

    hide: function() { //{{{
      clearTimeout(this._timeout);
      if (!this.isVisible())
        return false;
      this.list.hide();
      this._active = -1;
      return true;
    }, //}}}

    update: function(currentText) { //{{{
      if (currentText == this._previousValue)
        return;

      // Array of matching terms
      var items = this.o.suggestions;
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
        return false;
      }

      if (i < totalMatches)
        $('<li class="more"></li>').appendTo(this.list);

      if (this.o.selectFirst)
        this._selectActive(0);

      this.list.show();
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

    resetTimeout: function() { //{{{
      var self = this;
      clearTimeout(this._timeout);
      this._timeout = setTimeout(function() { self.show(); }, this.o.delay);
    }, //}}}

    _selectActive: function(index) { //{{{
      if (index < 0 || index >= this.items.length)
        return false;
      this._active = index;
      this.items.removeClass(this.o.activeClass)
        .slice(index, index+1).addClass(this.o.activeClass);
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
    }, //}}}
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
//}}}

//{{{ Tagger
;(function($, window, document, undefined) {
  var pluginName = 'tagger';

  var defaults = {
      containerClass: 'tag-container',
      tagClass: 'tag',
      separator: ',',
      separatorKeyCode: 188 // no way of converting this?
  };

  var KEY = { //{{{
      TAB: 9,
      ENTER: 13,
      BACKSPACE: 8
  };//}}}

  function Plugin(element, options) { //{{{
    this.input = $(element);
    this.o = $.extend({}, defaults, options);
    this._name = pluginName;
    this._init();
  } //}}}

  Plugin.prototype = {
    _init: function() { //{{{
      var self = this;

      this.input.addClass(pluginName)
        .wrap($('<div />').addClass(this.o.containerClass));
      this.container = this.input.parent();
      this.container.click(function() { self.input.focus(); });

      // Create the hidden input which will hold the actual form value
      this.hidden_input = $('<input type="hidden" />')
        .attr('name', this.input.attr('name'))
        .val(this.input.val())
        .appendTo(this.container);

      this.input.val('').removeAttr('name');

      this._bindHandlers();
      this.reload();
    }, //}}}

    _bindHandlers: function() { //{{{
      var self = this;

      self.input.bind('keydown.'+pluginName, function(event) {
        var value = self.input.val();
        switch (event.keyCode) {
          case self.o.separatorKeyCode:
            // Always prevent separator from being inserted
            event.preventDefault();
          case KEY.TAB:
          case KEY.ENTER:
            if (value.length > 0) {
              self.addTag(value);
              self.input.val('');
              event.preventDefault();
            }
            break;
          case KEY.BACKSPACE:
            // Remove and edit last tag when input is empty
            if (value.length < 1) {
              event.preventDefault();
              var last = self.tags[self.tags.length - 1];
              console.log("removing " + last);
              self.removeTag(last);
              self.input.val(last);
            }
        } // switch
      });
    }, //}}}

    reload: function() { //{{{
      var tags = this.hidden_input.val().split(this.o.separator);
      this.removeAll();

      if (tags) for (var i in tags)
        this.addTag(tags[i]);
    }, //}}}

    hasTag: function(name) { //{{{
      // Disallow empty tags
      name = this._trim(name);
      return name == '' || $.inArray(name, this.tags) != -1;
    }, //}}}

    addTag: function(name) { //{{{
      if (this.hasTag(name))
        return false;
      name = this._trim(name);
      var self = this;
      this.tags.push(name);
      $('<a href="#" />').addClass(this.o.tagClass).text(name)
        .data('name', name)
        .append($(' <span>x</span>')) // removal hint
        .click(function() { // click to remove
          self.removeTag($(this).data('name'));
          self.input.focus();
          return false;
        }).insertBefore(self.input);
      this._updateInput();
      return true;
    }, //}}}

    removeTag: function(name) { //{{{
      if (!this.hasTag(name))
        return false;
      name = this._trim(name);
      console.log(this.tags);
      tagIndex = $.inArray(name, this.tags);
      this.tags.splice(tagIndex, 1); // remove from tags array
      console.log(this.tags);
      this._tagElements().eq(tagIndex).remove();
      this._updateInput();
      return true;
    }, //}}}

    removeAll: function() { //{{{
      this.tags = [];
      this._tagElements().remove();
      this._updateInput();
    }, //}}}

    _updateInput: function() { //{{{
      this.hidden_input.val(this.tags.join(this.o.separator));
    }, //}}}

    _tagElements: function() { //{{{
      return this.container.find('a.' + this.o.tagClass);
    }, //}}}

    _trim: function(string) { //{{{
      return string.replace(/^\s+|\s+$/g, '');
    } //}}}
  }; // prototype

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
//}}}

$(function() {
  $('#t').tagger();
  $('#t').suggester({
    suggestions: ['test', 'hej', 'CSS', 'HTML', 'Abra kadabra', 'Ha det bra'],
  });
});
