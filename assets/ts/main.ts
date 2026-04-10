import jQuery from "jquery";
import breakpoints from "./breakpoints";
import "./util"; // Load jQuery plugins

type SummaryItem = {
  ai_title: string | null;
  ai_description: string | null;
  url_to_image: string | null;
  summary: string | null;
};

function resolveImageSource(rawImage: string): string {
  const isDirectSource =
    rawImage.startsWith("data:") ||
    rawImage.startsWith("http://") ||
    rawImage.startsWith("https://") ||
    rawImage.startsWith("//") ||
    rawImage.startsWith("/");

  return isDirectSource ? rawImage : `data:image/jpeg;base64,${rawImage}`;
}

async function hydrateSummaryPosts(): Promise<void> {
  const posts = Array.from(document.querySelectorAll<HTMLElement>("#main article.post"));
  const miniPosts = Array.from(
    document.querySelectorAll<HTMLElement>("#sidebar .mini-posts article.mini-post")
  );

  const recordsNeeded = posts.length + miniPosts.length;
  if (recordsNeeded === 0) return;

  try {
    const response = await fetch(`/api/summaries?limit=${recordsNeeded}`);
    if (!response.ok) return;

    const payload = (await response.json()) as { data?: SummaryItem[] };
    const summaries = payload.data ?? [];

    summaries.slice(0, posts.length).forEach((item, index) => {
      const post = posts[index];
      const title = item.ai_title?.trim() || "Untitled Summary";
      const description = item.ai_description?.trim() || "No description available.";
      const summaryText = item.summary?.trim() || description;

      const headingLink = post.querySelector<HTMLAnchorElement>("header .title h2 a");
      if (headingLink) headingLink.textContent = title;

      const headerDescription = post.querySelector<HTMLParagraphElement>("header .title p");
      if (headerDescription) headerDescription.textContent = description;

      const bodyDescription = post.querySelector<HTMLParagraphElement>(":scope > p");
      if (bodyDescription) bodyDescription.textContent = summaryText;

      const image = post.querySelector<HTMLImageElement>("a.image.featured img");
      const rawImage = item.url_to_image?.trim();
      if (image && rawImage) {
        image.src = resolveImageSource(rawImage);
        image.alt = title;
      }
    });

    miniPosts.forEach((miniPost, index) => {
      const item = summaries[posts.length + index] ?? summaries[index];
      if (!item) return;

      const title = item.ai_title?.trim() || "Untitled Summary";
      const headingLink = miniPost.querySelector<HTMLAnchorElement>("header h3 a");
      if (headingLink) headingLink.textContent = title;

      const image = miniPost.querySelector<HTMLImageElement>("a.image img");
      const rawImage = item.url_to_image?.trim();
      if (image && rawImage) {
        image.src = resolveImageSource(rawImage);
        image.alt = title;
      }
    });
  } catch {
    // Keep static fallback content if API request fails.
  }
}

(function ($: JQueryStatic) {
  void hydrateSummaryPosts();

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