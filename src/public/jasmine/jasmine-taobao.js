
(function() {

    var $ = jQuery;

    jasmine.taobao = {};
    jasmine.taobao.slide = function(suite, container, options) {
        if (!suite || !(container=$(container)[0])) return;

        options = options || {};
        var triggers  = options.triggers;
        var content   = options.content || jQuery('.ks-switchable-content', container);
        var cssProp   = options.cssProp || 'left';
        var eventType = options.eventType || 'click';
        var delay     = options.delay || 100;

        describe(suite, function() {
            jQuery(triggers).each(function(i, trigger) {
                if ($(trigger).hasClass('disable')) return;
                it('trigger ' + i, function() {
                    jasmine.focus(container);
                    waits(1000);
                    var origin = $(content).css(cssProp);
                    jasmine.simulate(trigger, eventType);
                    waits(delay);
                    runs(function() {
                        expect($(content).css(cssProp)).not.toEqual(origin);
                    });
                });
            });
        });
    };

    jasmine.taobao.tab = function(suite, container, options) {
        if (!suite || !(container = $(container)[0])) return;

        options = options || {};
        var triggers = options.triggers || $('.ks-switchable-nav > *', container);
        var panels = options.panels || $('.ks-switchable-content > *', container);
        var eventType = options.eventType || 'click';
        var delay     = options.delay || 100;

        describe(suite, function() {
            jQuery(triggers).each(function(i, trigger) {
                it('trigger ' + i, function() {
                    jasmine.focus(container);
                    waits(1000);
                    jasmine.simulate(trigger, eventType);
                    waits(delay);
                    runs(function() {
                        expect(panels[i].style.display).not.toEqual('none');
                    });
                });
            });
        });
    };

    jasmine.focus = (function() {
        var line;

        return function(el) {
            if (!(el = $(el)[0])) return;

            el.scrollIntoView();

            var offset = $(el).offset();
            var width = $(el).width();
            var height = $(el).height();

            if (!line) {
                line = jQuery('<div>').css({
                    position: 'absolute',
                    border: '2px solid red',
                    zIndex: 9999
                }).appendTo('body');
            }
            line.css({
                'left':   offset.left,
                'top':    offset.top,
                'width':  width - 4,
                'height': height - 4
            });
        };
    })();

    // Extend jasmine.
    jQuery.extend(jasmine.Matchers.prototype, {

        // Horizontal layout test.
        toHorizontalEqual: function() {
            // console.log(this.actual);
            return equal(this.actual, ['top', 'height']);
        },
        toHorizontalTopAlign: function() {
            return equal(this.actual, ['top']);
        },
        toHorizontalBottomAlign: function() {
            return equal(this.actual, ['top+height']);
        },

        // Vertical layout test.
        toVerticalEqual: function() {
            return equal(this.actual, ['left', 'width']);
        },
        toVerticalLeftAlign: function() {
            return equal(this.actual, ['left']);
        },
        toVerticalRightAlign: function() {
            return equal(this.actual, ['left+width']);
        },

        // Prop test.
        isCSSProp: function(prop, compare, val) {
            var propVal = jQuery(this.actual).css(prop);
            if (/^\d+/.test(propVal)) {
                propVal = parseInt(propVal, 10);
                val = parseInt(val, 10);
            }
            switch (compare) {
                case '=':
                case '==':
                    return propVal == val;
                case '===':
                    return propVal === val;
                case '<':
                    return propVal < val;
                case '>':
                    return propVal > val;
                case '<=':
                    return propVal <= val;
                case '>=':
                    return propVal >= val;
            }
            return false;
        }
    });


    ///////////////////////////////////////////////////////////////
    // Helpers

    // Get el's left, top, width, height, and so on..
    var offset = function(el) {
        var data = jQuery.data(el, 'offset');
        if (!data) {
            var e = jQuery(el),
                f = e.offset(), w = e.width(), h = e.height();
            data = {
                'left':       f.left,
                'top':        f.top,
                'width':      w,
                'height':     h,
                'left+width': f.left + w,
                'top+height': f.top + h
            };
            jQuery.data(el, 'offset', data);
        }
        return data;
    };

    // Compare el's offset.
    var equal = function(els, opts) {
        var cache = {},
            i, j,
            notexsit = function() {
                for (j=0; j<opts.length; j++) {
                    if (!cache[opts[j]]) return true;
                }
                return false;
            },
            notequal = function(os) {
                for (j=0; j<opts.length; j++) {
                    if (os[opts[j]] !== cache[opts[j]]) return true;
                }
                return false;
            };

        for (i=0; i<els.length; i++) {
            var os = offset(jQuery(els[i]).get(0));

            if (notexsit()) {
                for (j=0; j<opts.length; j++) {
                    cache[opts[j]] = os[opts[j]];
                }
                continue;
            }

            if (notequal(os)) {
                return false;
            }
        }

        return true;
    };


})();