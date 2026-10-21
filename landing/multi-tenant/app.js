(() => {
  "use strict";

  const select = (selector) => document.querySelector(selector);

  // Catalog data must be absolute; install links in status.json may be relative to this site.
  function httpURL(value, base) {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
      const url = base ? new URL(value, base) : new URL(value);
      return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url : null;
    } catch {
      return null;
    }
  }

  async function readJSON(path) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(path, {
        signal: controller.signal,
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("Request failed");
      return await response.json();
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function setupMenu() {
    const header = select(".navigation");
    const toggle = select(".menu-toggle");
    const nav = select("#nav-links");
    const mobile = window.matchMedia("(max-width: 960px)");
    function closeMenu(restoreFocus = false) {
      header.classList.remove("menu-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open navigation");
      if (restoreFocus) toggle.focus();
    }
    toggle.hidden = false;
    header.classList.add("menu-ready");
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      header.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    });
    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        // Keep focus out of the disclosure when its links become hidden.
        closeMenu(mobile.matches);
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && header.classList.contains("menu-open")) {
        closeMenu(true);
      }
    });
    document.addEventListener("click", (event) => {
      if (!header.contains(event.target)) closeMenu();
    });
    document.addEventListener("focusin", (event) => {
      if (!header.contains(event.target)) closeMenu();
    });
    mobile.addEventListener("change", () => {
      const focused = document.activeElement;
      if (mobile.matches && nav.contains(focused)) closeMenu(true);
      else {
        closeMenu();
        if (!mobile.matches && focused === toggle) nav.querySelector("a").focus();
      }
    });
  }

  function setupTabs() {
    const tablist = select("#code-tabs");
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    function activate(tab, focus = false) {
      tabs.forEach((item) => {
        const active = item === tab;
        item.setAttribute("aria-selected", String(active));
        item.tabIndex = active ? 0 : -1;
        const panel = document.getElementById(item.getAttribute("aria-controls"));
        panel.hidden = !active;
        panel.setAttribute("role", "tabpanel");
        panel.setAttribute("aria-labelledby", item.id);
        panel.querySelector("h3").hidden = true;
      });
      if (focus) tab.focus();
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => activate(tab));
      tab.addEventListener("keydown", (event) => {
        let next;
        if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
        if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = tabs.length - 1;
        if (next !== undefined) {
          event.preventDefault();
          activate(tabs[next], true);
        }
      });
    });
    activate(tabs[0]);
    tablist.hidden = false;
  }

  function setupCopy() {
    const button = select("#copy-url");
    const input = select("#catalog-url");
    const message = select("#copy-message");
    button.hidden = false;
    button.addEventListener("click", async () => {
      try {
        if (!navigator.clipboard || !window.isSecureContext) throw new Error("Clipboard unavailable");
        await navigator.clipboard.writeText(input.value);
        message.textContent = "Catalog URL copied.";
      } catch {
        input.focus();
        input.select();
        input.setSelectionRange(0, input.value.length);
        message.textContent = "URL selected. Use your device's Copy command.";
      }
    });
  }

  async function loadDistribution() {
    const container = select("#install-status");
    const fallback = select("#install-fallback");
    const hero = select("#hero-install-status");
    const heroFallback = select("#hero-install-fallback");
    container.setAttribute("aria-busy", "true");
    hero.setAttribute("aria-busy", "true");
    try {
      const status = await readJSON("/site/status.json");
      if (!status || typeof status !== "object") throw new Error("Invalid distribution state");
      const fragment = document.createDocumentFragment();
      const heroFragment = document.createDocumentFragment();
      const heroNotes = [];
      [["ios", "TestFlight (iOS)"], ["android", "Android APK"]].forEach(([key, label]) => {
        const entry = status[key];
        const state = entry && ["available", "pending", "unavailable"].includes(entry.state)
          ? entry.state : "unavailable";
        const url = httpURL(entry?.url, window.location.href);
        const available = state === "available" && url;
        const block = document.createElement("div");
        block.className = "distribution";
        if (available) {
          const link = document.createElement("a");
          link.className = "button";
          link.href = url.href;
          link.textContent = label;
          if (key === "android" && typeof entry.version === "string" && entry.version.trim()) {
            link.textContent += " · " + entry.version.trim();
          }
          const arrow = document.createElement("span");
          arrow.className = "arrow";
          arrow.setAttribute("aria-hidden", "true");
          arrow.textContent = "↗";
          link.append(arrow);
          block.append(link);
        } else {
          const marker = document.createElement("div");
          marker.className = "distribution-state";
          const title = document.createElement("strong");
          title.textContent = label;
          const badge = document.createElement("span");
          badge.textContent = state === "pending" ? "Pending" : "Unavailable";
          marker.append(title, badge);
          block.append(marker);
        }
        const note = document.createElement("p");
        if (state === "available" && !url) {
          note.textContent = "The install link is unavailable. Please check back.";
        } else if (typeof entry?.note === "string" && entry.note.trim()) {
          note.textContent = entry.note;
        } else if (!available) {
          note.textContent = "Please check back for an install link.";
        }
        if (note.textContent) block.append(note);

        // Both placements use the same validated state and install URL.
        const heroAction = document.createElement(available ? "a" : "button");
        heroAction.className = "platform-link";
        if (available) {
          heroAction.href = url.href;
        } else {
          heroAction.type = "button";
          heroAction.disabled = true;
        }
        const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        icon.setAttribute("viewBox", "0 0 24 24");
        icon.setAttribute("width", "18");
        icon.setAttribute("height", "18");
        icon.setAttribute("aria-hidden", "true");
        icon.setAttribute("focusable", "false");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", key === "ios"
          ? "M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm0 3v13h8V5H8Zm3 14.5a1 1 0 1 0 2 0 1 1 0 0 0-2 0Z"
          : "M5 5 3.7 2.8l1-.6L6.1 4.6a12 12 0 0 1 11.8 0l1.4-2.4 1 .6L19 5c2.5 1.8 4 4.7 4 8H1c0-3.3 1.5-6.2 4-8ZM7 8a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm10 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM3 15h18v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z");
        path.setAttribute("fill", "currentColor");
        path.setAttribute("fill-rule", "evenodd");
        icon.append(path);
        const heroLabel = document.createElement("span");
        heroLabel.textContent = key === "ios" ? "iPhone · TestFlight" : "Android · APK";
        heroAction.append(icon, heroLabel);
        if (!available) {
          const badge = document.createElement("span");
          badge.className = "platform-state";
          badge.textContent = state === "pending" ? "In review" : "Unavailable";
          heroAction.append(badge);
        }
        if (note.textContent) {
          heroAction.title = note.textContent;
          if (!available) heroNotes.push((key === "ios" ? "iOS: " : "Android: ") + note.textContent);
        }
        heroFragment.append(heroAction);
        fragment.append(block);
      });
      if (heroNotes.length) {
        const note = document.createElement("p");
        note.id = "hero-platform-note";
        note.className = "platform-note";
        note.textContent = heroNotes.join(" ");
        note.title = note.textContent;
        heroFragment.querySelectorAll("button").forEach((button) => {
          button.setAttribute("aria-describedby", note.id);
        });
        heroFragment.append(note);
      }
      container.replaceChildren(fragment);
      hero.replaceChildren(heroFragment);
      hero.hidden = false;
      heroFallback.hidden = true;
      fallback.hidden = true;
    } catch {
      fallback.textContent = "Couldn't check build availability. Refresh to try again. Install links appear here once each build is approved.";
    } finally {
      container.setAttribute("aria-busy", "false");
      hero.setAttribute("aria-busy", "false");
    }
  }

  function applySiteColor(element, value) {
    if (typeof value !== "string" || !/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return;
    const hex = value.length === 4 ? value.slice(1).split("").map((c) => c + c).join("") : value.slice(1);
    const rgb = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
    const linear = rgb.map((c) => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
    const luminance = linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
    element.style.backgroundColor = value;
    element.style.color = luminance > .179 ? "#000" : "#fff";
  }

  function catalogRow(site, host) {
    const row = document.createElement("li");
    const logo = document.createElement("span");
    logo.className = "site-logo";
    logo.setAttribute("aria-hidden", "true");
    logo.textContent = Array.from(site.name.trim())[0].toLocaleUpperCase();
    applySiteColor(logo, site.theme?.light?.accent_color || site.color);
    const logoURL = httpURL(site.theme?.logo_url);
    if (logoURL) {
      const image = document.createElement("img");
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      image.referrerPolicy = "no-referrer";
      image.addEventListener("error", () => image.remove(), { once: true });
      image.src = logoURL.href;
      logo.append(image);
    }
    const info = document.createElement("div");
    info.className = "site-info";
    const name = document.createElement("p");
    name.className = "site-name";
    name.textContent = site.name;
    const hostname = document.createElement("p");
    hostname.className = "site-host";
    hostname.textContent = host.hostname;
    info.append(name, hostname);
    row.append(logo, info);
    return row;
  }

  async function loadCatalog() {
    const message = select("#catalog-message");
    const list = select("#catalog-list");
    const count = select("#catalog-count");
    const shell = select(".catalog-shell");
    message.textContent = "Loading the catalog…";
    shell.setAttribute("aria-busy", "true");
    try {
      const catalog = await readJSON("/instances.json");
      if (!catalog || !Array.isArray(catalog.instances)) throw new Error("Invalid catalog");
      const fragment = document.createDocumentFragment();
      let total = 0;
      catalog.instances.forEach((site) => {
        if (!site || typeof site.name !== "string" || !site.name.trim()
          || typeof site.oauth_client_id !== "string" || !site.oauth_client_id.trim()) return;
        const host = httpURL(site.api_host_url);
        if (!host) return;
        fragment.append(catalogRow(site, host));
        total += 1;
      });
      list.replaceChildren(fragment);
      count.textContent = total + (total === 1 ? " platform" : " platforms");
      count.hidden = false;
      list.hidden = total === 0;
      message.textContent = total ? "" : "Nothing here yet. Add the first platform.";
      message.hidden = total > 0;
      select("#empty-catalog-cta").hidden = total !== 0;
    } catch {
      message.textContent = "Couldn't load the catalog. Refresh to try again.";
    } finally {
      shell.setAttribute("aria-busy", "false");
    }
  }

  function setupMotion() {
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Content remains visible even if an observer never delivers a callback.
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .08 });
    document.querySelectorAll(".progression, .demo-copy, .try-layout, .section-heading, .source-layout").forEach((node) => observer.observe(node));
  }

  setupMenu();
  setupTabs();
  setupCopy();
  loadDistribution();
  loadCatalog();
  setupMotion();
})();
