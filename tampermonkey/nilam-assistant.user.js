// ==UserScript==
// @name         NILAM JSON Assistant
// @namespace    https://github.com/cscLearn/nilam-assistant
// @version      1.1.3
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
      .filter((svg) => svg.outerHTML.includes("fa-star"));

    if (stars.length < 5) return false;

    ["mousedown", "mouseup", "click"].forEach((type) => {
      stars[4].dispatchEvent(new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window
      }));
    });
    return true;
  }

  function clickButtonByText(text) {
    const btn = Array.from(document.querySelectorAll("button, span, div, p"))
      .find((el) => (el.textContent || "").trim().includes(text));

    if (!btn) return false;
    btn.scrollIntoView({ behavior: "auto", block: "center" });
    setTimeout(() => btn.click(), 150);
    return true;
  }

  function fastScrollToBottomOnce(key) {
    if (lastScrolledKey === key) return;
    lastScrolledKey = key;

    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "auto" });

      const btn = Array.from(document.querySelectorAll("button, span, div, p"))
        .find((el) => {
          const t = (el.textContent || "").trim();
          return t.includes("Hantar") || t.includes("Simpan") || t.includes("Seterusnya");
        });

      if (btn) btn.scrollIntoView({ behavior: "auto", block: "end" });
    }, 150);
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
      fastScrollToBottomOnce(`page2-${state.index}`);
    }, 300);

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

    if (document.getElementById("title")) {
      return fillPage1(book);
    }

    if (document.getElementById("summary")) {
      // 1. Fill page 2 text fields if empty
      if (document.getElementById("summary").value === "" || document.getElementById("review").value === "") {
        fillPage2(book);
      }
      // 2. Continuously click stars on every interval check
      forceClickFifthStar();
      
      // 3. Continuously scroll to bottom on every interval check
      const hasActionBtn = Array.from(document.querySelectorAll("button, span, div, p"))
        .some((el) => {
          const t = (el.textContent || "").trim();
          return t.includes("Hantar") || t.includes("Simpan") || t.includes("Seterusnya");
        });
      if (hasActionBtn) {
        fastScrollToBottomOnce(`page2-${state.index}`);
      }
      return true;
    }

    // If there is an action button ("Hantar" or "Simpan"), we are on the final page (Page 4). Scroll to bottom!
    const hasActionBtn = Array.from(document.querySelectorAll("button, span, div, p"))
      .some((el) => {
        const t = (el.textContent || "").trim();
        return t.includes("Hantar") || t.includes("Simpan");
      });
    if (hasActionBtn) {
      fastScrollToBottomOnce(`page4-${state.index}`);
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

  function renderBook() {
    const book = currentBook();
    const body = document.querySelector("#nilam-json-assistant-body");
    if (!body) return;

    if (!book) {
      body.innerHTML = `<div class="nja-empty">Tiada buku untuk filter ini.</div>`;
      setStatus(`${state.filtered.length}/${state.books.length}`);
      return;
    }

    body.innerHTML = `
      <div class="nja-title">${escapeHtml(book.title)}</div>
      <div class="nja-meta">${escapeHtml(book.author)} - ${escapeHtml(book.publisher)} - ${book.year}</div>
      <div class="nja-grid">
        <button data-copy="title">Title</button>
        <button data-copy="author">Author</button>
        <button data-copy="publisher">Publisher</button>
        <button data-copy="isbn">ISBN</button>
        <button data-copy="rumusan">Rumusan</button>
        <button data-copy="lesson">Lesson</button>
      </div>
      <textarea readonly>${escapeHtml(JSON.stringify(book, null, 2))}</textarea>
    `;

    setStatus(`${state.index + 1}/${state.filtered.length} - ${book.category} - ${book.language}`);
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

  function createPanel() {
    const panel = document.createElement("section");
    panel.id = "nilam-json-assistant";
    panel.innerHTML = `
      <style>
        #nilam-json-assistant {
          position: fixed;
          right: 16px;
          bottom: 16px;
          z-index: 999999;
          width: 330px;
          max-width: calc(100vw - 32px);
          padding: 12px;
          border: 1px solid #b8b8b8;
          border-radius: 8px;
          background: #f7f7f7;
          color: #222;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
          font: 14px/1.35 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        #nilam-json-assistant h2 {
          margin: 0 0 8px;
          font-size: 16px;
          color: #4b35c8;
        }
        #nilam-json-assistant select,
        #nilam-json-assistant button {
          min-height: 32px;
          border: 1px solid #aaa;
          border-radius: 6px;
          background: #fff;
          color: #222;
        }
        #nilam-json-assistant button {
          cursor: pointer;
        }
        .nja-row,
        .nja-grid {
          display: grid;
          gap: 8px;
        }
        .nja-row {
          grid-template-columns: 1fr 1fr 1fr;
          margin-bottom: 8px;
        }
        .nja-grid {
          grid-template-columns: 1fr 1fr;
          margin: 10px 0;
        }
        .nja-actions {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
          margin-bottom: 8px;
        }
        .nja-title {
          font-weight: 700;
          margin-bottom: 3px;
        }
        .nja-meta,
        #nilam-json-assistant-status {
          color: #555;
          font-size: 12px;
        }
        #nilam-json-assistant textarea {
          width: 100%;
          height: 150px;
          resize: vertical;
          box-sizing: border-box;
          border: 1px solid #aaa;
          border-radius: 6px;
          padding: 8px;
          font: 12px/1.35 Consolas, monospace;
        }
      </style>
      <h2>NILAM JSON Assistant</h2>
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
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <span style="font-size: 12px; color: #555; white-space: nowrap;">Start Date:</span>
        <input type="date" id="nja-start-date" style="flex: 1; padding: 2px 6px; box-sizing: border-box;" />
      </div>
      <div class="nja-actions">
        <button id="nja-prev" type="button">Prev</button>
        <button id="nja-fill" type="button">Fill</button>
        <button id="nja-next" type="button">Next</button>
      </div>
      <div class="nja-actions">
        <button id="nja-random" type="button">Random</button>
        <button id="nja-star" type="button">5 Star</button>
        <button id="nja-scroll" type="button">Bottom</button>
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
      if (button.id === "nja-scroll") window.scrollTo({ top: document.body.scrollHeight, behavior: "auto" });

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
