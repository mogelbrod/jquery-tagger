;(function($, window, document, undefined) {
  var pluginName = 'tagger';

  var defaults = {
      containerClass: 'tag-container',
      tagClass: 'tag',
      listClass: 'tag-suggestions',
      suggest: true,
      suggestions: [],
      listLimit: 4,
      selectFirst: true,
      popupDelay: 200,
      matchCase: false
  };

  function Plugin(element, options) {
    this.elem = $(element);
    this.o = $.extend({}, defaults, options);
    this._name = pluginName;
    this._init();
  }

  Plugin.prototype = {
    _init: function() {
      var self = this;

      this.elem.wrap($('<div />').addClass(this.o.containerClass));
      this.container = this.elem.parent();
      this.container.click(function() { self.elem.focus(); });

      // Create the hidden input which will hold the actual form value
      this.input = $('<input type="hidden" />')
        .attr('name', this.elem.attr('name'))
        .val(this.elem.val())
        .appendTo(this.container);

      this.elem.val('').removeAttr('name');

      this.reload();

      // Enable suggestions list
      this.elem.attr('autocomplete', 'off');
      this.list = $('<ul />').appendTo('body').hide()
        .addClass(this.o.listClass).css('position', 'absolute');
    },

    reload: function() {
      var tags = this.input.val().split(',');
      this.removeAll();

      if (tags) for (var i in tags)
        this.addTag(tags[i]);
    },

    hasTag: function(name) {
      return $.inArray(this._trim(name), this.tags) != -1;
    },

    addTag: function(name) {
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
          self.elem.focus();
          return false;
        }).insertBefore(self.elem);
      this._updateInput();
      return true;
    },

    removeTag: function(name) {
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
    },

    removeAll: function() {
      this.tags = [];
      this._tagElements().remove();
      this._updateInput();
    },

    _updateInput: function() {
      this.input.val(this.tags.join(','));
    },

    _tagElements: function() {
      return this.container.find('a.' + this.o.tagClass);
    },
    
    _trim: function(string) {
      return string.replace(/^\s+|\s+$/g, '');
    }
  }; // prototype

  // Plugin wrapper around constructor which also allows public methods to be called.
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
  }

})(jQuery, window, document);

$(function() {
  $('#t').tagger();
});
