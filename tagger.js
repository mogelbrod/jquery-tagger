;(function($, window, document, undefined) {
  var pluginName = 'tagger';

  var defaults = {
      containerClass: 'tag-container', // tag for container div
      tagClass: 'tag',                 // class for generated tags & input
      separator: ',',                  // separator between tags
      separatorKeyCode: 188,           // keyCode for separator, can't convert?
      highlightClass: 'highlight',     // class to toggle when highlighting tag
      highlightDuration: 2000,         // duration (ms) of highlighting
      inputMaxWidth: 'parent',         // max width of input (px), or 'parent'
      inputMinWidth: 30,                // minimum width of input (px)
      dragClass: 'dragging',           // css class for items being dragged
      dragPlaceholder: $('<span class="placeholder">')
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
        .attr('name', this.input.attr('name')).val(this.input.val())
        .appendTo(this.container);
      this.input.val('').removeAttr('name');

      this.tags = []; // array of tags synchronized with visible list

      this._dragElement = null; // tag element being dragged
      this._dragPlaceholder = this.o.dragPlaceholder
        .hide().insertBefore(this.input);
      this._enableDragging(this._dragPlaceholder, true);
      this._enableDragging(this.input, true);

      this._autosize();
      this._bindHandlers();
      this.reload();
    }, //}}}

    _bindHandlers: function() { //{{{
      var self = this;

      // Input handlers
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
      }).bind('keydown', function(event) {
        self._autosize(String.fromCharCode(event.which));
      }).bind('keypress focus blur change', function() {
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
      var $elem = $('<a href="#" />').addClass(this.o.tagClass).text(name)
        .data('name', name)
        .append($(' <span>x</span>')) // removal hint
        .click(function() { // click to remove
          self.removeTag($(this).data('name'));
          self.input.focus();
          return false;
        }).insertBefore(self.input);
      this._enableDragging($elem);
      this._syncInput();
      return true;
    }, //}}}

    removeTag: function(name) { //{{{
      if (!this.hasTag(name))
        return false;
      name = this._trim(name);
      tagIndex = $.inArray(name, this.tags);
      this.tags.splice(tagIndex, 1); // remove from tags array
      this.tagElements().eq(tagIndex).remove();
      this._syncInput();
      return true;
    }, //}}}

    removeAll: function() { //{{{
      this.tags = [];
      this.tagElements().remove();
      this._syncInput();
    }, //}}}

    highlightTag: function(name) { //{{{
      var cssClass = this.o.highlightClass;
      var target = this.tagElements().eq($.inArray(name, this.tags));
      target.addClass(cssClass);
      setTimeout(function() { target.removeClass(cssClass); }, this.o.highlightDuration);
    }, //}}}

    tagElements: function() { //{{{
      return this.container.find('a.' + this.o.tagClass);
    }, //}}}

    _enableDragging: function($item, isPlaceholder) { //{{{
      var self = this;

      // Add ability to drag and drop tags
      if (!isPlaceholder) {
        $item.attr('draggable', true).bind('dragstart.'+pluginName, function(event) {
          var dt = event.originalEvent.dataTransfer;
          dt.effectAllowed = 'move';
          dt.setData('text/plain', $item.data('name'));

          self._dragElement = $item.addClass(self.o.dragClass);

          self._dragPlaceholder.width(self._dragElement.outerWidth());
          self._dragPlaceholder.height(self._dragElement.outerHeight());

          // Hack: hide original tag, but show the ghost one being dragged
          setTimeout(function() { $item.hide(); }, 10);
        }).bind('dragend.'+pluginName, function(event) {
          if (!self._dragElement)
            return;

          self._dragElement.removeClass(self.o.dragClass).show();
          self._dragPlaceholder.detach();

          self._syncArray();

          self._dragElement = null;
        }).on('selectstart.'+pluginName, function(event) {
          this.dragDrop && this.dragDrop();
          return false;
        });
      } // placeholder

      // Dragging over items, showing a target placeholder where appropriate
      $item.bind('dragover.'+pluginName+' dragenter.'+pluginName+' drop.'+pluginName, function(event) {
        if (!self._dragElement)
          return true;

        if (event.type == 'drop') {
          event.stopPropagation();
          self._dragPlaceholder.show().after(self._dragElement);
          self._dragElement.trigger('dragend.'+pluginName);
          return false;
        }

        event.preventDefault();
        event.originalEvent.dataTransfer.dropEffect = 'move';

        if (self.tagElements().is($item)) {
          $item[self._dragPlaceholder.index() <= $item.index() ?
            'after' : 'before'](self._dragPlaceholder.show());
        } else if ($item.is(self.input)) {
          self._dragPlaceholder.insertBefore($item);
        }
        return false;
      });
    }, //}}}

    _syncInput: function() { //{{{ Updates form input based on tags array
      this.hidden_input.val(this.tags.join(this.o.separator));
    }, //}}}

    _syncArray: function() { //{{{ Updates tag array based on visible tag order
      this.tags = $.makeArray(this.tagElements().map(function() {
        return $(this).data('name');
      }));
      this._syncInput();
    }, //}}}

    _autosize: function(added) { //{{{
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

        // Determine max width
        var max = this.o.inputMaxWidth;
        if (max == 'parent')
          max = this.container.width() + this.input.width() - this.input.outerWidth();
        this._maxWidth = max;
      }

      // Escape input value (with added string parameter if provided)
      var val = 'mm' + ((added ? added : '') + this.input.val())
        .replace(/&/g,'&amp;').replace(/\s/g,' ')
        .replace(/</g,'&lt;').replace(/>/g,'&gt;');
      this.widthTester.html(val);

      var width = Math.min(this.widthTester.width(), this._maxWidth);
      if (width < this.o.inputMinWidth) width = this.o.inputMinWidth;
      this.input.width(width);
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
