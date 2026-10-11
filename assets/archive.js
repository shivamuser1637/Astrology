(function () {
  "use strict";

  const FEED_URL = "https://www.alokranjantripathi.in/feeds/posts/default?alt=json-in-script&max-results=100&callback=astroAlokArchiveLoaded";
  const PAGE_SIZE = 10;
  const ALLOWED_TAGS = new Set([
    "A", "B", "BLOCKQUOTE", "BR", "EM", "H2", "H3", "H4", "HR",
    "I", "IMG", "LI", "OL", "P", "STRONG", "TABLE", "TBODY",
    "TD", "TH", "THEAD", "TR", "UL"
  ]);
  const DROPPED_TAGS = new Set([
    "AUDIO", "BUTTON", "EMBED", "FORM", "IFRAME", "INPUT", "OBJECT",
    "SCRIPT", "SOURCE", "STYLE", "SVG", "VIDEO"
  ]);
  const list = document.getElementById("archive-list");
  if (!list) return;

  const status = document.getElementById("archive-status");
  const search = document.getElementById("archive-search");
  const category = document.getElementById("archive-category");
  const pagination = document.getElementById("archive-pagination");
  const previous = document.getElementById("archive-previous");
  const next = document.getElementById("archive-next");
  const pageNumber = document.getElementById("archive-page-number");
  let articles = [];
  let currentPage = 1;

  function localizedText(english, hindi) {
    return document.documentElement.lang === "hi" ? hindi : english;
  }

  function translate(element) {
    const language = document.documentElement.lang === "hi" ? "hi" : "en";
    element.querySelectorAll("[data-en][data-hi]").forEach(function (item) {
      item.innerHTML = item.getAttribute("data-" + language);
    });
  }

  function readValue(value) {
    return value && typeof value.$t === "string" ? value.$t : "";
  }

  function safeWebUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
    } catch (error) {
      return "";
    }
  }

  function articleText(html) {
    const parsed = new DOMParser().parseFromString(html || "", "text/html");
    return (parsed.body.textContent || "").replace(/\s+/g, " ").trim();
  }

  function safeArticleContent(html) {
    const parsed = new DOMParser().parseFromString(html || "", "text/html");

    function copyNodes(source, destination) {
      Array.from(source.childNodes).forEach(function (node) {
        if (node.nodeType === Node.TEXT_NODE) {
          destination.appendChild(document.createTextNode(node.nodeValue));
          return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const tag = node.tagName;
        if (DROPPED_TAGS.has(tag)) return;
        if (!ALLOWED_TAGS.has(tag)) {
          copyNodes(node, destination);
          return;
        }

        const clean = document.createElement(tag.toLowerCase());
        if (tag === "A") {
          const href = safeWebUrl(node.getAttribute("href") || "");
          if (href) {
            clean.href = href;
            clean.target = "_blank";
            clean.rel = "noopener noreferrer";
          }
        } else if (tag === "IMG") {
          const src = safeWebUrl(node.getAttribute("src") || "");
          if (!src) return;
          clean.src = src;
          clean.alt = node.getAttribute("alt") || "";
          clean.loading = "lazy";
        }
        copyNodes(node, clean);
        destination.appendChild(clean);
      });
    }

    const content = document.createDocumentFragment();
    copyNodes(parsed.body, content);
    return content;
  }

  function normalizeEntry(entry) {
    const title = readValue(entry.title) || localizedText("Untitled article", "शीर्षक रहित लेख");
    const sourceUrl = safeWebUrl((entry.link || []).filter(function (item) {
      return item.rel === "alternate";
    }).map(function (item) {
      return item.href;
    })[0] || "");
    const html = readValue(entry.content) || readValue(entry.summary);
    const excerpt = articleText(readValue(entry.summary) || html);
    const categories = (entry.category || []).map(function (item) {
      return item.term || "";
    }).filter(Boolean);
    const dateValue = readValue(entry.published);
    const image = entry["media$thumbnail"] && safeWebUrl(entry["media$thumbnail"].url);

    return {
      title: title,
      url: sourceUrl,
      html: html,
      excerpt: excerpt.length > 330 ? excerpt.slice(0, 327).trimEnd() + "…" : excerpt,
      categories: categories,
      published: dateValue,
      image: image || ""
    };
  }

  function dateLabel(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(document.documentElement.lang === "hi" ? "hi-IN" : "en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(date);
  }

  function visibleArticles() {
    const query = search.value.trim().toLocaleLowerCase();
    const selectedCategory = category.value;
    return articles.filter(function (article) {
      const matchesCategory = selectedCategory === "all" || article.categories.indexOf(selectedCategory) !== -1;
      const searchable = [article.title, article.excerpt, article.categories.join(" "), articleText(article.html)]
        .join(" ")
        .toLocaleLowerCase();
      return matchesCategory && (!query || searchable.indexOf(query) !== -1);
    });
  }

  function makeArticleCard(article) {
    const card = document.createElement("article");
    card.className = "archive-card";

    if (article.image) {
      const image = document.createElement("img");
      image.className = "archive-card-image";
      image.src = article.image;
      image.alt = "";
      image.loading = "lazy";
      card.appendChild(image);
    } else {
      const ornament = document.createElement("div");
      ornament.className = "archive-card-ornament";
      ornament.setAttribute("aria-hidden", "true");
      ornament.textContent = "ॐ";
      card.appendChild(ornament);
    }

    const body = document.createElement("div");
    body.className = "archive-card-body";
    const meta = document.createElement("div");
    meta.className = "archive-card-meta";
    const date = dateLabel(article.published);
    if (date) {
      const time = document.createElement("time");
      time.dateTime = article.published;
      time.textContent = date;
      meta.appendChild(time);
    }
    if (article.categories.length) {
      const topic = document.createElement("span");
      topic.className = "archive-topic";
      topic.textContent = article.categories[0];
      meta.appendChild(topic);
    }
    body.appendChild(meta);

    const heading = document.createElement("h2");
    heading.textContent = article.title;
    body.appendChild(heading);

    if (article.excerpt) {
      const excerpt = document.createElement("p");
      excerpt.className = "archive-excerpt";
      excerpt.textContent = article.excerpt;
      body.appendChild(excerpt);
    }

    if (article.html) {
      const details = document.createElement("details");
      details.className = "archive-article";
      const summary = document.createElement("summary");
      summary.setAttribute("data-en", "Read the full article");
      summary.setAttribute("data-hi", "पूरा लेख पढ़ें");
      summary.textContent = localizedText("Read the full article", "पूरा लेख पढ़ें");
      details.appendChild(summary);
      const fullText = document.createElement("div");
      fullText.className = "archive-article-content";
      fullText.appendChild(safeArticleContent(article.html));
      details.appendChild(fullText);
      body.appendChild(details);
    }

    if (article.url) {
      const source = document.createElement("a");
      source.className = "archive-original-link";
      source.href = article.url;
      source.target = "_blank";
      source.rel = "noopener noreferrer";
      source.textContent = localizedText("View original post", "मूल पोस्ट देखें") + " ↗";
      body.appendChild(source);
    }

    card.appendChild(body);
    return card;
  }

  function render() {
    const filtered = visibleArticles();
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, pageCount);
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageArticles = filtered.slice(start, start + PAGE_SIZE);
    list.replaceChildren();
    pageArticles.forEach(function (article) {
      list.appendChild(makeArticleCard(article));
    });

    const language = document.documentElement.lang === "hi";
    status.textContent = filtered.length
      ? (language ? filtered.length + " लेख" : filtered.length + (filtered.length === 1 ? " article" : " articles"))
      : localizedText("No articles match your search.", "आपकी खोज से मेल खाता कोई लेख नहीं मिला।");
    pagination.hidden = filtered.length <= PAGE_SIZE;
    previous.disabled = currentPage <= 1;
    next.disabled = currentPage >= pageCount;
    pageNumber.textContent = localizedText("Page ", "पृष्ठ ") + currentPage + " / " + pageCount;
    translate(list);
  }

  function loadError() {
    status.textContent = localizedText(
      "The article feed could not be loaded. You can still browse all posts on the original blog.",
      "लेख फ़ीड लोड नहीं हो सकी। आप मूल ब्लॉग पर सभी पोस्ट देख सकते हैं।"
    );
    const link = document.createElement("a");
    link.className = "button button-gold";
    link.href = "https://www.alokranjantripathi.in/";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = localizedText("Open the original blog", "मूल ब्लॉग खोलें");
    list.replaceChildren(link);
  }

  search.addEventListener("input", function () {
    currentPage = 1;
    render();
  });
  category.addEventListener("change", function () {
    currentPage = 1;
    render();
  });
  previous.addEventListener("click", function () {
    currentPage -= 1;
    render();
  });
  next.addEventListener("click", function () {
    currentPage += 1;
    render();
  });

  const script = document.createElement("script");
  const timeout = window.setTimeout(loadError, 15000);
  script.src = FEED_URL;
  script.async = true;
  script.onerror = function () {
    window.clearTimeout(timeout);
    loadError();
  };
  window.astroAlokArchiveLoaded = function (response) {
    window.clearTimeout(timeout);
    const entries = response && response.feed && Array.isArray(response.feed.entry) ? response.feed.entry : [];
    articles = entries.map(normalizeEntry).filter(function (article) {
      return article.title && (article.html || article.url);
    });
    articles.sort(function (a, b) {
      return new Date(b.published).getTime() - new Date(a.published).getTime();
    });
    if (!articles.length) {
      loadError();
      return;
    }
    const categories = Array.from(new Set(articles.reduce(function (all, article) {
      return all.concat(article.categories);
    }, []))).sort(function (a, b) {
      return a.localeCompare(b);
    });
    categories.forEach(function (name) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      category.appendChild(option);
    });
    render();
  };
  document.head.appendChild(script);
}());
