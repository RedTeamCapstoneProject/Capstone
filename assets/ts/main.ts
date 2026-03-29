import jQuery from "jquery";
import breakpoints from "./breakpoints";
import "./util"; // Load jQuery plugins

(function ($: JQueryStatic) {
  const $window = $(window);
  const $body = $("body");
  const $menu = $("#menu");
  const $sidebar = $("#sidebar");
  const $main = $("#main");

  // Breakpoints
  breakpoints({
    xlarge: ["1281px", "1680px"],
    large: ["981px", "1280px"],
    medium: ["737px", "980px"],
    small: ["481px", "736px"],
    xsmall: [null as any, "480px"],
  });

  // Play initial animations
  $window.on("load", () => {
    window.setTimeout(() => {
      $body.removeClass("is-preload");
    }, 100);
  });

  // Menu
  $menu.appendTo($body).panel({
    delay: 500,
    hideOnClick: true,
    hideOnSwipe: true,
    resetScroll: true,
    resetForms: true,
    side: "right",
    target: $body,
    visibleClass: "is-menu-visible",
  });

  // Menu toggle
  $body.on("click", '[href="#menu"]', (event) => {
    event.preventDefault();
    $body.toggleClass("is-menu-visible");
  });

  // Search (header)
  const $search = $("#search");
  const $search_input = $search.find("input");

  $body.on("click", '[href="#search"]', (event) => {
    event.preventDefault();
    if (!$search.hasClass("visible")) {
      ($search[0] as HTMLFormElement).reset();
      $search.addClass("visible");
      $search_input.focus();
    }
  });

  $search_input
    .on("keydown", (event) => {
      if (event.keyCode === 27) $search_input.blur();
    })
    .on("blur", () => {
      window.setTimeout(() => {
        $search.removeClass("visible");
      }, 100);
    });

  // Intro repositioning
  const $intro = $("#intro");

  breakpoints.on("<=large", () => {
    $intro.prependTo($main);
  });

  breakpoints.on(">large", () => {
    $intro.prependTo($sidebar);
  });

})(jQuery);