// ==UserScript==
// @name         NILAM JSON Assistant
// @namespace    https://github.com/cscLearn/nilam-assistant
// @version      1.2.1
// @description  Auto-fill NILAM book records from a GitHub JSON database.
// @author       cscLearn
// @match        https://ains.moe.gov.my/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      raw.githubusercontent.com
// @updateURL    https://raw.githubusercontent.com/cscLearn/nilam-assistant/main/tampermonkey/nilam-assistant.user.js
// @downloadURL  https://raw.githubusercontent.com/cscLearn/nilam-assistant/main/tampermonkey/nilam-assistant.user.js
// ==/UserScript==

(function () {
  "use strict";

  const DATA_URL = "https://raw.githubusercontent.com/cscLearn/nilam-book-database/main/data/merged/books-all.json";
  const STORE_KEY = "nilam_assistant_state_v1";

  const state = {
    books: [],
    filtered: [],
    index: 0,
    startDate: todayIsoDate(),
    filters: {
      source: "synthetic",
      category: "all",
      language: "bm"
    },
    ...GM_getValue(STORE_KEY, {})
  };

  let filledPage1 = false;
  let filledPage2 = false;
  let lastScrolledKey = "";

  function todayKey() {
    const d = new Date();
    return `nilam_daily_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function saveState() {
    GM_setValue(STORE_KEY, {
      index: state.index,
      startDate: state.startDate,
      filters: state.filters
    });
  }

  function loadJson(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url,
        onload: (response) => {
          if (response.status < 200 || response.status >= 300) {
            reject(new Error(`HTTP ${response.status}`));
            return;
          }
          resolve(JSON.parse(response.responseText));
        },
        onerror: reject
      });
    });
  }

  function applyFilters() {
    state.filtered = state.books.filter((book) => {
      if (state.filters.source !== "all" && book.source !== state.filters.source) return false;
      if (state.filters.category !== "all" && book.category !== state.filters.category) return false;
      if (state.filters.language !== "all" && book.language !== state.filters.language) return false;
      return true;
    });

    if (state.filtered.length === 0) {
      state.index = 0;
    } else {
      state.index = Math.max(0, Math.min(state.index, state.filtered.length - 1));
    }
  }

  function currentBook() {
    return state.filtered[state.index] || null;
  }

  function todayIsoDate() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function nilamLanguage(language) {
    if (language === "bm") return "Bahasa Melayu";
    if (language === "en") return "English";
    return "Lain-lain";
  }

  function getBookDate(index) {
    const baseDateStr = state.startDate || todayIsoDate();
    const baseDate = new Date(baseDateStr);
    baseDate.setDate(baseDate.getDate() + index);
    return `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, "0")}-${String(baseDate.getDate()).padStart(2, "0")}`;
  }

  function ensureMinWordCount(text, minWords, langCode) {
    let cleanText = String(text ?? "").trim();
    if (!cleanText) return "";
    
    let words = cleanText.split(/\s+/).filter(Boolean);
    if (langCode === "zh" || /[\u4e00-\u9fa5]/.test(cleanText)) {
      if (words.length < minWords) {
        cleanText = cleanText.replace(/([，。！？；：、])/g, "$1 ");
        words = cleanText.split(/\s+/).filter(Boolean);
      }
      if (words.length < minWords) {
        cleanText = cleanText.split("").filter(c => c.trim()).join(" ");
      }
      return cleanText;
    }

    if (words.length < minWords) {
      const fillers = {
        bm: {
          summary: "Buku ini sangat menarik dan sesuai dibaca oleh semua golongan pembaca.",
          lesson: "Amalan mulia ini sangat penting."
        },
        en: {
          summary: "This book is very interesting and highly recommended for all readers.",
          lesson: "This moral lesson is very important."
        }
      };
      const lang = langCode === "en" ? "en" : "bm";
      const filler = minWords >= 10 ? fillers[lang].summary : fillers[lang].lesson;
      cleanText = cleanText + " " + filler;
    }
    return cleanText;
  }

  function bookForForm(book) {
    if (!book) return null;
    const lang = book.language || "bm";
    return {
      date: getBookDate(state.index),
      title: book.title,
      pages: book.pages,
      isbn: formatIsbn(book.isbn),
      author: book.author,
      publisher: book.publisher,
      year: book.year,
      category: book.category,
      language: nilamLanguage(book.language),
      rumusan: ensureMinWordCount(book.rumusan, 10, lang),
      lesson: ensureMinWordCount(book.lesson, 5, lang)
    };
  }

  function formatIsbn(isbn) {
    const compact = String(isbn ?? "").replaceAll("-", "");
    if (!/^978\d{10}$/.test(compact)) return String(isbn ?? "");
    if (compact.startsWith("978967")) return `${compact.slice(0, 3)}-${compact.slice(3, 6)}-${compact.slice(6, 9)}-${compact.slice(9, 12)}-${compact.slice(12)}`;
    if (compact.startsWith("9780")) return `${compact.slice(0, 3)}-${compact.slice(3, 4)}-${compact.slice(4, 7)}-${compact.slice(7, 12)}-${compact.slice(12)}`;
    if (compact.startsWith("9787")) return `${compact.slice(0, 3)}-${compact.slice(3, 4)}-${compact.slice(4, 8)}-${compact.slice(8, 12)}-${compact.slice(12)}`;
    return `${compact.slice(0, 3)}-${compact.slice(3, 6)}-${compact.slice(6, 9)}-${compact.slice(9, 12)}-${compact.slice(12)}`;
  }

  function setValue(el, value) {
    if (!el) return false;
    el.focus();

    const setter =
      Object.getOwnPropertyDescriptor(el.constructor.prototype, "value")?.set ||
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set ||
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;

    if (setter) setter.call(el, String(value ?? ""));
    else el.value = String(value ?? "");

    el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: String(value ?? "") }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
    el.blur();
    return true;
  }

  function findDateInput() {
    // 1. Direct type="date"
    let el = document.querySelector('input[type="date"]');
    if (el) return el;

    // 2. ID match
    el = document.querySelector('input[id*="date" i], input[id*="tarikh" i]');
    if (el) return el;

    // 3. Name match
    el = document.querySelector('input[name*="date" i], input[name*="tarikh" i]');
    if (el) return el;

    // 4. Placeholder match
    el = document.querySelector('input[placeholder*="date" i], input[placeholder*="tarikh" i], input[placeholder*="yyyy-mm-dd" i], input[placeholder*="dd/mm/yyyy" i]');
    if (el) return el;

    // 5. Fallback to index 10
    const inputs = document.querySelectorAll("input");
    if (inputs.length > 10) return inputs[10];

    return null;
  }

  function fillDate(book) {
    const dateInput = findDateInput();
    if (!dateInput) return false;

    if (dateInput.hasAttribute("readonly")) {
      dateInput.removeAttribute("readonly");
    }

    dateInput.focus();
    dateInput.click();
    setValue(dateInput, book.date);

    ["keydown", "keypress", "keyup"].forEach((type) => {
      dateInput.dispatchEvent(new KeyboardEvent(type, {
        bubbles: true,
        cancelable: true,
        key: "Enter",
        code: "Enter"
      }));
    });

    return true;
  }

  function selectDropdownByText(selectIndex, targetText) {
    const selectEl = document.querySelectorAll("select")[selectIndex];
    if (!selectEl || !targetText) return false;

    const opt = Array.from(selectEl.options).find((option) =>
      option.textContent.trim().includes(targetText)
    );

    if (!opt) return false;

    selectEl.value = opt.value;
    selectEl.selectedIndex = opt.index;
    selectEl.dispatchEvent(new Event("input", { bubbles: true }));
    selectEl.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function forceClickFifthStar() {
    const stars = Array.from(document.querySelectorAll("svg"))
      .filter(svg => svg.outerHTML.includes("fa-star"));

    console.log("找到星星:", stars.length);

    if (stars.length >= 5) {
      const fifthStar = stars[4];

      ["mousedown", "mouseup", "click"].forEach(type => {
        fifthStar.dispatchEvent(new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window
        }));
      });

      console.log("⭐⭐⭐⭐⭐ 已精准点击第5颗星");
      return true;
    }

    console.log("❌ 找不到5颗星");
    return false;
  }

  function clickButtonByText(text) {
    const btn = Array.from(document.querySelectorAll("button, span, div, p"))
      .find((el) => (el.textContent || "").trim().includes(text));

    if (!btn) return false;
    btn.scrollIntoView({ behavior: "auto", block: "center" });
    setTimeout(() => btn.click(), 150);
    return true;
  }

  function scrollToBottomHard() {
    setTimeout(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight || document.body.scrollHeight,
        behavior: "auto"
      });

      document.documentElement.scrollTop = document.documentElement.scrollHeight;
      document.body.scrollTop = document.body.scrollHeight;

      const scrollers = Array.from(document.querySelectorAll("div"))
        .filter(el => el.scrollHeight > el.clientHeight + 100);

      scrollers.forEach(el => {
        el.scrollTop = el.scrollHeight;
      });

      console.log("✅ 已强制滚到底部");
    }, 300);
  }

  function scrollToBottomOnce(key) {
    if (lastScrolledKey === key) return;
    lastScrolledKey = key;
    scrollToBottomHard();
  }

  function fillPage1(book) {
    if (filledPage1) return false;
    filledPage1 = true;

    fillDate(book);
    setValue(document.getElementById("title"), book.title);
    setValue(document.getElementById("noOfPage"), book.pages);
    setValue(document.getElementById("isbn"), book.isbn);
    setValue(document.getElementById("author"), book.author);
    setValue(document.getElementById("publisher"), book.publisher);
    setValue(document.getElementById("publishedYear"), book.year);

    document.getElementById("typephysical")?.click();
    selectDropdownByText(0, book.category);
    selectDropdownByText(1, book.language);

    setStatus("Page 1 filled");
    setTimeout(() => clickButtonByText("Seterusnya"), 700);
    return true;
  }

  function fillPage2(book) {
    if (filledPage2) return false;
    filledPage2 = true;

    setValue(document.getElementById("summary"), book.rumusan);
    setValue(document.getElementById("review"), book.lesson);

    setTimeout(() => {
      forceClickFifthStar();
      scrollToBottomHard();
    }, 500);

    setStatus("Page 2 filled");
    return true;
  }

  function fillVisibleForm() {
    const btnPasti = Array.from(document.querySelectorAll("button, span, div"))
      .find((el) => (el.textContent || "").trim() === "Pasti");

    if (btnPasti) {
      btnPasti.click();
      if (state.filtered.length) {
        state.index = Math.min(state.index + 1, state.filtered.length - 1);
        resetFillFlags();
        renderBook();
      }
      return true;
    }

    const book = bookForForm(currentBook());
    if (!book) return false;

    if (document.getElementById("title")) return fillPage1(book);

    if (document.getElementById("summary")) {
      // Fill text fields once
      if (!filledPage2) {
        filledPage2 = true;
        setValue(document.getElementById("summary"), book.rumusan);
        setValue(document.getElementById("review"), book.lesson);
        setStatus("Page 2 filled");
        // First attempt after a short delay
        setTimeout(() => {
          forceClickFifthStar();
          scrollToBottomHard();
        }, 500);
      }
      // Keep trying to click stars on every interval (in case SVG wasn't ready)
      forceClickFifthStar();
      return true;
    }

    // Page 3/4: detect action buttons and scroll to bottom once per page
    const hasActionBtn = Array.from(document.querySelectorAll("button, span, div, p"))
      .some((el) => {
        const t = (el.textContent || "").trim();
        return t.includes("Hantar") || t.includes("Simpan") || t.includes("Seterusnya");
      });
    if (hasActionBtn) {
      scrollToBottomOnce(`page-action-${state.index}`);
      return true;
    }

    return false;
  }

  function resetFillFlags() {
    filledPage1 = false;
    filledPage2 = false;
    lastScrolledKey = "";
  }

  function setStatus(text) {
    const status = document.querySelector("#nilam-json-assistant-status");
    if (status) status.textContent = text;
  }

  function updateCountBar() {
    const el = document.querySelector("#nja-count-bar");
    if (!el) return;
    const f = state.filters;
    el.innerHTML = `<b>${state.filtered.length}</b> / ${state.books.length} total | ${f.source} | ${f.category} | ${f.language}`;
  }

  function renderBook() {
    const book = currentBook();
    const body = document.querySelector("#nilam-json-assistant-body");
    if (!body) return;
    updateCountBar();

    if (!book) {
      body.innerHTML = `<div class="nja-empty">Tiada buku untuk filter ini.</div>`;
      setStatus(`0/${state.books.length}`);
      return;
    }

    body.innerHTML = `
      <div class="nja-title">${escapeHtml(book.title)}</div>
      <div class="nja-meta">${escapeHtml(book.author)} · ${escapeHtml(book.publisher)} · ${book.year}</div>
      <div class="nja-grid">
        <button class="nja-copy-btn" data-copy="title">Title</button>
        <button class="nja-copy-btn" data-copy="author">Author</button>
        <button class="nja-copy-btn" data-copy="publisher">Publisher</button>
        <button class="nja-copy-btn" data-copy="isbn">ISBN</button>
        <button class="nja-copy-btn" data-copy="rumusan">Rumusan</button>
        <button class="nja-copy-btn" data-copy="lesson">Lesson</button>
      </div>
      <textarea readonly>${escapeHtml(JSON.stringify(book, null, 2))}</textarea>
    `;

    setStatus(`#${state.index + 1}/${state.filtered.length}`);
    saveState();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  async function copyText(text) {
    await navigator.clipboard.writeText(String(text ?? ""));
    setStatus("Copied");
  }

  async function reloadJson() {
    setStatus("Reloading...");
    try {
      state.books = await loadJson(DATA_URL);
      applyFilters();
      renderBook();
      setStatus("Loaded " + state.books.length + " books");
    } catch (e) {
      setStatus("Error: " + e.message);
    }
  }

  function resetProgress() {
    state.index = 0;
    resetFillFlags();
    saveState();
    renderBook();
    setStatus("Progress reset");
  }

  function createPanel() {
    const panel = document.createElement("section");
    panel.id = "nilam-json-assistant";
    panel.innerHTML = `
      <style>
        #nilam-json-assistant {
          position: fixed;
          right: 12px;
          bottom: 12px;
          z-index: 999999;
          width: 270px;
          max-width: calc(100vw - 24px);
          padding: 14px;
          border: 2px solid #6846f5;
          border-radius: 14px;
          background: #fff;
          color: #222;
          box-shadow: 0 8px 32px rgba(104, 70, 245, 0.25), 0 2px 8px rgba(0,0,0,0.1);
          font: 13px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        #nilam-json-assistant h2 {
          margin: 0 0 10px;
          font-size: 15px;
          color: #6846f5;
          font-weight: 700;
        }
        #nilam-json-assistant select {
          min-height: 30px;
          border: 1px solid #d0c8f5;
          border-radius: 8px;
          background: #f8f6ff;
          color: #333;
          padding: 0 4px;
          font-size: 12px;
        }
        .nja-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          min-height: 36px;
          border: none;
          border-radius: 10px;
          color: #fff;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.1s;
        }
        .nja-btn:hover { opacity: 0.85; }
        .nja-btn:active { transform: scale(0.96); }
        .nja-btn-purple { background: #6846f5; }
        .nja-btn-green { background: #22c55e; }
        .nja-btn-blue { background: #3b82f6; }
        .nja-btn-amber { background: #f59e0b; }
        .nja-btn-red { background: #ef4444; }
        .nja-btn-gray { background: #6b7280; }
        .nja-copy-btn {
          min-height: 28px;
          border: 1px solid #d0c8f5;
          border-radius: 8px;
          background: #f8f6ff;
          color: #6846f5;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }
        .nja-copy-btn:hover { background: #ede9fe; }
        .nja-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 6px;
          margin-bottom: 8px;
        }
        .nja-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          margin: 8px 0;
        }
        .nja-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          margin-bottom: 6px;
        }
        .nja-actions-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 6px;
          margin-bottom: 6px;
        }
        #nja-count-bar {
          background: #f0edff;
          border-radius: 8px;
          padding: 5px 8px;
          font-size: 11px;
          color: #4c3fb0;
          margin-bottom: 8px;
          text-align: center;
        }
        .nja-title {
          font-weight: 700;
          font-size: 13px;
          margin-bottom: 2px;
          color: #1a1a2e;
        }
        .nja-meta {
          color: #666;
          font-size: 11px;
          margin-bottom: 4px;
        }
        #nilam-json-assistant-status {
          color: #6846f5;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        #nilam-json-assistant textarea {
          width: 100%;
          height: 120px;
          resize: vertical;
          box-sizing: border-box;
          border: 1px solid #d0c8f5;
          border-radius: 8px;
          padding: 6px;
          font: 11px/1.3 Consolas, monospace;
          background: #fafafa;
        }
        .nja-date-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
        }
        .nja-date-row span {
          font-size: 11px;
          color: #888;
          white-space: nowrap;
        }
        .nja-date-row input {
          flex: 1;
          padding: 3px 6px;
          box-sizing: border-box;
          border: 1px solid #d0c8f5;
          border-radius: 8px;
          font-size: 12px;
        }
      </style>
      <h2>NILAM JSON Assistant</h2>
      <div id="nja-count-bar">Loading...</div>
      <div class="nja-row">
        <select id="nja-source">
          <option value="synthetic">synthetic</option>
          <option value="verified">verified</option>
          <option value="all">all</option>
        </select>
        <select id="nja-category">
          <option value="all">all</option>
          <option value="Fiksyen">Fiksyen</option>
          <option value="Bukan Fiksyen">Bukan Fiksyen</option>
        </select>
        <select id="nja-language">
          <option value="bm">bm</option>
          <option value="en">en</option>
          <option value="zh">zh</option>
          <option value="all">all</option>
        </select>
      </div>
      <div class="nja-date-row">
        <span>Start:</span>
        <input type="date" id="nja-start-date" />
      </div>
      <div class="nja-actions">
        <button id="nja-fill" type="button" class="nja-btn nja-btn-purple">Fill</button>
        <button id="nja-random" type="button" class="nja-btn nja-btn-blue">Random</button>
      </div>
      <div class="nja-actions-3">
        <button id="nja-prev" type="button" class="nja-btn nja-btn-gray">Prev</button>
        <button id="nja-next" type="button" class="nja-btn nja-btn-green">Next</button>
        <button id="nja-star" type="button" class="nja-btn nja-btn-amber">5 Star</button>
      </div>
      <div class="nja-actions-3">
        <button id="nja-scroll" type="button" class="nja-btn nja-btn-gray">Bottom</button>
        <button id="nja-reload" type="button" class="nja-btn nja-btn-blue">Reload</button>
        <button id="nja-reset" type="button" class="nja-btn nja-btn-red">Reset</button>
      </div>
      <div id="nilam-json-assistant-status">Loading...</div>
      <div id="nilam-json-assistant-body"></div>
    `;

    document.body.append(panel);

    document.querySelector("#nja-source").value = state.filters.source;
    document.querySelector("#nja-category").value = state.filters.category;
    document.querySelector("#nja-language").value = state.filters.language;
    document.querySelector("#nja-start-date").value = state.startDate;

    panel.addEventListener("change", (event) => {
      if (event.target.id === "nja-source") state.filters.source = event.target.value;
      if (event.target.id === "nja-category") state.filters.category = event.target.value;
      if (event.target.id === "nja-language") state.filters.language = event.target.value;
      if (event.target.id === "nja-start-date") {
        state.startDate = event.target.value;
        saveState();
      }
      state.index = 0;
      resetFillFlags();
      applyFilters();
      renderBook();
    });

    panel.addEventListener("click", async (event) => {
      const button = event.target.closest("button");
      if (!button) return;

      if (button.id === "nja-prev" && state.filtered.length) {
        state.index = (state.index - 1 + state.filtered.length) % state.filtered.length;
        resetFillFlags();
      }
      if (button.id === "nja-next" && state.filtered.length) {
        state.index = (state.index + 1) % state.filtered.length;
        resetFillFlags();
      }
      if (button.id === "nja-random" && state.filtered.length) {
        state.index = Math.floor(Math.random() * state.filtered.length);
        resetFillFlags();
      }
      if (button.id === "nja-fill") fillVisibleForm();
      if (button.id === "nja-star") forceClickFifthStar();
      if (button.id === "nja-scroll") scrollToBottomHard();
      if (button.id === "nja-reload") { await reloadJson(); return; }
      if (button.id === "nja-reset") { resetProgress(); return; }

      const copyField = button.dataset.copy;
      if (copyField) {
        const book = currentBook();
        if (book) await copyText(book[copyField]);
        return;
      }

      renderBook();
    });
  }

  async function main() {
    createPanel();
    state.books = await loadJson(DATA_URL);
    applyFilters();

    const savedDaily = GM_getValue(todayKey(), null);
    if (savedDaily) {
      const dailyIndex = state.filtered.findIndex((book) => book.id === savedDaily);
      if (dailyIndex >= 0) state.index = dailyIndex;
    } else if (state.filtered.length) {
      GM_setValue(todayKey(), state.filtered[state.index].id);
    }

    renderBook();
    setInterval(fillVisibleForm, 700);
  }

  main().catch((error) => {
    console.error(error);
    setStatus(`Error: ${error.message}`);
  });
})();
