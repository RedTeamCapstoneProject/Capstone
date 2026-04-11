import jQuery from "jquery";
import breakpoints from "./breakpoints";
import "./util"; // Load jQuery plugins

type SummaryItem = {
  id: number | string;
  ai_title: string | null;
  ai_description: string | null;
  url_to_image: string | null;
  summary: string | null;
  source_names?: string[] | null;
  authors?: string[] | null;
  urls?: string[] | null;
};

type SummariesResponse = { data?: SummaryItem[] | SummaryItem };

function resolveImageSource(rawImage: string): string {
  const isDirectSource =
    rawImage.startsWith("data:") ||
    rawImage.startsWith("http://") ||
    rawImage.startsWith("https://") ||
    rawImage.startsWith("//") ||
    rawImage.startsWith("/");

  return isDirectSource ? rawImage : `data:image/jpeg;base64,${rawImage}`;
}

function normalizeSummaryId(value: number | string | null | undefined): number | null {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;

  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function buildSummaryHref(id: number | string | null | undefined): string {
  const normalizedId = normalizeSummaryId(id);
  if (normalizedId === null) return "single.html";
  return `single.html?id=${normalizedId}`;
}

function readSummaryItemFromPayload(payload: SummariesResponse): SummaryItem | null {
  const data = payload.data;
  if (!data) return null;
  if (Array.isArray(data)) return data[0] ?? null;
  return data;
}

function toCleanList(values?: string[] | null): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
}

function renderArticleMeta(item: SummaryItem): void {
  const footer = document.querySelector<HTMLElement>("#main article.post footer");
  if (!footer) return;

  const sourceNames = toCleanList(item.source_names);
  const authors = toCleanList(item.authors);
  const urls = toCleanList(item.urls);

  footer.innerHTML = "";

  const createRow = (label: string, content: HTMLElement | string): void => {
    const paragraph = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = `${label}: `;
    paragraph.appendChild(strong);

    if (typeof content === "string") {
      paragraph.append(content);
    } else {
      paragraph.appendChild(content);
    }

    footer.appendChild(paragraph);
  };

  createRow("Sources", sourceNames.length > 0 ? sourceNames.join(", ") : "Not available");
  createRow("Authors", authors.length > 0 ? authors.join(", ") : "Not available");

  if (urls.length > 0) {
    const list = document.createElement("ul");
    urls.forEach((url) => {
      const itemElement = document.createElement("li");
      const link = document.createElement("a");
      link.href = url;
      link.textContent = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      itemElement.appendChild(link);
      list.appendChild(itemElement);
    });

    createRow("URLs", list);
  } else {
    createRow("URLs", "Not available");
  }
}

async function hydrateSingleSummaryPage(): Promise<boolean> {
  if (!document.body.classList.contains("single")) return false;

  const idParam = new URLSearchParams(window.location.search).get("id");
  const parsedId = idParam ? Number.parseInt(idParam, 10) : Number.NaN;
  const isValidId = Number.isFinite(parsedId) && parsedId > 0;
  const endpoint = isValidId ? `/api/summaries?id=${parsedId}` : "/api/summaries?limit=1";

  try {
    const response = await fetch(endpoint);
    if (!response.ok) return true;

    const payload = (await response.json()) as SummariesResponse;
    const item = readSummaryItemFromPayload(payload);
    if (!item) return true;

    const title = item.ai_title?.trim() || "Untitled Summary";
    const description = item.ai_description?.trim() || "No description available.";
    const summaryText = item.summary?.trim() || description;
    const detailHref = buildSummaryHref(item.id);

    const titleLink = document.querySelector<HTMLAnchorElement>("#main article.post header .title h2 a");
    if (titleLink) {
      titleLink.textContent = title;
      titleLink.href = detailHref;
    }

    const subtitle = document.querySelector<HTMLParagraphElement>("#main article.post header .title p");
    if (subtitle) subtitle.textContent = description;

    const bodyParagraphs = Array.from(document.querySelectorAll<HTMLParagraphElement>("#main article.post > p"));
    if (bodyParagraphs[0]) bodyParagraphs[0].textContent = summaryText;
    bodyParagraphs.slice(1).forEach((paragraph) => {
      paragraph.textContent = "";
      paragraph.style.display = "none";
    });

    const image = document.querySelector<HTMLImageElement>("#main article.post .image.featured img");
    const rawImage = item.url_to_image?.trim();
    if (image && rawImage) {
      image.src = resolveImageSource(rawImage);
      image.alt = title;
    }

    renderArticleMeta(item);
  } catch {
    // Keep static fallback content if API request fails.
  }

  return true;
}

async function hydrateSummaryPosts(): Promise<void> {
  if (await hydrateSingleSummaryPage()) return;

  const posts = Array.from(document.querySelectorAll<HTMLElement>("#main article.post"));
  const miniPosts = Array.from(
    document.querySelectorAll<HTMLElement>("#sidebar .mini-posts article.mini-post")
  );
  const sidebarPosts = Array.from(
    document.querySelectorAll<HTMLElement>("#sidebar ul.posts > li > article")
  );

  const recordsNeeded = posts.length + miniPosts.length + sidebarPosts.length;
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
      const detailHref = buildSummaryHref(item.id);

      const headingLink = post.querySelector<HTMLAnchorElement>("header .title h2 a");
      if (headingLink) {
        headingLink.textContent = title;
        headingLink.href = detailHref;
      }

      const headerDescription = post.querySelector<HTMLParagraphElement>("header .title p");
      if (headerDescription) headerDescription.textContent = description;

      const bodyDescription = post.querySelector<HTMLParagraphElement>(":scope > p");
      if (bodyDescription) bodyDescription.textContent = summaryText;

      const image = post.querySelector<HTMLImageElement>("a.image.featured img");
      const imageLink = post.querySelector<HTMLAnchorElement>("a.image.featured");
      if (imageLink) imageLink.href = detailHref;

      const continueReading = post.querySelector<HTMLAnchorElement>("footer .actions .button");
      if (continueReading) continueReading.href = detailHref;

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
      const detailHref = buildSummaryHref(item.id);
      const headingLink = miniPost.querySelector<HTMLAnchorElement>("header h3 a");
      if (headingLink) {
        headingLink.textContent = title;
        headingLink.href = detailHref;
      }

      const imageLink = miniPost.querySelector<HTMLAnchorElement>("a.image");
      if (imageLink) imageLink.href = detailHref;

      const image = miniPost.querySelector<HTMLImageElement>("a.image img");
      const rawImage = item.url_to_image?.trim();
      if (image && rawImage) {
        image.src = resolveImageSource(rawImage);
        image.alt = title;
      }
    });

    sidebarPosts.forEach((sidebarPost, index) => {
      const item = summaries[posts.length + miniPosts.length + index] ?? summaries[index];
      if (!item) return;

      const title = item.ai_title?.trim() || "Untitled Summary";
      const detailHref = buildSummaryHref(item.id);
      const headingLink = sidebarPost.querySelector<HTMLAnchorElement>("header h3 a");
      if (headingLink) {
        headingLink.textContent = title;
        headingLink.href = detailHref;
      }

      const imageLink = sidebarPost.querySelector<HTMLAnchorElement>("a.image");
      if (imageLink) imageLink.href = detailHref;

      const image = sidebarPost.querySelector<HTMLImageElement>("a.image img");
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