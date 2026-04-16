import jQuery from "jquery";
import breakpoints from "./breakpoints";
import "./util"; 

type SummaryItem = {
  id: number | string;
  category?: string | null;
  ai_title: string | null;
  ai_description: string | null;
  url_to_image: string | null;
  summary: string | null;
  likeIm5?: string | null;
  "5ws"?: string | null;
  source_names?: string[] | null;
  authors?: string[] | null;
  urls?: string[] | null;
  created_at?: string | null;
};

type SummariesResponse = { data?: SummaryItem[] | SummaryItem };

type StoredUser = {
  id: number;
  email: string;
  preferences?: string[];
};

const categories = new Set([
  "business",
  "entertainment",
  "general",
  "health",
  "science",
  "sports",
  "technology",
]);

const FALLBACK_IMAGE_SRC = "images/pic01.jpg";

function normalizeCategoryPreferences(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim().toLowerCase())
        .filter((value) => categories.has(value))
    )
  );
}

function getStoredUserPreferenceCategories(): string[] {
  try {
    const rawNewsFilters = localStorage.getItem("newsFilters");
    if (rawNewsFilters) {
      const parsed = JSON.parse(rawNewsFilters) as Record<string, unknown>;
      const selectedFromFilters = Object.entries(parsed)
        .filter(([, value]) => value === true)
        .map(([key]) => key.trim().toLowerCase())
        .filter((key) => categories.has(key));

      if (selectedFromFilters.length > 0) {
        return Array.from(new Set(selectedFromFilters));
      }
    }
  } catch {

  }

  try {
    const raw = localStorage.getItem("loggedInUser");
    if (!raw) return [];

    const user = JSON.parse(raw) as StoredUser;
    return normalizeCategoryPreferences(user.preferences);
  } catch {
    return [];
  }
}

function getNormalizedItemCategory(item: SummaryItem): string | null {
  const rawCategory = item.category;
  if (typeof rawCategory !== "string") return null;

  const normalized = rawCategory.trim().toLowerCase();
  return categories.has(normalized) ? normalized : null;
}

function resolveImageSource(rawImage: string): string {
  const isDirectSource =
    rawImage.startsWith("data:") ||
    rawImage.startsWith("http://") ||
    rawImage.startsWith("https://") ||
    rawImage.startsWith("//") ||
    rawImage.startsWith("/");

  if (!isDirectSource) return `data:image/jpeg;base64,${rawImage}`;

  if (rawImage.startsWith("/") || rawImage.startsWith("data:")) return rawImage;

  const normalizedRemoteUrl = rawImage.startsWith("//")
    ? `${window.location.protocol}${rawImage}`
    : rawImage;

  return `/api/summaries?imageUrl=${encodeURIComponent(normalizedRemoteUrl)}`;
}

function setImageWithFallback(
  image: HTMLImageElement,
  rawImage: string | null | undefined,
  altText: string
): void {
  image.alt = altText;

  image.onerror = () => {
    image.onerror = null;
    image.src = FALLBACK_IMAGE_SRC;
  };

  const normalizedRaw = rawImage?.trim();
  if (!normalizedRaw) {
    image.src = FALLBACK_IMAGE_SRC;
    return;
  }

  image.src = resolveImageSource(normalizedRaw);
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

export function readSummaryItemFromPayload(payload: SummariesResponse): SummaryItem | null {
  const data = payload.data;
  if (!data) return null;
  if (Array.isArray(data)) return data[0] ?? null;
  return data;
}

function getCategoryFromUrl(): string | null {
  const rawCategory = new URLSearchParams(window.location.search).get("category");
  if (!rawCategory) return null;

  const normalized = rawCategory.trim().toLowerCase();
  if (!categories.has(normalized)) return null;

  return normalized;
}

function formatSummaryForDisplay(summaryText: string): string {
  const normalized = summaryText.replace(/\r\n/g, "\n").trim();
  const bulletsOnNewLines = normalized.replace(/\n?\s*\*\s+/g, "\n* ");
  const firstBulletIndex = bulletsOnNewLines.indexOf("\n* ");

  if (firstBulletIndex === -1) return bulletsOnNewLines;

  const body = bulletsOnNewLines.slice(0, firstBulletIndex).trimEnd();
  const bullets = bulletsOnNewLines.slice(firstBulletIndex).trimStart();
  return `${body}\n\n${bullets}`;
}

function toCleanList(values?: string[] | null): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
}

function uniqueList(values: string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  values.forEach((value) => {
    if (seen.has(value)) return;
    seen.add(value);
    ordered.push(value);
  });

  return ordered;
}

function renderArticleMeta(item: SummaryItem): void {
  const footer = document.querySelector<HTMLElement>("#main article.post footer");
  if (!footer) return;

  const sourceNames = uniqueList(toCleanList(item.source_names));
  const authors = uniqueList(toCleanList(item.authors));
  const urls = uniqueList(toCleanList(item.urls));

  footer.innerHTML = "";
  footer.style.display = "block";
  footer.style.alignItems = "initial";

  const metaWrapper = document.createElement("div");
  metaWrapper.className = "article-meta";

  const createSection = (label: string, content: HTMLElement | string): void => {
    const section = document.createElement("section");
    section.style.marginBottom = "1.25rem";

    const heading = document.createElement("h4");
    heading.textContent = `${label}:`;
    heading.style.marginBottom = "0.5rem";
    section.appendChild(heading);

    if (typeof content === "string") {
      const paragraph = document.createElement("p");
      paragraph.textContent = content;
      paragraph.style.marginBottom = "0";
      paragraph.style.whiteSpace = "normal";
      section.appendChild(paragraph);
    } else {
      section.appendChild(content);
    }

    metaWrapper.appendChild(section);
  };

  if (sourceNames.length > 0) {
    const list = document.createElement("ul");
    sourceNames.forEach((source) => {
      const listItem = document.createElement("li");
      listItem.textContent = source;
      list.appendChild(listItem);
    });
    createSection("Sources", list);
  } else {
    createSection("Sources", "Not available");
  }

  if (authors.length > 0) {
    const list = document.createElement("ul");
    authors.forEach((author) => {
      const listItem = document.createElement("li");
      listItem.textContent = author;
      list.appendChild(listItem);
    });
    createSection("Authors", list);
  } else {
    createSection("Authors", "Not available");
  }

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

    createSection("URLs", list);
  } else {
    createSection("URLs", "Not available");
  }

  const lastSection = metaWrapper.lastElementChild as HTMLElement | null;
  if (lastSection) lastSection.style.marginBottom = "0";

  footer.appendChild(metaWrapper);
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

    const generalTabPanel = document.querySelector<HTMLElement>("#tab-general");
    const bodyParagraph = generalTabPanel?.querySelector<HTMLParagraphElement>("p");
    if (bodyParagraph) {
      bodyParagraph.textContent = formatSummaryForDisplay(summaryText);
      bodyParagraph.style.whiteSpace = "pre-line";
    }

    const eli5Panel = document.querySelector<HTMLElement>("#tab-eli5");
    if (eli5Panel) {
      const eli5Text = item.likeIm5?.trim();
      eli5Panel.innerHTML = "";
      const eli5P = document.createElement("p");
      eli5P.textContent = eli5Text ? formatSummaryForDisplay(eli5Text) : "Like I'm Five summary not available.";
      eli5P.style.whiteSpace = "pre-line";
      eli5Panel.appendChild(eli5P);
    }

    const fiveWsPanel = document.querySelector<HTMLElement>("#tab-fivews");
    if (fiveWsPanel) {
      const fiveWsText = item["5ws"]?.trim();
      fiveWsPanel.innerHTML = "";
      const fiveWsP = document.createElement("p");
      fiveWsP.textContent = fiveWsText ? formatSummaryForDisplay(fiveWsText) : "Five W's summary not available.";
      fiveWsP.style.whiteSpace = "pre-line";
      fiveWsPanel.appendChild(fiveWsP);
    }

    const image = document.querySelector<HTMLImageElement>("#main article.post .image.featured img");
    if (image) setImageWithFallback(image, item.url_to_image, title);

    renderArticleMeta(item);
  } catch {
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

  const selectedCategory = getCategoryFromUrl();
  const preferredCategories = selectedCategory ? [] : getStoredUserPreferenceCategories();
  const needsPreferenceFilter = !selectedCategory && preferredCategories.length > 0;
  const fetchLimit = needsPreferenceFilter ? recordsNeeded * 3 : recordsNeeded;
  const queryParams = new URLSearchParams({ limit: String(fetchLimit) });

  if (selectedCategory) {
    queryParams.set("category", selectedCategory);
  } else if (preferredCategories.length === 1) {
    queryParams.set("category", preferredCategories[0]);
  } else if (preferredCategories.length > 1) {
    queryParams.set("categories", preferredCategories.join(","));
  }

  try {
    const response = await fetch(`/api/summaries?${queryParams.toString()}`);
    if (!response.ok) return;

    const payload = (await response.json()) as { data?: SummaryItem[] };
    const summaries = payload.data ?? [];
    const allowedCategories =
      selectedCategory !== null
        ? new Set([selectedCategory])
        : preferredCategories.length > 0
        ? new Set(preferredCategories)
        : null;
    const filteredSummaries =
      allowedCategories === null
        ? summaries
        : summaries.filter((item) => {
            const itemCategory = getNormalizedItemCategory(item);
            return itemCategory !== null && allowedCategories.has(itemCategory);
          });
    filteredSummaries.sort((a, b) => {
      const toDateOnly = (ts: string | null | undefined): number => {
        if (!ts) return 0;
        const d = new Date(ts);
        return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
      };
      const dateDiff = toDateOnly(b.created_at) - toDateOnly(a.created_at);
      if (dateDiff !== 0) return dateDiff;
      const urlCountA = (a.urls?.length ?? 0);
      const urlCountB = (b.urls?.length ?? 0);
      return urlCountB - urlCountA;
    });

    let cursor = 0;

    posts.forEach((post) => {
      const item = filteredSummaries[cursor++];
      if (!item) {
        post.style.display = "none";
        return;
      }

      post.style.display = "";
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
      if (image) setImageWithFallback(image, rawImage, title);
    });

    miniPosts.forEach((miniPost) => {
      const item = filteredSummaries[cursor++];
      if (!item) {
        miniPost.style.display = "none";
        return;
      }

      miniPost.style.display = "";

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
      if (image) setImageWithFallback(image, rawImage, title);
    });

    sidebarPosts.forEach((sidebarPost) => {
      const item = filteredSummaries[cursor++];
      if (!item) {
        sidebarPost.style.display = "none";
        return;
      }

      sidebarPost.style.display = "";

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
      if (image) setImageWithFallback(image, rawImage, title);
    });
  } catch {
  }
}

(function ($: JQueryStatic) {
  void hydrateSummaryPosts();
  window.addEventListener("auth-state-changed", () => {
    void hydrateSummaryPosts();
  });

  const $window = $(window);
  const $body = $("body");
  const $menu = $("#menu");
  const $sidebar = $("#sidebar");
  const $main = $("#main");

  breakpoints({
    xlarge: ["1281px", "1680px"],
    large: ["981px", "1280px"],
    medium: ["737px", "980px"],
    small: ["481px", "736px"],
    xsmall: [null as any, "480px"],
  });

  $window.on("load", () => {
    window.setTimeout(() => {
      $body.removeClass("is-preload");
    }, 100);
  });

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

  $body.on("click", '[href="#menu"]', (event) => {
    event.preventDefault();
    $body.toggleClass("is-menu-visible");
  });

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

  const $intro = $("#intro");

  breakpoints.on("<=large", () => {
    $intro.prependTo($main);
  });

  breakpoints.on(">large", () => {
    $intro.prependTo($sidebar);
  });

})(jQuery);