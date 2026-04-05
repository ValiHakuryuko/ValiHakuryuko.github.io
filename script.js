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

    const hasRequestedButton = findFilterButton(tag);
    const resolvedTag = hasRequestedButton ? tag : "all";
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
      const tags = (card.dataset.tags || "").toLowerCase();
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

  function init() {
    initTheme();
    initNavState();
    initMobileNav();
    initReveal();
    initHeroTag();
    initCounters();
    initProfileTilt();
    initCertCards();
    initBlogControls();
    initReadingProgress();
    initTocSpy();
    initImageLightbox();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
