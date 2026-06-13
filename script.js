(function () {
  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const siteState = {
    currentBlogFilter: "all",
  };

  function safeStorageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      // Ignore storage issues in restricted/private contexts.
    }
  }

  function escapeSelector(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(value);
    }

    return String(value).replace(/["\\]/g, "\\$&");
  }

  function getStoredTheme() {
    return safeStorageGet("theme") || root.getAttribute("data-theme") || "dark";
  }

  function updateThemeButtons(theme) {
    const nextLabel = theme === "dark" ? "light" : "dark";
    document.querySelectorAll(".theme-btn").forEach((button) => {
      button.textContent = `[ ${nextLabel} ]`;
      button.setAttribute("aria-label", `Switch to ${nextLabel} theme`);
    });
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    updateThemeButtons(theme);
  }

  function persistTheme(theme) {
    safeStorageSet("theme", theme);
    applyTheme(theme);
  }

  window.toggleTheme = function toggleTheme() {
    const nextTheme = getStoredTheme() === "dark" ? "light" : "dark";
    persistTheme(nextTheme);
  };

  function initTheme() {
    applyTheme(getStoredTheme());
  }

  function initNavState() {
    const currentPage = window.location.pathname.split("/").pop() || "index.html";

    document.querySelectorAll(".nav-links a").forEach((link) => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) {
        return;
      }

      const linkUrl = new URL(href, window.location.href);
      const linkPage = linkUrl.pathname.split("/").pop() || "index.html";

      if (linkPage === currentPage && !linkUrl.hash) {
        link.classList.add("is-current");
      }
    });

    const sectionLinks = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'))
      .map((link) => {
        const target = document.querySelector(link.getAttribute("href"));
        return target ? { link, target } : null;
      })
      .filter(Boolean);

    if (!sectionLinks.length || !("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          sectionLinks.forEach((item) => item.link.classList.remove("is-current"));
          const active = sectionLinks.find((item) => item.target === entry.target);
          if (active) {
            active.link.classList.add("is-current");
          }
        });
      },
      {
        rootMargin: "-35% 0px -45% 0px",
        threshold: 0,
      }
    );

    sectionLinks.forEach((item) => observer.observe(item.target));
  }

  function initMobileNav() {
    const nav = document.querySelector("nav");
    const navLinks = nav ? nav.querySelector(".nav-links") : null;

    if (!nav || !navLinks || nav.querySelector(".nav-menu-btn")) {
      return;
    }

    const themeButton = nav.querySelector(".theme-btn");
    const buttonParent = nav.querySelector(".nav-right") || nav;
    const menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.className = "nav-menu-btn";
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open navigation menu");
    menuButton.innerHTML = "<span></span><span></span><span></span>";

    const backdrop = document.createElement("div");
    backdrop.className = "nav-drawer-backdrop";

    const drawer = document.createElement("aside");
    drawer.className = "nav-drawer";
    drawer.setAttribute("aria-hidden", "true");
    const mobileLinks = navLinks.cloneNode(true);
    mobileLinks.classList.add("nav-links-mobile");
    drawer.appendChild(mobileLinks);

    if (buttonParent === nav) {
      nav.insertBefore(menuButton, themeButton || null);
    } else {
      buttonParent.insertBefore(menuButton, themeButton || buttonParent.firstChild);
    }

    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);

    const closeDrawer = () => {
      menuButton.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
      drawer.classList.remove("is-open");
      drawer.setAttribute("aria-hidden", "true");
      backdrop.classList.remove("is-open");
      document.body.classList.remove("nav-open");
    };

    const openDrawer = () => {
      menuButton.classList.add("is-open");
      menuButton.setAttribute("aria-expanded", "true");
      drawer.classList.add("is-open");
      drawer.setAttribute("aria-hidden", "false");
      backdrop.classList.add("is-open");
      document.body.classList.add("nav-open");
    };

    menuButton.addEventListener("click", () => {
      if (drawer.classList.contains("is-open")) {
        closeDrawer();
        return;
      }

      openDrawer();
    });

    backdrop.addEventListener("click", closeDrawer);
    drawer.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeDrawer));
    window.addEventListener("resize", () => {
      if (window.innerWidth > 768) {
        closeDrawer();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeDrawer();
      }
    });
  }

  function initReveal() {
    const revealItems = Array.from(document.querySelectorAll(".fade-in"));

    if (!revealItems.length) {
      return;
    }

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12 }
    );

    revealItems.forEach((item) => observer.observe(item));
  }

  function initHeroTag() {
    const tag = document.querySelector("[data-typed-phrases]");

    if (!tag) {
      return;
    }

    const phrases = (tag.dataset.typedPhrases || "")
      .split("|")
      .map((phrase) => phrase.trim())
      .filter(Boolean);

    if (!phrases.length) {
      return;
    }

    if (prefersReducedMotion) {
      tag.textContent = phrases[0];
      return;
    }

    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;
    tag.classList.add("is-live");

    function step() {
      const currentPhrase = phrases[phraseIndex];
      if (!currentPhrase) {
        return;
      }

      charIndex += deleting ? -1 : 1;
      charIndex = Math.max(0, Math.min(currentPhrase.length, charIndex));
      tag.textContent = currentPhrase.slice(0, charIndex);

      let delay = deleting ? 45 : 80;

      if (!deleting && charIndex === currentPhrase.length) {
        deleting = true;
        delay = 1400;
      } else if (deleting && charIndex === 0) {
        deleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        delay = 260;
      }

      window.setTimeout(step, delay);
    }

    tag.textContent = "";
    window.setTimeout(step, 380);
  }

  function parseCounter(counter) {
    const countValue = counter.dataset.count;

    if (countValue) {
      return {
        target: Number(countValue),
        prefix: counter.dataset.prefix || "",
        suffix: counter.dataset.suffix || "",
      };
    }

    const match = counter.textContent.trim().match(/^(\d+)(\+?)$/);
    if (!match) {
      return null;
    }

    return {
      target: Number(match[1]),
      prefix: "",
      suffix: match[2] || "",
    };
  }

  function animateCounter(counter) {
    if (counter.dataset.counterAnimated === "true") {
      return;
    }

    const details = parseCounter(counter);
    if (!details || !Number.isFinite(details.target)) {
      return;
    }

    counter.dataset.counterAnimated = "true";

    if (prefersReducedMotion) {
      counter.textContent = `${details.prefix}${details.target}${details.suffix}`;
      return;
    }

    const duration = 1100;
    const startTime = performance.now();

    function frame(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(details.target * eased);
      counter.textContent = `${details.prefix}${current}${details.suffix}`;

      if (progress < 1) {
        window.requestAnimationFrame(frame);
      }
    }

    window.requestAnimationFrame(frame);
  }

  function initCounters() {
    const counters = Array.from(document.querySelectorAll(".stat-num")).filter((counter) => parseCounter(counter));

    if (!counters.length) {
      return;
    }

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      counters.forEach((counter) => animateCounter(counter));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          animateCounter(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.7 }
    );

    counters.forEach((counter) => observer.observe(counter));
  }

  function initProfileTilt() {
    const card = document.querySelector(".profile-card[data-tilt]");

    if (!card || prefersReducedMotion) {
      return;
    }

    card.classList.add("is-tilt-ready");

    const resetTilt = () => {
      card.style.transform = "";
    };

    card.addEventListener("pointermove", (event) => {
      const bounds = card.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;
      const rotateX = (0.5 - y) * 10;
      const rotateY = (x - 0.5) * 14;

      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-6px)`;
    });

    card.addEventListener("pointerleave", resetTilt);
    card.addEventListener("pointercancel", resetTilt);
  }

  function initCertCards() {
    const certCards = Array.from(document.querySelectorAll(".cert-card"))
      .map((card) => {
        const button = card.querySelector(".cert-card-toggle");
        const panel = card.querySelector(".cert-panel-shell");
        const label = card.querySelector(".cert-expand-copy");

        if (!button || !panel) {
          return null;
        }

        return { card, button, panel, label };
      })
      .filter(Boolean);

    if (!certCards.length) {
      return;
    }

    function setCardState(entry, isOpen) {
      entry.card.classList.toggle("is-open", isOpen);
      entry.button.setAttribute("aria-expanded", String(isOpen));
      entry.panel.setAttribute("aria-hidden", String(!isOpen));

      if (entry.label) {
        entry.label.textContent = isOpen ? "Hide brief" : "Open brief";
      }
    }

    certCards.forEach((entry) => setCardState(entry, false));

    certCards.forEach((entry) => {
      entry.button.addEventListener("click", () => {
        const shouldOpen = !entry.card.classList.contains("is-open");

        certCards.forEach((otherEntry) => {
          setCardState(otherEntry, shouldOpen && otherEntry === entry);
        });
      });
    });
  }

  function findFilterButton(tag) {
    return document.querySelector(`.filter-btn[data-filter="${escapeSelector(tag)}"]`);
  }

  function writeBlogState(tag, query) {
    if (!window.history.replaceState) {
      return;
    }

    const url = new URL(window.location.href);

    if (tag && tag !== "all") {
      url.searchParams.set("tag", tag);
    } else {
      url.searchParams.delete("tag");
    }

    if (query) {
      url.searchParams.set("q", query);
    } else {
      url.searchParams.delete("q");
    }

    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  window.filterPosts = function filterPosts(tag, button, syncUrl) {
    const searchInput = document.getElementById("post-search");
    const cards = Array.from(document.querySelectorAll(".post-card, .post-featured"));
    const countLabel = document.getElementById("posts-count");
    const emptyState = document.getElementById("posts-empty");

    if (!cards.length) {
      return;
    }

    const requestedTag = (tag || "all").toLowerCase();
    const hasMatchingTag =
      requestedTag === "all" ||
      cards.some((card) => {
        const tags = (card.dataset.tags || "")
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean);
        return tags.includes(requestedTag);
      });
    const resolvedTag = hasMatchingTag ? requestedTag : "all";
    const resolvedButton = button || findFilterButton(resolvedTag) || findFilterButton("all");
    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";

    siteState.currentBlogFilter = resolvedTag;

    document.querySelectorAll(".filter-btn").forEach((filterButton) => {
      const isActive = filterButton === resolvedButton;
      filterButton.classList.toggle("active", isActive);
      filterButton.setAttribute("aria-pressed", String(isActive));
    });

    let visibleCount = 0;
    cards.forEach((card) => {
      const tags = (card.dataset.tags || "")
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
      const text = card.textContent.toLowerCase();
      const matchesTag = resolvedTag === "all" || tags.includes(resolvedTag);
      const matchesQuery = !query || text.includes(query);
      const show = matchesTag && matchesQuery;

      card.classList.toggle("is-hidden", !show);
      card.hidden = !show;

      if (show) {
        visibleCount += 1;
      }
    });

    if (countLabel) {
      countLabel.textContent = `${visibleCount} ${visibleCount === 1 ? "post" : "posts"}`;
    }

    if (emptyState) {
      emptyState.hidden = visibleCount !== 0;
    }

    if (syncUrl !== false) {
      writeBlogState(resolvedTag, query);
    }
  };

  function isTypingContext(element) {
    if (!element) {
      return false;
    }

    return (
      element.tagName === "INPUT" ||
      element.tagName === "TEXTAREA" ||
      element.tagName === "SELECT" ||
      element.isContentEditable
    );
  }

  function initBlogControls() {
    const searchInput = document.getElementById("post-search");

    if (!searchInput) {
      return;
    }

    searchInput.addEventListener("input", () => {
      window.filterPosts(siteState.currentBlogFilter, findFilterButton(siteState.currentBlogFilter));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "/" || isTypingContext(document.activeElement)) {
        return;
      }

      event.preventDefault();
      searchInput.focus();
      searchInput.select();
    });

    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get("q") || "";
    const initialFilter = params.get("tag") || "all";
    searchInput.value = initialQuery;
    window.filterPosts(initialFilter, findFilterButton(initialFilter), false);
  }

  async function writeClipboard(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        // Fall through to the legacy copy path below.
      }
    }

    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch (error) {
      copied = false;
    }

    document.body.removeChild(helper);
    return copied;
  }

  async function handleCopyButton(button, text) {
    const originalText = button.dataset.originalText || button.textContent.trim();
    button.dataset.originalText = originalText;

    const copied = await writeClipboard(text);
    button.textContent = copied ? "copied!" : "press Ctrl+C";
    button.classList.toggle("is-copied", copied);

    window.setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove("is-copied");
    }, 1800);
  }

  window.copyCode = function copyCode(button) {
    const block = button ? button.closest(".code-block") : null;
    const pre = block ? block.querySelector("pre") : null;

    if (!button || !pre) {
      return;
    }

    handleCopyButton(button, pre.innerText.trimEnd());
  };

  function initReadingProgress() {
    const article = document.querySelector("article");

    if (!article) {
      return;
    }

    const progressShell = document.createElement("div");
    progressShell.className = "reading-progress";
    progressShell.innerHTML = '<span class="reading-progress-bar"></span>';
    document.body.appendChild(progressShell);

    const progressBar = progressShell.querySelector(".reading-progress-bar");

    function updateProgress() {
      const start = article.offsetTop - 120;
      const distance = article.offsetHeight - window.innerHeight + 240;
      const rawProgress = distance <= 0 ? 1 : (window.scrollY - start) / distance;
      const clampedProgress = Math.max(0, Math.min(1, rawProgress));
      progressBar.style.transform = `scaleX(${clampedProgress})`;
    }

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
  }

  function initTocSpy() {
    const tocLinks = Array.from(document.querySelectorAll('.toc a[href^="#"]'))
      .map((link) => {
        const target = document.querySelector(link.getAttribute("href"));
        return target ? { link, target, hash: link.getAttribute("href") } : null;
      })
      .filter(Boolean);

    if (!tocLinks.length) {
      return;
    }

    function setActive(hash) {
      tocLinks.forEach((entry) => {
        entry.link.classList.toggle("is-active", entry.hash === hash);
      });
    }

    function updateActiveSection() {
      const offset = window.scrollY + 140;
      let active = tocLinks[0];

      tocLinks.forEach((entry) => {
        if (entry.target.offsetTop <= offset) {
          active = entry;
        }
      });

      if (active) {
        setActive(active.hash);
      }
    }

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
  }

  function initImageLightbox() {
    const images = Array.from(document.querySelectorAll(".screenshot-wrap img, .screenshot-grid img"));

    if (!images.length) {
      return;
    }

    const lightbox = document.createElement("div");
    lightbox.className = "image-lightbox";
    lightbox.innerHTML = [
      '<div class="image-lightbox-panel">',
      '  <button type="button" class="image-lightbox-close" aria-label="Close image viewer">close</button>',
      '  <img class="image-lightbox-image" alt="" />',
      '  <div class="image-lightbox-caption"></div>',
      "</div>",
    ].join("");
    document.body.appendChild(lightbox);

    const lightboxImage = lightbox.querySelector(".image-lightbox-image");
    const lightboxCaption = lightbox.querySelector(".image-lightbox-caption");

    function closeLightbox() {
      lightbox.classList.remove("is-open");
      document.body.classList.remove("lightbox-open");
    }

    function openLightbox(image) {
      const wrap = image.closest(".screenshot-wrap");
      const caption = wrap ? wrap.querySelector(".screenshot-caption") : null;

      lightboxImage.src = image.currentSrc || image.src;
      lightboxImage.alt = image.alt || "";
      lightboxCaption.textContent = caption ? caption.innerText.trim() : image.alt || "";
      lightbox.classList.add("is-open");
      document.body.classList.add("lightbox-open");
    }

    images.forEach((image) => {
      image.setAttribute("tabindex", "0");
      image.addEventListener("click", () => openLightbox(image));
      image.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        event.preventDefault();
        openLightbox(image);
      });
    });

    lightbox.querySelector(".image-lightbox-close").addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeLightbox();
      }
    });
  }


  const sitePosts = [
    { title: "PortSwigger SSTI Labs Write-Up", url: "blog/ssti-labs.html", date: "2026-06-14", tags: ["web", "portswigger", "burp", "ssti"], desc: "SSTI labs across ERB, Tornado, FreeMarker, Handlebars, Django, and Twig with screenshots, fingerprinting, and exploit reasoning." },
    { title: "PortSwigger JWT Labs Write-Up", url: "blog/jwt-labs.html", date: "2026-06-07", tags: ["web", "portswigger", "burp", "jwt"], desc: "JWT labs: none-alg, weak secrets, header injection, JWKS, JKU, KID, algorithm confusion." },
    { title: "Frankenstein NAS Build", url: "blog/nas-frankenstein-build.html", date: "2026-04-18", tags: ["homelab", "networking", "storage"], desc: "Old router + powered drive NAS experiment with SMB and mobile access notes." },
    { title: "OWASP Juice Shop Write-Up", url: "blog/juice-shop-writeup.html", date: "2026-04-03", tags: ["web", "xss", "sqli", "owasp", "ctf"], desc: "Juice Shop challenge discovery, Burp workflow, XSS, and SQLi paths." },
    { title: "PortSwigger SQLi Labs Write-Up", url: "blog/sqli-labs.html", date: "2026-04-02", tags: ["web", "portswigger", "sqli", "python", "burp"], desc: "Structured SQL injection lab walkthroughs with manual and Python-assisted exploitation." },
    { title: "Understanding Linux Privilege Escalation", url: "blog/Linux-Privilege-Escalation.html", date: "2025-07-30", tags: ["linux", "privesc", "post-exploitation"], desc: "Enumeration, SUID, sudo, PATH hijacking, cron jobs, capabilities, and kernel paths." },
    { title: "Getting Started with Burp Suite", url: "blog/burp-suite-basics.html", date: "2025-07-23", tags: ["burp", "web", "tools"], desc: "Proxy, Repeater, Intruder, Decoder, and practical manual testing workflow." },
    { title: "Understanding SQL Injection", url: "blog/sql-injection.html", date: "2025-06-15", tags: ["web", "sqli", "owasp"], desc: "Technical SQLi overview: union-based, blind, and time-based techniques." },
    { title: "Hosting a Local Website with XAMPP and LocalToNet", url: "blog/hosting-xampp-localnet.html", date: "2025-07-22", tags: ["tools", "homelab", "networking"], desc: "Expose a local lab/site with XAMPP and LocalToNet for testing and demos." }
  ];

  function tagSlug(tag) {
    const aliases = {
      burp: "burp-suite",
      "burp suite": "burp-suite",
      portswigger: "port-swigger",
      "port swigger": "port-swigger",
      homelab: "homelab",
      home: "homelab"
    };
    const normalized = String(tag || "").trim().toLowerCase();
    return aliases[normalized] || normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function displayTag(tag) {
    const labels = {
      burp: "Burp Suite",
      "burp-suite": "Burp Suite",
      portswigger: "PortSwigger",
      "port-swigger": "PortSwigger",
      homelab: "Home Lab",
      networking: "Networking",
      storage: "Storage",
      web: "Web",
      jwt: "JWT",
      ssti: "SSTI",
      sqli: "SQLi",
      xss: "XSS",
      owasp: "OWASP",
      ctf: "CTF",
      linux: "Linux",
      privesc: "PrivEsc",
      tools: "Tools",
      python: "Python"
    };
    const slug = tagSlug(tag);
    return labels[tag] || labels[slug] || String(tag || "").replace(/(^|[-\s])([a-z])/g, (_, prefix, char) => `${prefix ? " " : ""}${char.toUpperCase()}`).trim();
  }

  function postTagsForDom(post) {
    const tags = new Set();
    (post.tags || []).forEach((tag) => {
      const slug = tagSlug(tag);
      if (slug) {
        tags.add(slug);
      }
      if (slug === "burp-suite") {
        tags.add("burp");
      }
      if (slug === "port-swigger") {
        tags.add("portswigger");
      }
    });
    return Array.from(tags).join(" ");
  }

  function initBlogArchivePosts() {
    const grid = document.getElementById("posts-grid");
    const countLabel = document.getElementById("posts-count");
    if (!document.body.classList.contains("archive-page") || !grid) {
      return;
    }

    const sortedPosts = sitePosts
      .map((post) => ({ ...post, dateObject: new Date(`${post.date}T00:00:00`) }))
      .sort((a, b) => b.dateObject - a.dateObject);

    if (!sortedPosts.length) {
      return;
    }

    document.querySelectorAll(".post-featured").forEach((card) => card.remove());

    const escapeHTML = (value) => String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));

    function renderMeta(post) {
      const tags = (post.tags || []).slice(0, 2);
      return [
        `<span class="post-date">${escapeHTML(post.date)}</span>`,
        ...tags.map((tag) => `<span class="post-tag">${escapeHTML(displayTag(tag))}</span>`)
      ].join("");
    }

    function renderCard(post, featured = false) {
      const cls = featured ? "post-featured fade-in" : "post-card fade-in";
      const metaCls = featured ? "post-featured-meta" : "post-meta";
      return [
        `<a href="${escapeHTML(post.url)}" class="${cls}" data-tags="${escapeHTML(postTagsForDom(post))}">`,
        "  <div>",
        `    <div class="${metaCls}">${renderMeta(post)}</div>`,
        `    <div class="post-title">${escapeHTML(post.title)}</div>`,
        `    <p class="post-excerpt">${escapeHTML(post.desc)}</p>`,
        '    <span class="post-read-more">read post</span>',
        "  </div>",
        "</a>"
      ].join("");
    }

    const [featured, ...rest] = sortedPosts;
    grid.insertAdjacentHTML("beforebegin", renderCard(featured, true));
    grid.innerHTML = rest.map((post) => renderCard(post)).join("");

    if (countLabel) {
      countLabel.textContent = `${sortedPosts.length} posts`;
    }
  }

  function getCurrentPath() {
    return window.location.pathname.replace(/\/index\.html$/, "/") || "/";
  }

  function currentPageDepthPrefix() {
    return window.location.pathname.includes("/blog/") ? "../" : "";
  }

  function siteUrl(path) {
    const raw = String(path || "");
    if (/^(https?:|mailto:|tel:|#)/i.test(raw)) {
      return raw;
    }
    return `${currentPageDepthPrefix()}${raw.replace(/^\/+/, "")}`;
  }

  function normalizePath(path) {
    const raw = String(path || "").split("#")[0].split("?")[0];
    let pathname = raw;
    try {
      const base = raw.startsWith("/") || raw.startsWith(".") || /^(https?:|file:)/i.test(raw)
        ? window.location.href
        : `${window.location.origin}/`;
      pathname = new URL(raw, base).pathname;
    } catch (error) {
      pathname = raw;
    }

    pathname = pathname.replace(/\\/g, "/").replace(/\/index\.html$/, "/");
    const blogIndex = pathname.indexOf("/blog/");
    if (blogIndex !== -1) {
      return pathname.slice(blogIndex + 1);
    }
    if (pathname.endsWith("/blog.html") || pathname === "blog.html") {
      return "blog.html";
    }
    if (pathname.endsWith("/learning-path.html") || pathname === "learning-path.html") {
      return "learning-path.html";
    }
    if (pathname === "/" || pathname.endsWith("/index.html")) {
      return "/";
    }
    return pathname.replace(/^\/+/, "");
  }

  function pageIncludesText(value) {
    return document.body.textContent.toLowerCase().includes(value.toLowerCase());
  }

  function isHomePage() {
    const path = getCurrentPath();
    return path === "/" || path.endsWith("/index.html") || document.body.classList.contains("landing-page");
  }

  function initBootOverlay() {
    if (!isHomePage() || prefersReducedMotion || safeStorageGet("vh-boot-seen") === "true") {
      return;
    }

    const overlay = document.createElement("div");
    overlay.className = "boot-overlay";
    overlay.innerHTML = [
      '<div class="boot-terminal" role="status" aria-live="polite">',
      '  <div class="boot-terminal-bar"><span class="boot-dot"></span><span class="boot-dot"></span><span class="boot-dot"></span></div>',
      '  <div class="boot-lines">',
      '    <span>initializing <strong>field-notes</strong></span>',
      '    <span>loading posts, payloads, and lab maps</span>',
      '    <span>press <strong>/</strong> for command mode</span>',
      '  </div>',
      '</div>'
    ].join("");

    document.body.appendChild(overlay);
    safeStorageSet("vh-boot-seen", "true");
    window.setTimeout(() => overlay.classList.add("is-done"), 1350);
    window.setTimeout(() => overlay.remove(), 1850);
  }

  function initGlowCards() {
    const cards = Array.from(document.querySelectorAll(".post-card, .post-featured, .cert-card, .profile-card, .contact-card, .related-post-card, .post-nav-card, .learning-card"));
    if (!cards.length || prefersReducedMotion) {
      return;
    }

    cards.forEach((card) => {
      card.setAttribute("data-glow-card", "");
      if (!card.querySelector(":scope > .scanline-sweep")) {
        const sweep = document.createElement("span");
        sweep.className = "scanline-sweep";
        sweep.setAttribute("aria-hidden", "true");
        card.appendChild(sweep);
      }
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty("--mx", `${x.toFixed(1)}%`);
        card.style.setProperty("--my", `${y.toFixed(1)}%`);
      });
    });
  }

  function initCommandPalette() {
    if (document.querySelector(".command-palette")) {
      return;
    }

    let selectedIndex = 0;
    const palette = document.createElement("div");
    palette.className = "command-palette";
    palette.setAttribute("aria-hidden", "true");
    palette.innerHTML = [
      '<div class="command-panel" role="dialog" aria-modal="true" aria-label="Command palette">',
      '  <div class="command-head">',
      '    <span class="command-prompt">$</span>',
      '    <input class="command-input" type="text" autocomplete="off" placeholder="type a command, topic, or post name" />',
      '    <span class="command-hint">esc</span>',
      '  </div>',
      '  <div class="command-results" role="listbox"></div>',
      '  <div class="command-output"></div>',
      '</div>'
    ].join("");
    document.body.appendChild(palette);

    const input = palette.querySelector(".command-input");
    const results = palette.querySelector(".command-results");
    const output = palette.querySelector(".command-output");

    function go(path) {
      window.location.href = siteUrl(path);
    }

    function filterTag(tag) {
      if (normalizePath(getCurrentPath()) === "blog.html" && window.filterPosts) {
        window.filterPosts(tag, findFilterButton(tag));
        closePalette();
        return;
      }
      go(`blog.html?tag=${encodeURIComponent(tag)}`);
    }

    function commandEscape(value) {
      return String(value || "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char]));
    }

    function renderCommandOutput(text, actions = []) {
      output.innerHTML = [
        `<pre>${commandEscape(text)}</pre>`,
        actions.length ? `<div class="command-followups">${actions.map((action) => `<button type="button" class="command-followup-btn" data-command-follow="${commandEscape(action.id)}">${commandEscape(action.label)}</button>`).join("")}</div>` : ""
      ].join("");
    }

    const followupActions = {
      blog: () => go("blog.html"),
      certs: () => go("index.html#certifications"),
      path: () => go("learning-path.html"),
      contact: () => go("index.html#contact")
    };

    const commands = [
      { title: "Open blog archive", chip: "nav", desc: "See every write-up", keywords: "posts archive blog", run: () => go("blog.html") },
      { title: "Open learning path", chip: "path", desc: "View the BSCP → OSCP roadmap", keywords: "roadmap progress learning path bscp oscp", run: () => go("learning-path.html") },
      { title: "Open SSTI labs", chip: "post", desc: "SSTI write-up with framework fingerprints and screenshot evidence", keywords: "ssti template injection erb tornado freemarker handlebars django twig labs", run: () => go("blog/ssti-labs.html") },
      { title: "Open JWT labs", chip: "post", desc: "JWT write-up and decoder playground", keywords: "jwt token json web token labs", run: () => go("blog/jwt-labs.html") },
      { title: "Open SQLi labs", chip: "post", desc: "SQL injection labs and payload builder", keywords: "sqli sql injection union blind labs", run: () => go("blog/sqli-labs.html") },
      { title: "Filter: SSTI", chip: "filter", desc: "Show SSTI posts", keywords: "ssti template injection filter", run: () => filterTag("ssti") },
      { title: "Filter: JWT", chip: "filter", desc: "Show JWT posts", keywords: "jwt filter", run: () => filterTag("jwt") },
      { title: "Filter: SQLi", chip: "filter", desc: "Show SQL injection posts", keywords: "sqli sql injection filter", run: () => filterTag("sqli") },
      { title: "Filter: Linux", chip: "filter", desc: "Show Linux posts", keywords: "linux privesc privilege escalation", run: () => filterTag("linux") },
      { title: "Toggle theme", chip: "ui", desc: "Switch light/dark mode", keywords: "theme dark light", run: () => { window.toggleTheme(); renderCommandOutput("$ theme\ntheme toggled"); } },
      { title: "whoami", chip: "shell", desc: "Print a terminal-style profile", keywords: "whoami profile about", run: () => { renderCommandOutput("$ whoami\nVali Hakuryuko — university student, web security learner, CRTA, BSCP in progress, building toward OSCP-level work.", [{ id: "blog", label: "open blog" }, { id: "certs", label: "view certs" }, { id: "path", label: "learning path" }, { id: "contact", label: "contact" }]); } },
      { title: "status", chip: "shell", desc: "Print current track status", keywords: "status bscp progress", run: () => { renderCommandOutput("$ status\ncurrent: BSCP prep\nfocus: SSTI, JWT, SQLi, Burp workflow, Linux privilege escalation\nnext: access control, SSRF, OAuth, OSCP foundations", [{ id: "path", label: "open roadmap" }, { id: "blog", label: "browse posts" }]); } },
      { title: "Contact", chip: "nav", desc: "Jump to contact section", keywords: "email contact github linkedin", run: () => go("index.html#contact") }
    ];

    sitePosts.forEach((post) => {
      commands.push({
        title: post.title,
        chip: "post",
        desc: post.desc,
        keywords: `${post.title} ${post.tags.join(" ")} ${post.desc}`,
        run: () => go(post.url)
      });
    });

    function score(command, query) {
      const haystack = `${command.title} ${command.desc} ${command.keywords}`.toLowerCase();
      if (!query) {
        return 1;
      }
      return query.split(/\s+/).filter(Boolean).reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
    }

    function getVisibleCommands() {
      const query = input.value.trim().toLowerCase();
      return commands
        .map((command) => ({ command, score: score(command, query) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score || a.command.title.localeCompare(b.command.title))
        .slice(0, 9)
        .map((entry) => entry.command);
    }

    function renderResults() {
      const visible = getVisibleCommands();
      selectedIndex = Math.min(selectedIndex, Math.max(visible.length - 1, 0));
      results.innerHTML = visible.length
        ? visible.map((command, index) => [
            `<button type="button" class="command-result${index === selectedIndex ? " is-selected" : ""}" data-index="${index}" role="option" aria-selected="${index === selectedIndex}">`,
            '  <span>',
            `    <span class="command-title">${command.title}</span>`,
            `    <span class="command-desc">${command.desc}</span>`,
            '  </span>',
            `  <span class="command-chip">${command.chip}</span>`,
            '</button>'
          ].join(""))
          .join("")
        : '<div class="command-result"><span><span class="command-title">No command found</span><span class="command-desc">Try jwt, sqli, linux, theme, whoami, or status.</span></span><span class="command-chip">404</span></div>';
    }

    function runSelected() {
      const visible = getVisibleCommands();
      const command = visible[selectedIndex];
      if (!command) {
        return;
      }
      command.run();
    }

    function openPalette(initialValue) {
      palette.classList.add("is-open");
      palette.setAttribute("aria-hidden", "false");
      output.textContent = "";
      input.value = initialValue || "";
      selectedIndex = 0;
      renderResults();
      window.setTimeout(() => input.focus(), 0);
    }

    function closePalette() {
      palette.classList.remove("is-open");
      palette.setAttribute("aria-hidden", "true");
      input.blur();
    }

    window.openCommandPalette = openPalette;
    window.closeCommandPalette = closePalette;

    input.addEventListener("input", () => {
      selectedIndex = 0;
      output.textContent = "";
      renderResults();
    });

    results.addEventListener("click", (event) => {
      const button = event.target.closest(".command-result[data-index]");
      if (!button) {
        return;
      }
      selectedIndex = Number(button.dataset.index || 0);
      runSelected();
    });

    palette.addEventListener("click", (event) => {
      const followup = event.target.closest("[data-command-follow]");
      if (followup) {
        const action = followupActions[followup.dataset.commandFollow];
        if (action) {
          action();
        }
        return;
      }
      if (event.target === palette) {
        closePalette();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (!palette.classList.contains("is-open")) {
        return;
      }
      const visible = getVisibleCommands();
      if (event.key === "Tab") {
        const focusable = Array.from(palette.querySelectorAll('input, button, [href], [tabindex]:not([tabindex="-1"])'))
          .filter((element) => !element.disabled && element.offsetParent !== null);
        if (!focusable.length) {
          event.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!palette.contains(document.activeElement)) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        closePalette();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, Math.max(visible.length - 1, 0));
        renderResults();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        renderResults();
      } else if (event.key === "Enter") {
        event.preventDefault();
        runSelected();
      }
    });

    document.addEventListener("keydown", (event) => {
      const isPaletteShortcut = event.key === "/" || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k");
      if (!isPaletteShortcut || isTypingContext(document.activeElement)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      openPalette("");
    }, true);
  }

  function initContinueReading() {
    const STORAGE_KEY = "vh-continue-reading";
    const article = document.querySelector("article");
    const currentPathKey = normalizePath(window.location.pathname);
    const currentPost = sitePosts.find((post) => normalizePath(post.url) === currentPathKey);

    function escapeHTML(value) {
      return String(value || "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char]));
    }

    function getPageTop(element) {
      return element.getBoundingClientRect().top + window.scrollY;
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function readStoredItem() {
      const stored = safeStorageGet(STORAGE_KEY);
      if (!stored) {
        return null;
      }
      try {
        return JSON.parse(stored);
      } catch (error) {
        return null;
      }
    }

    function buildResumeUrl(item) {
      const cleanUrl = String(item.url || "").replace(/^\/+/, "");
      const divider = cleanUrl.includes("?") ? "&" : "?";
      return `${siteUrl(cleanUrl)}${divider}resume=1${item.anchor ? `#${item.anchor}` : ""}`;
    }

    function getNearestReadingAnchor() {
      if (!article) {
        return null;
      }

      const candidates = Array.from(article.querySelectorAll("h2[id], h3[id], h4[id], section[id], .lab-card[id], .callout[id]"));
      if (!candidates.length) {
        return null;
      }

      const checkpoint = window.scrollY + 150;
      let active = candidates[0];

      candidates.forEach((candidate) => {
        if (getPageTop(candidate) <= checkpoint) {
          active = candidate;
        }
      });

      const titleNode = active.matches("h2, h3, h4")
        ? active
        : active.querySelector("h2, h3, h4, .lab-title, .callout-title");

      return {
        anchor: active.id || "",
        sectionTitle: titleNode ? titleNode.textContent.trim().replace(/\s+/g, " ").slice(0, 90) : "",
        offsetWithinSection: Math.max(0, Math.round(window.scrollY - getPageTop(active)))
      };
    }

    function shouldResumeFromLink(item) {
      if (!article || !currentPost || !item) {
        return false;
      }

      const params = new URLSearchParams(window.location.search);
      const cameFromResumeCard = params.get("resume") === "1";
      const samePost = normalizePath(item.url) === normalizePath(currentPost.url) || normalizePath(item.url) === currentPathKey;
      return cameFromResumeCard && samePost;
    }

    function cleanResumeUrl() {
      if (!window.history || !window.history.replaceState) {
        return;
      }

      const url = new URL(window.location.href);
      if (!url.searchParams.has("resume")) {
        return;
      }

      url.searchParams.delete("resume");
      window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
    }

    function showResumeToast(item) {
      if (document.querySelector(".resume-toast")) {
        return;
      }

      const toast = document.createElement("div");
      toast.className = "resume-toast";
      toast.innerHTML = [
        '<span class="resume-toast-kicker">resumed reading</span>',
        `<strong>${escapeHTML(item.sectionTitle || item.title || "Saved position")}</strong>`,
        '<button type="button">start from top</button>'
      ].join("");

      const button = toast.querySelector("button");
      button.addEventListener("click", () => {
        const top = Math.max(0, getPageTop(article) - 90);
        window.scrollTo({ top, behavior: prefersReducedMotion ? "auto" : "smooth" });
        toast.classList.add("is-hiding");
        window.setTimeout(() => toast.remove(), 240);
      });

      document.body.appendChild(toast);
      window.setTimeout(() => toast.classList.add("is-visible"), 50);
      window.setTimeout(() => {
        toast.classList.add("is-hiding");
        window.setTimeout(() => toast.remove(), 260);
      }, 5200);
    }

    function resumeToSavedPosition(item) {
      if (!article || !item) {
        return;
      }

      let attempts = 0;

      const doScroll = () => {
        const anchorElement = item.anchor ? document.getElementById(item.anchor) : null;
        const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        let targetY = Number.isFinite(item.scrollY) ? item.scrollY : getPageTop(article);

        if (anchorElement) {
          targetY = getPageTop(anchorElement) + (Number(item.offsetWithinSection) || 0);
        }

        targetY = clamp(targetY, 0, maxScroll);
        window.scrollTo({
          top: targetY,
          behavior: attempts === 0 && !prefersReducedMotion ? "smooth" : "auto"
        });
        attempts += 1;
      };

      window.requestAnimationFrame(doScroll);
      window.addEventListener("load", () => {
        doScroll();
        window.setTimeout(doScroll, 450);
      }, { once: true });
      window.setTimeout(doScroll, 900);
      showResumeToast(item);
      cleanResumeUrl();
    }

    if (article && currentPost) {
      const storedItem = readStoredItem();
      const shouldResume = shouldResumeFromLink(storedItem);
      let canSavePosition = !shouldResume;
      let saveFrame = 0;

      function updateReadState() {
        const start = article.offsetTop - 120;
        const distance = Math.max(article.offsetHeight - window.innerHeight + 240, 1);
        const progress = Math.max(0, Math.min(100, Math.round(((window.scrollY - start) / distance) * 100)));
        const anchorInfo = getNearestReadingAnchor() || {};

        safeStorageSet(STORAGE_KEY, JSON.stringify({
          title: currentPost.title,
          url: currentPost.url,
          progress,
          scrollY: Math.max(0, Math.round(window.scrollY)),
          anchor: anchorInfo.anchor || "",
          sectionTitle: anchorInfo.sectionTitle || "",
          offsetWithinSection: Number(anchorInfo.offsetWithinSection) || 0,
          date: new Date().toISOString()
        }));
      }

      function queueReadStateUpdate() {
        if (!canSavePosition || saveFrame) {
          return;
        }

        saveFrame = window.requestAnimationFrame(() => {
          saveFrame = 0;
          updateReadState();
        });
      }

      if (shouldResume) {
        resumeToSavedPosition(storedItem);
        window.setTimeout(() => {
          canSavePosition = true;
          updateReadState();
        }, 1300);
      } else {
        updateReadState();
      }

      window.addEventListener("scroll", queueReadStateUpdate, { passive: true });
      window.addEventListener("resize", queueReadStateUpdate);
      window.addEventListener("beforeunload", updateReadState);
      return;
    }

    const item = readStoredItem();
    if (!item || !item.url || normalizePath(item.url) === getCurrentPath()) {
      return;
    }

    const target = document.querySelector(".blog-toolbar") || document.querySelector("#blog") || document.querySelector("main");
    if (!target || document.querySelector(".continue-reading-card")) {
      return;
    }

    const progress = Number(item.progress) || 0;
    const card = document.createElement("div");
    card.className = "continue-reading-card fade-in visible";
    card.innerHTML = [
      '<span class="eyebrow">continue where you left off</span>',
      `<a href="${escapeHTML(buildResumeUrl(item))}">${escapeHTML(item.title)}</a>`,
      item.sectionTitle ? `<span class="continue-reading-location">near: ${escapeHTML(item.sectionTitle)}</span>` : '<span class="continue-reading-location">resume from your saved scroll position</span>',
      `<div class="continue-meter" aria-label="${progress}% read"><span style="--progress:${progress}%"></span></div>`
    ].join("");
    target.parentNode.insertBefore(card, target);
  }

  function initActivityGraph() {
    const blogSection = document.getElementById("blog");
    const aboutSection = document.getElementById("about");
    const insertAfter = blogSection || aboutSection;
    if (!insertAfter || document.querySelector(".activity-panel")) {
      return;
    }

    const datedPosts = sitePosts
      .map((post) => ({ ...post, dateObject: new Date(`${post.date}T00:00:00`) }))
      .filter((post) => Number.isFinite(post.dateObject.getTime()))
      .sort((a, b) => a.dateObject - b.dateObject);

    if (!datedPosts.length) {
      return;
    }

    const earliest = datedPosts[0].dateObject;
    const latest = datedPosts[datedPosts.length - 1].dateObject;
    const today = new Date();
    const rangeEnd = latest > today ? latest : today;
    const startMonth = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
    const endMonth = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);

    function monthKey(date) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }

    function monthLabel(date, includeYear = false) {
      return date.toLocaleDateString("en", includeYear ? { month: "short", year: "numeric" } : { month: "short" });
    }

    const months = [];
    for (let cursor = new Date(startMonth); cursor <= endMonth; cursor.setMonth(cursor.getMonth() + 1)) {
      months.push(new Date(cursor));
    }

    const postsByMonth = months.map((month) => {
      const key = monthKey(month);
      return datedPosts.filter((post) => monthKey(post.dateObject) === key);
    });

    const maxCount = Math.max(1, ...postsByMonth.map((posts) => posts.length));
    const rangeLabel = `${monthLabel(months[0], true)} → ${monthLabel(months[months.length - 1], true)}`;

    const panel = document.createElement("section");
    panel.className = "activity-panel fade-in";
    panel.setAttribute("aria-label", "Publishing activity");
    panel.innerHTML = [
      '<div class="activity-card" data-glow-card>',
      '  <div class="activity-header">',
      '    <div><span class="section-label">// live trail</span><h2>Learning activity graph</h2></div>',
      `    <p>A compact visual proof that this is not a one-off portfolio page — it maps posts from <strong>${rangeLabel}</strong> and grows automatically as new notes are published.</p>`,
      '  </div>',
      '  <div class="activity-grid-wrap" role="img" aria-label="Monthly publishing activity">',
      `    <div class="activity-grid" style="--activity-months:${months.length}">${months.map((month, index) => {
            const posts = postsByMonth[index];
            const count = posts.length;
            const level = count === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((count / maxCount) * 4)));
            const titles = posts.map((post) => post.title).join(", ") || "No published notes yet";
            const shortLabel = monthLabel(month);
            const longLabel = monthLabel(month, true);
            return [
              '<span class="activity-month">',
              `  <span class="activity-cell" data-level="${level}" aria-label="${longLabel}: ${count} post${count === 1 ? "" : "s"} — ${titles}"></span>`,
              `  <span class="activity-month-label" aria-hidden="true">${shortLabel}</span>`,
              '</span>'
            ].join("");
          }).join("")}</div>`,
      '  </div>',
      '</div>'
    ].join("");

    insertAfter.insertAdjacentElement("afterend", panel);
  }

  function initReaderModes() {
    if (!document.body.classList.contains("post-page") || document.querySelector(".reader-panel")) {
      return;
    }

    const storedMode = safeStorageGet("vh-reader-mode") || "detailed";
    const panel = document.createElement("div");
    panel.className = "reader-panel";
    panel.innerHTML = [
      '<div class="reader-panel-title">reader mode</div>',
      '<div class="reader-panel-buttons">',
      '  <button type="button" class="reader-mode-btn" data-mode="detailed">Detailed</button>',
      '  <button type="button" class="reader-mode-btn" data-mode="compact">Compact</button>',
      '  <button type="button" class="reader-mode-btn" data-mode="commands">Commands</button>',
      '  <button type="button" class="reader-mode-btn" data-mode="explain">Explain</button>',
      '</div>'
    ].join("");
    document.body.appendChild(panel);

    function setMode(mode) {
      const resolvedMode = ["detailed", "compact", "commands", "explain"].includes(mode) ? mode : "detailed";
      document.body.dataset.readerMode = resolvedMode;
      safeStorageSet("vh-reader-mode", resolvedMode);
      panel.querySelectorAll(".reader-mode-btn").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.mode === resolvedMode);
      });
    }

    panel.addEventListener("click", (event) => {
      const button = event.target.closest(".reader-mode-btn");
      if (button) {
        setMode(button.dataset.mode);
      }
    });

    setMode(storedMode);
  }

  function initCodeEnhancements() {
    const blocks = Array.from(document.querySelectorAll(".code-block"));
    if (!blocks.length) {
      return;
    }

    blocks.forEach((block, index) => {
      const header = block.querySelector(".code-block-header");
      const pre = block.querySelector("pre");
      if (!header || !pre || block.dataset.enhanced === "true") {
        return;
      }
      block.dataset.enhanced = "true";

      const code = pre.innerText.trimEnd();
      const lines = code ? code.split(/\n/).length : 0;
      const lang = (block.querySelector(".code-block-lang") || {}).textContent || "code";
      const group = document.createElement("span");
      group.className = "code-tool-group";
      group.innerHTML = [
        `<button type="button" class="code-tool-btn" data-code-tool="wrap">wrap</button>`,
        `<button type="button" class="code-tool-btn" data-code-tool="explain">explain</button>`,
        `<button type="button" class="code-tool-btn" data-code-tool="collapse">collapse</button>`
      ].join("");

      const existingCopy = header.querySelector(".copy-btn");
      if (existingCopy) {
        existingCopy.classList.add("code-tool-btn");
        group.prepend(existingCopy);
      } else {
        const copy = document.createElement("button");
        copy.type = "button";
        copy.className = "code-tool-btn";
        copy.textContent = "copy";
        copy.addEventListener("click", () => handleCopyButton(copy, code));
        group.prepend(copy);
      }

      const lineCount = document.createElement("span");
      lineCount.className = "code-block-label";
      lineCount.textContent = lines ? `${lines} lines` : "snippet";
      header.appendChild(lineCount);
      header.appendChild(group);

      const explain = document.createElement("div");
      explain.className = "code-explain";
      explain.textContent = buildCodeExplanation(lang, code, index);
      block.appendChild(explain);

      group.addEventListener("click", (event) => {
        const button = event.target.closest("[data-code-tool]");
        if (!button) {
          return;
        }
        const tool = button.dataset.codeTool;
        if (tool === "wrap") {
          block.classList.toggle("is-wrapped");
          button.classList.toggle("is-active", block.classList.contains("is-wrapped"));
        } else if (tool === "collapse") {
          block.classList.toggle("is-collapsed");
          button.textContent = block.classList.contains("is-collapsed") ? "expand" : "collapse";
        } else if (tool === "explain") {
          block.classList.toggle("is-explaining");
          button.classList.toggle("is-active", block.classList.contains("is-explaining"));
        }
      });
    });
  }

  function buildCodeExplanation(language, code, index) {
    const lower = code.toLowerCase();
    if (lower.includes("requests.") || lower.includes("urllib3")) {
      return "This Python block automates the request flow: it sends the payload, keeps session/proxy handling explicit, and checks the response for a success marker. Treat it as a lab script, not production-safe code.";
    }
    if (lower.includes("union select") || lower.includes("order by")) {
      return "This snippet is part of SQLi probing: it changes query structure to test column count, data type compatibility, or returned values.";
    }
    if (lower.includes("curl") || lower.includes("python ")) {
      return "This command is meant to replay the lab step quickly from the terminal. Replace the lab host with your own Web Security Academy instance.";
    }
    if (lower.includes("jwt") || lower.includes("alg") || lower.includes("kid")) {
      return "This block is focused on JWT trust boundaries: header values should never be allowed to choose unsafe verification behavior on the server.";
    }
    return `Snippet ${index + 1} is a ${language.trim() || "code"} reference block. Use copy for reuse, wrap for narrow screens, and collapse to keep the write-up readable.`;
  }

  function initAttackChain() {
    if (!document.body.classList.contains("post-page") || document.querySelector(".attack-chain")) {
      return;
    }

    const brief = document.querySelector(".article-brief");
    const article = document.querySelector("article");
    if (!brief || !article) {
      return;
    }

    const path = getCurrentPath().toLowerCase();
    let steps = ["Understand", "Enumerate", "Test", "Exploit", "Document"];
    if (path.includes("jwt")) {
      steps = ["Capture token", "Inspect header", "Test trust flaw", "Forge token", "Replay", "Fix lesson"];
    } else if (path.includes("sqli") || path.includes("sql-injection")) {
      steps = ["Find input", "Break syntax", "Confirm logic", "Extract data", "Automate", "Defend"];
    } else if (path.includes("juice")) {
      steps = ["Map app", "Find challenge", "Intercept", "Exploit", "Capture proof", "Reflect"];
    } else if (path.includes("linux")) {
      steps = ["Enumerate", "Find misconfig", "Exploit path", "Escalate", "Stabilize", "Document"];
    } else if (path.includes("burp")) {
      steps = ["Proxy", "Send to Repeater", "Mutate", "Compare", "Automate", "Report"];
    }

    const chain = document.createElement("div");
    chain.className = "attack-chain";
    chain.innerHTML = [
      '<div class="attack-chain-title">interactive attack chain</div>',
      `<div class="attack-chain-steps">${steps.map((step, index) => `<span class="attack-step${index === 0 ? " is-active" : ""}">${String(index + 1).padStart(2, "0")} ${step}</span>`).join("")}</div>`
    ].join("");
    brief.insertAdjacentElement("afterend", chain);

    const stepEls = Array.from(chain.querySelectorAll(".attack-step"));
    function updateChain() {
      const start = article.offsetTop - 120;
      const distance = Math.max(article.offsetHeight - window.innerHeight + 240, 1);
      const ratio = Math.max(0, Math.min(1, (window.scrollY - start) / distance));
      const activeIndex = Math.min(stepEls.length - 1, Math.floor(ratio * stepEls.length));
      stepEls.forEach((step, index) => step.classList.toggle("is-active", index <= activeIndex));
    }
    updateChain();
    window.addEventListener("scroll", updateChain, { passive: true });
    window.addEventListener("resize", updateChain);
  }

  function base64UrlDecode(input) {
    const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
    try {
      return decodeURIComponent(Array.prototype.map.call(atob(padded), (char) => "%" + ("00" + char.charCodeAt(0).toString(16)).slice(-2)).join(""));
    } catch (error) {
      try {
        return atob(padded);
      } catch (secondError) {
        throw error;
      }
    }
  }

  function prettyJson(value) {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch (error) {
      return value;
    }
  }

  function pageAllowsPlayground(type) {
    const allowed = (document.body.dataset.playground || "").split(/\s+/).filter(Boolean);
    return allowed.includes(type);
  }

  function initJwtPlayground() {
    if (!pageAllowsPlayground("jwt") || document.querySelector(".jwt-playground")) {
      return;
    }

    const brief = document.querySelector(".article-brief");
    if (!brief) {
      return;
    }

    const section = document.createElement("section");
    section.className = "security-playground jwt-playground";
    section.innerHTML = [
      '<div class="playground-head">',
      '  <span class="playground-kicker">client-side lab tool</span>',
      '  <h2>JWT decoder playground</h2>',
      '  <p>Paste a token to inspect header/payload locally. Nothing is sent anywhere.</p>',
      '</div>',
      '<div class="playground-body">',
      '  <div class="playground-field">',
      '    <label for="jwt-input">JWT</label>',
      '    <textarea id="jwt-input" class="playground-input" spellcheck="false" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."></textarea>',
      '    <div class="playground-actions">',
      '      <button type="button" class="playground-btn" data-jwt-action="decode">decode</button>',
      '      <button type="button" class="playground-btn" data-jwt-action="sample">load sample</button>',
      '      <button type="button" class="playground-btn" data-jwt-action="clear">clear</button>',
      '    </div>',
      '  </div>',
      '  <div class="playground-field">',
      '    <span class="playground-label">decoded output</span>',
      '    <pre class="playground-output" id="jwt-output">Waiting for token...</pre>',
      '    <div class="playground-warning-list" id="jwt-warnings"></div>',
      '  </div>',
      '</div>'
    ].join("");
    brief.insertAdjacentElement("afterend", section);

    const input = section.querySelector("#jwt-input");
    const output = section.querySelector("#jwt-output");
    const warnings = section.querySelector("#jwt-warnings");
    const sample = [
      btoa(JSON.stringify({ alg: "none", typ: "JWT", kid: "../../../../dev/null" })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_"),
      btoa(JSON.stringify({ sub: "carlos", role: "user", iss: "academy" })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_"),
      "signature"
    ].join(".");

    function addWarning(text) {
      const item = document.createElement("div");
      item.className = "playground-warning";
      item.textContent = text;
      warnings.appendChild(item);
    }

    function decodeJwt() {
      warnings.innerHTML = "";
      const token = input.value.trim();
      const parts = token.split(".");
      if (parts.length < 2) {
        output.textContent = "A JWT should have at least header.payload.signature.";
        return;
      }
      try {
        const headerRaw = base64UrlDecode(parts[0]);
        const payloadRaw = base64UrlDecode(parts[1]);
        const header = JSON.parse(headerRaw);
        const payload = JSON.parse(payloadRaw);
        output.textContent = `Header:\n${prettyJson(headerRaw)}\n\nPayload:\n${prettyJson(payloadRaw)}\n\nSignature present: ${parts[2] ? "yes" : "no"}`;
        if (String(header.alg || "").toLowerCase() === "none") {
          addWarning("[!] alg=none detected — safe servers should reject unsigned tokens.");
        }
        ["kid", "jku", "jwk", "x5u"].forEach((key) => {
          if (Object.prototype.hasOwnProperty.call(header, key)) {
            addWarning(`[!] ${key} header present — verify that the backend does not trust attacker-controlled key metadata.`);
          }
        });
        if (payload.role && String(payload.role).toLowerCase() !== "user") {
          addWarning("[i] role-like claim found — check whether authorization trusts this client-visible value.");
        }
      } catch (error) {
        output.textContent = `Could not decode token: ${error.message}`;
      }
    }

    section.addEventListener("click", (event) => {
      const action = event.target.closest("[data-jwt-action]")?.dataset.jwtAction;
      if (!action) {
        return;
      }
      if (action === "sample") {
        input.value = sample;
        decodeJwt();
      } else if (action === "clear") {
        input.value = "";
        output.textContent = "Waiting for token...";
        warnings.innerHTML = "";
      } else {
        decodeJwt();
      }
    });
  }

  function initSqliPlayground() {
    if (!pageAllowsPlayground("sqli") || document.querySelector(".sqli-playground")) {
      return;
    }

    const brief = document.querySelector(".article-brief");
    if (!brief) {
      return;
    }

    const section = document.createElement("section");
    section.className = "security-playground sqli-playground";
    section.innerHTML = [
      '<div class="playground-head">',
      '  <span class="playground-kicker">payload thinking tool</span>',
      '  <h2>SQLi payload builder</h2>',
      '  <p>Choose an attack style and see how the payload changes the original input.</p>',
      '</div>',
      '<div class="playground-body">',
      '  <div class="playground-field">',
      '    <label for="sqli-base">Original value / parameter</label>',
      '    <textarea id="sqli-base" class="playground-input" spellcheck="false">Gifts</textarea>',
      '    <label for="sqli-type">Payload type</label>',
      '    <select id="sqli-type" class="playground-select">',
      '      <option value="boolean">Boolean filter bypass</option>',
      '      <option value="login">Login bypass</option>',
      '      <option value="union">UNION probe</option>',
      '      <option value="error">Conditional error</option>',
      '      <option value="time">Time delay</option>',
      '    </select>',
      '    <div class="playground-actions"><button type="button" class="playground-btn" data-sqli-build>build payload</button></div>',
      '  </div>',
      '  <div class="playground-field">',
      '    <span class="playground-label">result</span>',
      '    <pre class="playground-output" id="sqli-output"></pre>',
      '    <p class="playground-note">Use only in legal labs you own or have permission to test.</p>',
      '  </div>',
      '</div>'
    ].join("");
    brief.insertAdjacentElement("afterend", section);

    const base = section.querySelector("#sqli-base");
    const type = section.querySelector("#sqli-type");
    const output = section.querySelector("#sqli-output");

    function buildPayload() {
      const value = base.value.trim() || "Gifts";
      const payloads = {
        boolean: `${value}' OR 1=1--`,
        login: `administrator'--`,
        union: `${value}' UNION SELECT NULL,NULL--`,
        error: `${value}' AND (SELECT CASE WHEN (1=1) THEN TO_CHAR(1/0) ELSE 'a' END FROM dual)='a'--`,
        time: `${value}'; SELECT CASE WHEN (1=1) THEN pg_sleep(5) ELSE pg_sleep(0) END--`
      };
      const explanations = {
        boolean: "Closes the string, adds an always-true condition, then comments out the rest of the query.",
        login: "Targets auth logic by selecting the administrator row and removing the password check.",
        union: "Adds a second SELECT. Adjust NULL count until the column count matches the original query.",
        error: "Uses a conditional database error as a true/false signal for blind extraction.",
        time: "Uses response delay as a true/false side channel when page content does not change."
      };
      const selected = type.value;
      output.textContent = `Payload:\n${payloads[selected]}\n\nWhat changed:\n${explanations[selected]}`;
    }

    section.addEventListener("click", (event) => {
      if (event.target.closest("[data-sqli-build]")) {
        buildPayload();
      }
    });
    type.addEventListener("change", buildPayload);
    buildPayload();
  }

  function initLabControls() {
    const labs = Array.from(document.querySelectorAll(".lab-section"));
    if (!labs.length) {
      return;
    }

    labs.forEach((lab, index) => {
      const header = lab.querySelector(".lab-header");
      if (!header || lab.dataset.labEnhanced === "true") {
        return;
      }
      lab.dataset.labEnhanced = "true";
      lab.dataset.labView = "details";

      const controls = document.createElement("div");
      controls.className = "lab-controls";
      controls.innerHTML = [
        '<button type="button" class="lab-mode-btn is-active" data-lab-view="details">details</button>',
        '<button type="button" class="lab-mode-btn" data-lab-view="overview">overview</button>',
        '<button type="button" class="lab-mode-btn" data-lab-view="code">code only</button>'
      ].join("");
      header.insertAdjacentElement("afterend", controls);

      const hints = buildHintsForLab(lab, index);
      const hintsEl = document.createElement("div");
      hintsEl.className = "progressive-hints";
      hintsEl.innerHTML = [
        '<div class="progressive-hints-title">progressive hints</div>',
        hints.map((hint, hintIndex) => `<button type="button" class="hint-btn" data-hint-index="${hintIndex}">reveal hint ${hintIndex + 1}</button><div class="hint-reveal">${hint}</div>`).join("")
      ].join("");
      controls.insertAdjacentElement("afterend", hintsEl);

      controls.addEventListener("click", (event) => {
        const button = event.target.closest("[data-lab-view]");
        if (!button) {
          return;
        }
        lab.dataset.labView = button.dataset.labView;
        controls.querySelectorAll(".lab-mode-btn").forEach((modeButton) => {
          modeButton.classList.toggle("is-active", modeButton === button);
        });
      });

      hintsEl.addEventListener("click", (event) => {
        const button = event.target.closest("[data-hint-index]");
        if (!button) {
          return;
        }
        const reveal = button.nextElementSibling;
        if (reveal) {
          reveal.classList.add("is-visible");
          button.classList.add("is-active");
        }
      });
    });
  }

  function buildHintsForLab(lab, index) {
    const title = (lab.querySelector(".lab-title") || lab.querySelector("h2") || {}).textContent || "this lab";
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes("jwt") || pageIncludesText("jwt")) {
      return [
        "Start with the token header. Which value is the server trusting that should be pinned server-side?",
        "Look for <code>alg</code>, <code>kid</code>, <code>jku</code>, or embedded key material. These are common trust-boundary weak points.",
        "The core move is usually: modify a claim, make verification accept your modified token, then <span class=\"redacted\">replay the request</span>."
      ];
    }
    if (lowerTitle.includes("union")) {
      return [
        "First solve column count. UNION only works when both SELECT statements return the same number of columns.",
        "Use <code>NULL</code> placeholders because they are type-flexible while probing.",
        "Once a string-compatible column is found, replace that NULL with the <span class=\"redacted\">value you want returned</span>."
      ];
    }
    if (lowerTitle.includes("blind") || lowerTitle.includes("time") || lowerTitle.includes("conditional")) {
      return [
        "When the page does not print query output, look for a side channel: content difference, error difference, or time delay.",
        "Turn one unknown character into many true/false questions.",
        "Automate only after the manual request works once in <span class=\"redacted\">Repeater</span>."
      ];
    }
    if (lowerTitle.includes("login")) {
      return [
        "Think about how the backend might build the username/password WHERE clause.",
        "Can you select the target user and comment out the password condition?",
        "The useful pattern is <span class=\"redacted\"><code>administrator'--</code></span> when the username is directly concatenated into SQL."
      ];
    }
    return [
      `For ${title}, identify the exact input crossing the trust boundary first.`,
      "Change one thing at a time and confirm the response difference before building automation.",
      "Write the lesson as a reusable rule: what should the developer have done differently?"
    ];
  }

  function initRedactedReveal() {
    document.querySelectorAll(".redacted").forEach((item) => {
      item.setAttribute("tabindex", "0");
      const reveal = () => item.classList.toggle("is-revealed");
      item.addEventListener("click", reveal);
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          reveal();
        }
      });
    });
  }

  function initLearningPathFilters() {
    const board = document.getElementById("learning-board");
    const buttons = Array.from(document.querySelectorAll("[data-path-filter]"));
    if (!board || !buttons.length) {
      return;
    }

    const cards = Array.from(board.querySelectorAll(".learning-card"));
    function applyFilter(filter) {
      buttons.forEach((button) => button.classList.toggle("is-active", button.dataset.pathFilter === filter));
      cards.forEach((card) => {
        const tags = (card.dataset.tags || "").split(/\s+/);
        const status = card.dataset.status;
        const show = filter === "all" || status === filter || tags.includes(filter);
        card.classList.toggle("is-hidden", !show);
      });
    }

    buttons.forEach((button) => button.addEventListener("click", () => applyFilter(button.dataset.pathFilter)));
    applyFilter("all");
  }



  function initLearningCardDates() {
    const cards = Array.from(document.querySelectorAll(".learning-card[data-updated]"));
    if (!cards.length) {
      return;
    }

    cards.forEach((card) => {
      if (card.querySelector(".learning-updated")) {
        return;
      }
      const date = new Date(`${card.dataset.updated}T00:00:00`);
      if (!Number.isFinite(date.getTime())) {
        return;
      }
      const label = date.toLocaleDateString("en", { month: "short", year: "numeric" });
      const meta = document.createElement("span");
      meta.className = "learning-updated";
      meta.textContent = `Updated ${label}`;
      const tags = card.querySelector(".learning-tags");
      if (tags) {
        tags.insertAdjacentElement("afterend", meta);
      } else {
        card.appendChild(meta);
      }
    });
  }



  function initHeroHeadlineTypewriter() {
    const heading = document.querySelector(".hero h1");
    if (!heading || prefersReducedMotion || heading.dataset.typedHeadline === "true") {
      return;
    }

    const firstLine = "Breaking things,";
    const secondLine = "learning everything.";
    heading.dataset.typedHeadline = "true";
    heading.setAttribute("aria-label", `${firstLine} ${secondLine}`);
    heading.classList.add("is-typing");
    heading.innerHTML = '<span class="hero-type-line" data-line="one"></span><br><em><span class="hero-type-line" data-line="two"></span></em>';

    const lineOne = heading.querySelector('[data-line="one"]');
    const lineTwo = heading.querySelector('[data-line="two"]');
    let index = 0;
    const full = `${firstLine}\n${secondLine}`;

    function tick() {
      const visible = full.slice(0, index);
      const parts = visible.split("\n");
      lineOne.textContent = parts[0] || "";
      lineTwo.textContent = parts[1] || "";
      index += 1;
      if (index <= full.length) {
        window.setTimeout(tick, index < firstLine.length ? 38 : 46);
      } else {
        window.setTimeout(() => heading.classList.remove("is-typing"), 900);
      }
    }

    window.setTimeout(tick, 220);
  }

  function initSkillMeters() {
    const aside = document.querySelector(".about-aside");
    if (!aside) {
      return;
    }

    const wrapper = aside.querySelector("[data-skill-meters]");
    if (!wrapper) {
      return;
    }

    const items = Array.from(wrapper.querySelectorAll(".skill-meter[data-skill][data-value]"));
    if (!items.length) {
      return;
    }

    items.forEach((item) => {
      const name = item.dataset.skill || "Skill";
      const value = Math.max(0, Math.min(100, Number.parseFloat(item.dataset.value || "0")));
      item.style.setProperty("--value", `${value}%`);
      item.setAttribute("aria-label", `${name}: ${value}%`);
      if (!item.querySelector(".skill-meter-top")) {
        item.insertAdjacentHTML("afterbegin", `<div class="skill-meter-top"><span>${name}</span><span>${value}%</span></div>`);
      }
      if (!item.querySelector(".skill-meter-fill")) {
        item.insertAdjacentHTML("beforeend", '<div class="skill-meter-track"><span class="skill-meter-fill"></span></div>');
      }
    });

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });

    items.forEach((item) => observer.observe(item));
  }


  function initHeroParticleField() {
    const canvases = Array.from(document.querySelectorAll("[data-hero-particles]"));

    if (!canvases.length || prefersReducedMotion) {
      return;
    }

    canvases.forEach((canvas) => {
      const scope = canvas.closest("[data-particle-scope]") || canvas.closest(".hero, .page-header, .path-hero, .post-header") || canvas.parentElement;
      if (!scope) {
        return;
      }

      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) {
        return;
      }

      let width = 0;
      let height = 0;
      let dpr = 1;
      let particles = [];
      let animationId = 0;
      let isVisible = true;
      const mouse = {
        x: 0,
        y: 0,
        active: false,
      };

      const density = Number.parseFloat(canvas.dataset.particleDensity || scope.dataset.particleDensity || "80");
      const baseDensity = Number.isFinite(density) && density > 0 ? density : 80;
      const linkDistanceSetting = Number.parseFloat(canvas.dataset.particleLinkDistance || scope.dataset.particleLinkDistance || "122");
      const baseLinkDistance = Number.isFinite(linkDistanceSetting) && linkDistanceSetting > 0 ? linkDistanceSetting : 122;
      const coarsePointer = window.matchMedia("(hover: none), (pointer: coarse)").matches;
      const randomBetween = (min, max) => min + Math.random() * (max - min);

      function particleCount() {
        const areaFactor = Math.max(0.66, Math.min(1.28, (width * height) / 620000));
        const viewportFactor = window.innerWidth < 560 ? 0.34 : window.innerWidth < 780 ? 0.52 : window.innerWidth < 1080 ? 0.78 : 1;
        const scopeFactor = scope.classList.contains("post-header") ? 0.78 : 1;
        return Math.max(18, Math.round(baseDensity * areaFactor * viewportFactor * scopeFactor));
      }

      function createParticle(seed) {
        const angle = randomBetween(0, Math.PI * 2);
        const speed = randomBetween(0.055, scope.classList.contains("hero") ? 0.34 : 0.22);
        return {
          x: seed && Number.isFinite(seed.x) ? seed.x * width : Math.random() * width,
          y: seed && Number.isFinite(seed.y) ? seed.y * height : Math.random() * height,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: randomBetween(0.85, scope.classList.contains("hero") ? 2.25 : 1.7),
          pulse: randomBetween(0, Math.PI * 2),
        };
      }

      function resizeCanvas() {
        const rect = scope.getBoundingClientRect();
        const nextWidth = Math.max(1, Math.round(rect.width));
        const nextHeight = Math.max(1, Math.round(rect.height));
        const nextDpr = Math.min(window.devicePixelRatio || 1, 1.75);
        const seeds = particles.map((particle) => ({
          x: width ? particle.x / width : Math.random(),
          y: height ? particle.y / height : Math.random(),
        }));

        width = nextWidth;
        height = nextHeight;
        dpr = nextDpr;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const targetCount = particleCount();
        particles = Array.from({ length: targetCount }, (_, index) => createParticle(seeds[index]));
      }

      function getPalette() {
        const light = root.getAttribute("data-theme") === "light";
        return light
          ? {
              line: [37, 91, 188],
              dot: "rgba(28, 76, 170, 0.38)",
              core: "rgba(79, 140, 255, 0.48)",
              lineAlpha: scope.classList.contains("post-header") ? 0.09 : 0.14,
            }
          : {
              line: [79, 140, 255],
              dot: scope.classList.contains("post-header") ? "rgba(148, 184, 255, 0.46)" : "rgba(148, 184, 255, 0.66)",
              core: scope.classList.contains("post-header") ? "rgba(124, 92, 255, 0.48)" : "rgba(124, 92, 255, 0.68)",
              lineAlpha: scope.classList.contains("post-header") ? 0.18 : 0.27,
            };
      }

      function updateMouse(event) {
        const rect = scope.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        mouse.x = x;
        mouse.y = y;
        mouse.active = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      }

      function stepParticle(particle) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.pulse += 0.016;

        if (particle.x < -10) particle.x = width + 10;
        if (particle.x > width + 10) particle.x = -10;
        if (particle.y < -10) particle.y = height + 10;
        if (particle.y > height + 10) particle.y = -10;

        if (mouse.active && !coarsePointer) {
          const dx = particle.x - mouse.x;
          const dy = particle.y - mouse.y;
          const distance = Math.hypot(dx, dy);
          const radius = scope.classList.contains("hero") ? 165 : 128;

          if (distance > 0 && distance < radius) {
            const force = Math.pow(1 - distance / radius, 2) * (scope.classList.contains("hero") ? 3.2 : 2.2);
            particle.x += (dx / distance) * force;
            particle.y += (dy / distance) * force;
          }
        }
      }

      function draw() {
        ctx.clearRect(0, 0, width, height);

        const palette = getPalette();
        const connectionDistance = window.innerWidth < 680 ? Math.min(baseLinkDistance, 104) : baseLinkDistance;

        particles.forEach(stepParticle);

        for (let i = 0; i < particles.length; i += 1) {
          for (let j = i + 1; j < particles.length; j += 1) {
            const a = particles[i];
            const b = particles[j];
            const distance = Math.hypot(a.x - b.x, a.y - b.y);

            if (distance < connectionDistance) {
              const alpha = (1 - distance / connectionDistance) * palette.lineAlpha;
              ctx.strokeStyle = `rgba(${palette.line[0]}, ${palette.line[1]}, ${palette.line[2]}, ${alpha.toFixed(3)})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }

        particles.forEach((particle, index) => {
          const radius = particle.radius + Math.sin(particle.pulse + index) * 0.18;
          ctx.fillStyle = index % 7 === 0 ? palette.core : palette.dot;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
          ctx.fill();
        });

        if (mouse.active && scope.classList.contains("hero")) {
          const gradient = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 170);
          gradient.addColorStop(0, "rgba(79, 140, 255, 0.13)");
          gradient.addColorStop(1, "rgba(79, 140, 255, 0)");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(mouse.x, mouse.y, 170, 0, Math.PI * 2);
          ctx.fill();
        }

        animationId = window.requestAnimationFrame(draw);
      }

      function resume() {
        if (!animationId && isVisible && !document.hidden) {
          animationId = window.requestAnimationFrame(draw);
        }
      }

      function pause() {
        if (animationId) {
          window.cancelAnimationFrame(animationId);
          animationId = 0;
        }
      }

      resizeCanvas();
      resume();

      scope.addEventListener("pointermove", updateMouse, { passive: true });
      scope.addEventListener("pointerleave", () => {
        mouse.active = false;
      });
      window.addEventListener("resize", resizeCanvas, { passive: true });

      if ("ResizeObserver" in window) {
        const resizeObserver = new ResizeObserver(() => resizeCanvas());
        resizeObserver.observe(scope);
      }

      if ("IntersectionObserver" in window) {
        const visibilityObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.target !== scope) {
              return;
            }
            isVisible = entry.isIntersecting;
            if (isVisible) {
              resizeCanvas();
              resume();
            } else {
              pause();
            }
          });
        }, { rootMargin: "120px 0px" });
        visibilityObserver.observe(scope);
      }

      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          pause();
        } else {
          resizeCanvas();
          resume();
        }
      });
    });
  }

  function initCustomCursor() {
    if (prefersReducedMotion || window.matchMedia("(hover: none), (pointer: coarse)").matches || document.querySelector(".cursor-ring")) {
      return;
    }

    const ring = document.createElement("div");
    ring.className = "cursor-ring";
    document.body.appendChild(ring);

    let targetX = -100;
    let targetY = -100;
    let currentX = -100;
    let currentY = -100;

    document.addEventListener("pointermove", (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
      ring.classList.add("is-visible");
    }, { passive: true });

    document.addEventListener("pointerover", (event) => {
      const interactive = event.target.closest("a, button, input, textarea, select, [role='button'], .post-card, .cert-card, .profile-card");
      ring.classList.toggle("is-active", Boolean(interactive));
    });

    function frame() {
      currentX += (targetX - currentX) * 0.16;
      currentY += (targetY - currentY) * 0.16;
      ring.style.transform = `translate3d(${(currentX - ring.offsetWidth / 2).toFixed(2)}px, ${(currentY - ring.offsetHeight / 2).toFixed(2)}px, 0)`;
      window.requestAnimationFrame(frame);
    }
    frame();
  }

  function init() {
    initTheme();
    initBootOverlay();
    initNavState();
    initMobileNav();
    initBlogArchivePosts();
    initActivityGraph();
    initReveal();
    initHeroTag();
    initHeroHeadlineTypewriter();
    initHeroParticleField();
    initCounters();
    initSkillMeters();
    initProfileTilt();
    initCertCards();
    initCommandPalette();
    initBlogControls();
    initContinueReading();
    initReadingProgress();
    initTocSpy();
    initReaderModes();
    initAttackChain();
    initJwtPlayground();
    initSqliPlayground();
    initLabControls();
    initCodeEnhancements();
    initRedactedReveal();
    initLearningPathFilters();
    initLearningCardDates();
    initGlowCards();
    initCustomCursor();
    initImageLightbox();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
