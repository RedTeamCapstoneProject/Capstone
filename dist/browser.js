"use strict";
(() => {
  // assets/ts/browser.ts
  var browser = function() {
    const t = {
      name: null,
      version: null,
      os: null,
      osVersion: null,
      touch: null,
      mobile: null,
      _canUse: null,
      canUse: function(e) {
        t._canUse || (t._canUse = document.createElement("div"));
        const n = t._canUse.style;
        const r = e.charAt(0).toUpperCase() + e.slice(1);
        return e in n || "Moz" + r in n || "Webkit" + r in n || "O" + r in n || "ms" + r in n;
      },
      init: function() {
        const e = navigator.userAgent;
        let n = "other";
        let r = 0;
        const i = [
          ["firefox", /Firefox\/([0-9\.]+)/],
          ["bb", /BlackBerry.+Version\/([0-9\.]+)/],
          ["bb", /BB[0-9]+.+Version\/([0-9\.]+)/],
          ["opera", /OPR\/([0-9\.]+)/],
          ["opera", /Opera\/([0-9\.]+)/],
          ["edge", /Edge\/([0-9\.]+)/],
          ["safari", /Version\/([0-9\.]+).+Safari/],
          ["chrome", /Chrome\/([0-9\.]+)/],
          ["ie", /MSIE ([0-9]+)/],
          ["ie", /Trident\/.+rv:([0-9]+)/]
        ];
        for (let o = 0; o < i.length; o++) {
          if (e.match(i[o][1])) {
            n = i[o][0];
            r = parseFloat(RegExp.$1);
            break;
          }
        }
        t.name = n;
        t.version = r;
        n = "other";
        const osList = [
          ["ios", /([0-9_]+) like Mac OS X/, (e2) => e2.replace(/_/g, ".")],
          ["ios", /CPU like Mac OS X/, () => 0],
          ["wp", /Windows Phone ([0-9\.]+)/, null],
          ["android", /Android ([0-9\.]+)/, null],
          ["mac", /Macintosh.+Mac OS X ([0-9_]+)/, (e2) => e2.replace(/_/g, ".")],
          ["windows", /Windows NT ([0-9\.]+)/, null],
          ["linux", /Linux/, null],
          ["bsd", /BSD/, null],
          ["unix", /X11/, null]
        ];
        for (let o = 0; o < osList.length; o++) {
          if (e.match(osList[o][1])) {
            n = osList[o][0];
            const handler = osList[o][2];
            r = parseFloat(handler ? handler(RegExp.$1) : RegExp.$1);
            break;
          }
        }
        if (n === "mac" && "ontouchstart" in window && [1024, 834, 810, 768].includes(screen.width)) {
          n = "ios";
        }
        t.os = n;
        t.osVersion = r;
        t.touch = t.os === "wp" ? navigator.msMaxTouchPoints > 0 : !!("ontouchstart" in window);
        t.mobile = ["wp", "android", "ios", "bb"].includes(t.os);
      }
    };
    t.init();
    return t;
  }();
  var browser_default = browser;
})();
