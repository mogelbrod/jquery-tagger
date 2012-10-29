;(function($, window, document, undefined) {
  var pluginName = 'tagger';

  var defaults = {
      containerClass: 'tag-container',
      tagClass: 'tag',
      separator: ',',
      separatorKeyCode: 188, // no way of converting this?
      highlightClass: 'highlight',
      highlightDuration: 2000,
      inputMaxWidth: 300,
      inputMinWidth: 30
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

      this.input.addClass(this.o.tagClass)
        .wrap($('<div />').addClass(this.o.containerClass));
      this.container = this.input.parent();
      this.container.click(function() { self.input.focus(); });

      // Create the hidden input which will hold the actual form value
      this.hidden_input = $('<input type="hidden" />')
        .attr('name', this.input.attr('name'))
        .val(this.input.val())
        .appendTo(this.container);

      this.input.val('').removeAttr('name');

      this._autosize();
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
              if (self.tags.length < 1)
                break;
              var last = self.tags[self.tags.length - 1];
              self.removeTag(last);
              self.input.val(last);
            }
        } // switch
      }).bind('keydown keypress focus blur change', function() {
        self._autosize();
      }).bind('suggester-accepted', function() {
        self.addTag(self.input.val());
        self.input.val('');
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
      if (this.hasTag(name)) {
        this.highlightTag(name);
        return false;
      }
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
      tagIndex = $.inArray(name, this.tags);
      this.tags.splice(tagIndex, 1); // remove from tags array
      this._tagElements().eq(tagIndex).remove();
      this._updateInput();
      return true;
    }, //}}}

    removeAll: function() { //{{{
      this.tags = [];
      this._tagElements().remove();
      this._updateInput();
    }, //}}}

    highlightTag: function(name) { //{{{
      var cssClass = this.o.highlightClass;
      var target = this._tagElements().eq($.inArray(name, this.tags));
      target.addClass(cssClass);
      setTimeout(function() { target.removeClass(cssClass); }, this.o.highlightDuration);
    }, //}}}

    _updateInput: function() { //{{{
      this.hidden_input.val(this.tags.join(this.o.separator));
    }, //}}}

    _autosize: function() { //{{{
      // Lazy initialization
      if (this.widthTester == undefined) {
        this.widthTester = $('<span />').css({
          position: 'absolute',
          top: -1000,
          left: -1000,
          width: 'auto',
          fontSize: this.input.css('fontSize'),
          fontFamily: this.input.css('fontFamily'),
          fontWeight: this.input.css('fontWeight'),
          letterSpacing: this.input.css('letterSpacing'),
          whiteSpace: 'nowrap',
          visibility: 'hidden'
        }).appendTo('body');
      }

      // Escape input value
      var val = 'mm' + this.input.val().replace(/&/g,'&amp;').replace(/\s/g,' ')
        .replace(/</g,'&lt;').replace(/>/g,'&gt;');
      this.widthTester.html(val);

      var width = Math.min(this.widthTester.width(), this.o.inputMaxWidth);
      if (width < this.o.inputMinWidth) width = this.o.inputMinWidth;
      this.input.width(width);
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
