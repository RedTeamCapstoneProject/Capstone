"use strict";
(() => {
  // assets/ts/breakpoints.ts
  var breakpoints = function() {
    const t = {
      list: null,
      media: {},
      events: [],
      init: function(list) {
        t.list = list;
        window.addEventListener("resize", t.poll);
        window.addEventListener("orientationchange", t.poll);
        window.addEventListener("load", t.poll);
        window.addEventListener("fullscreenchange", t.poll);
      },
      active: function(query) {
        if (!(query in t.media)) {
          t.media[query] = window.matchMedia(query).matches;
        }
        return t.media[query];
      },
      on: function(query, handler) {
        t.events.push({ query, handler, state: false });
        if (t.active(query))
          handler();
      },
      poll: function() {
        for (let i = 0; i < t.events.length; i++) {
          const e = t.events[i];
          if (t.active(e.query)) {
            if (!e.state) {
              e.state = true;
              e.handler();
            }
          } else {
            e.state = false;
          }
        }
      }
    };
    const fn = (list) => t.init(list);
    fn.on = (query, handler) => t.on(query, handler);
    fn.active = (query) => t.active(query);
    return fn;
  }();
  var breakpoints_default = breakpoints;
})();
