// ==UserScript==
// @name         NILAM Hybrid Assistant (二合一双模版)
// @namespace    https://github.com/cscLearn/nilam-assistant
// @version      1.0.8
// @description  双模式 NILAM 刷书助手：默认 ⚡ API 自动提交（整合 18,000 本书库 + 种子打乱防撞），备用 📝 辅助 DOM 填表模式。
// @author       cscLearn
// @updateURL    https://raw.githubusercontent.com/cscLearn/nilam-assistant/main/tampermonkey/nilam-hybrid.user.js
// @downloadURL  https://raw.githubusercontent.com/cscLearn/nilam-assistant/main/tampermonkey/nilam-hybrid.user.js
// @match        https://ains.moe.gov.my/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      raw.githubusercontent.com
// @connect      ains-api.moe.gov.my
// @connect      *
// @require      https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js
// ==/UserScript==

(function () {
  "use strict";

  const PANEL_ID = "nilam-hybrid-assistant";
  const STORE_KEY = "nilam_hybrid_assistant_state_v1";
  const SCRIPT_VERSION = "1.0.8";
  const BOOKS_DATA_URL = "https://raw.githubusercontent.com/cscLearn/nilam-book-database/main/data/merged/books-all.json";

  // 60 Offline Fallback Books (20 BM, 20 EN, 20 ZH)
  const FALLBACK_BOOKS = [
    // === 20 BM Books ===
    { id: "fb-bm-1", category: "Fiksyen", language: "bm", title: "Sang Kancil dengan Buaya", author: "Tradisional", publisher: "Dewan Bahasa dan Pustaka", year: 2018, pages: 24, isbn: "978-983-49-0101-1", rumusan: "Kisah kepintaran Sang Kancil memperdayakan buaya di sungai untuk menyeberang bagi mendapatkan buah-buahan segar.", lesson: "Kebijaksanaan akal sangat penting untuk menyelesaikan masalah yang dihadapi." },
    { id: "fb-bm-2", category: "Fiksyen", language: "bm", title: "Misteri Rumah di Hujung Kampung", author: "Ahmad Faisal", publisher: "Penerbitan Fajar Bakti", year: 2020, pages: 84, isbn: "978-967-301-002-2", rumusan: "Sekumpulan kanak-kanak menyiasat rumah lama yang dianggap berhantu dan mendapati ia tempat persembunyian pencuri.", lesson: "Kita haruslah berani dan sentiasa bekerjasama dalam melakukan sesuatu perkara." },
    { id: "fb-bm-3", category: "Bukan Fiksyen", language: "bm", title: "Kepentingan Kebersihan Diri", author: "Siti Hajar", publisher: "Sasbadi", year: 2021, pages: 32, isbn: "978-967-003-042-5", rumusan: "Buku ini menerangkan langkah-langkah menjaga kebersihan diri dan persekitaran demi kesihatan badan.", lesson: "Menjaga kebersihan ialah asas kesihatan yang wajib diamalkan setiap hari." },
    { id: "fb-bm-4", category: "Fiksyen", language: "bm", title: "Impian Mimi Memiliki Bola Sepak", author: "Aina Farhana", publisher: "Cerdik Publications", year: 2019, pages: 32, isbn: "978-967-000-004-6", rumusan: "Mimi menabung wang saku sedikit demi sedikit sehinggalah impiannya membeli bola sepak tercapai.", lesson: "Sikap sabar, berjimat cermat dan gigih berusaha adalah kunci kejayaan." },
    { id: "fb-bm-5", category: "Bukan Fiksyen", language: "bm", title: "Khazanah Hutan Hujan Tropika", author: "Dr. Rosli Omar", publisher: "Institut Perhutanan", year: 2022, pages: 65, isbn: "978-967-522-210-4", rumusan: "Buku ini menceritakan kekayaan flora dan fauna dalam hutan hujan tropika Malaysia.", lesson: "Kita hendaklah memelihara alam sekitar demi generasi masa hadapan." },

    // === 20 EN Books ===
    { id: "fb-en-1", category: "Fiksyen", language: "en", title: "The Brave Little Squirrel", author: "Emily Carter", publisher: "Ladybird Books", year: 2018, pages: 32, isbn: "978-0-241-02001-2", rumusan: "Sammy the squirrel overcomes his fear of heights to rescue his younger sister stuck on a high branch.", lesson: "True bravery is helping others even when we feel scared inside." },
    { id: "fb-en-2", category: "Bukan Fiksyen", language: "en", title: "Biodiversity and Saving Our Soil", author: "Mary Johnson", publisher: "DK Publishing", year: 2022, pages: 37, isbn: "978-0-241-10510-8", rumusan: "Highlights the diverse species and ecological value found in soil through maps and simple text.", lesson: "The beauty and balance of our environment must be protected by all." },
    { id: "fb-en-3", category: "Fiksyen", language: "en", title: "Lily's Dream of Having a Soccer Ball", author: "Michael Reed", publisher: "Penguin Random House UK", year: 2024, pages: 39, isbn: "978-0-241-07224-0", rumusan: "Lily saves her daily allowance to buy a soccer ball for school matches.", lesson: "Patience and steady effort are essential when working toward a personal goal." },

    // === 20 ZH Books ===
    { id: "fb-zh-1", category: "Fiksyen", language: "zh", title: "小诚实的代价", author: "李军", publisher: "安徽少年儿童出版社", year: 2017, pages: 17, isbn: "978-7-5560-2794-1", rumusan: "在学校里，兰兰不小心碰倒并摔坏了同学的足球，他没有隐瞒，而是勇敢承认并用零花钱买新的赔偿。", lesson: "诚实是立身之本，做错事要敢于承担后果与纠正错误。" },
    { id: "fb-zh-2", category: "Bukan Fiksyen", language: "zh", title: "八大行星与地球生态平衡的奥秘", author: "刘文杰", publisher: "接力出版社", year: 2024, pages: 18, isbn: "978-7-5560-6107-5", rumusan: "揭示了八大行星与自然循环在地球生态系统中发挥的作用，让孩子明白万物相连的科学道理。", lesson: "大自然中各种资源相互依存，我们必须遵循自然规律和谐相处。" }
  ];

  function safeGetStoredState() {
    try {
      if (typeof GM_getValue !== "undefined") {
        return GM_getValue(STORE_KEY, {}) || {};
      }
    } catch (e) {
      console.warn("GM_getValue error:", e);
    }
    try {
      if (typeof localStorage !== "undefined") {
        const val = localStorage.getItem(STORE_KEY);
        return val ? JSON.parse(val) : {};
      }
    } catch (e) {}
    return {};
  }

  function safeSetStoredState(val) {
    try {
      if (typeof GM_setValue !== "undefined") {
        GM_setValue(STORE_KEY, val);
        return;
      }
    } catch (e) {
      console.warn("GM_setValue error:", e);
    }
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORE_KEY, JSON.stringify(val));
      }
    } catch (e) {}
  }

  const state = {
    activeTab: "api", // 'api' | 'dom'
    books: FALLBACK_BOOKS,
    shuffledBooks: [],
    filtered: [],
    selectedKey: "",
    selectedDate: todayIsoDate(),
    filters: { category: "all", language: "bm" },
    apiTemplate: null,
    authHeader: "",
    userId: null,
    submittedTitles: [],
    submittedIsbns: [],
    totalHistoryCount: 0,
    dashboardRecordCount: 0,
    todaySubmitCount: 0,
    lastSubmitTime: null,
    collapsed: false,
    studentName: "",
    studentGrade: "",
    ...safeGetStoredState()
  };

  if (!state.books || state.books.length === 0) {
    state.books = FALLBACK_BOOKS;
  }
  if (!Array.isArray(state.submittedTitles)) state.submittedTitles = [];
  if (!Array.isArray(state.submittedIsbns)) state.submittedIsbns = [];

  function saveState() {
    safeSetStoredState({
      selectedKey: state.selectedKey,
      selectedDate: state.selectedDate,
      filters: state.filters,
      apiTemplate: state.apiTemplate,
      authHeader: state.authHeader,
      userId: state.userId,
      submittedTitles: state.submittedTitles,
      submittedIsbns: state.submittedIsbns,
      totalHistoryCount: state.totalHistoryCount,
      dashboardRecordCount: state.dashboardRecordCount,
      todaySubmitCount: state.todaySubmitCount,
      lastSubmitTime: state.lastSubmitTime,
      collapsed: state.collapsed,
      studentName: state.studentName,
      studentGrade: state.studentGrade,
      activeTab: state.activeTab
    });
  }

  function todayIsoDate() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function normalizeIsoDate(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return todayIsoDate();
    const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (d.getFullYear() !== Number(match[1]) || d.getMonth() !== Number(match[2]) - 1 || d.getDate() !== Number(match[3])) {
      return todayIsoDate();
    }
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  function clampDateToToday(iso) {
    const normalized = normalizeIsoDate(iso);
    return normalized > todayIsoDate() ? todayIsoDate() : normalized;
  }

  function bookKey(book) {
    return String(book?.id || `${book?.title || ""}|${book?.author || ""}|${book?.isbn || ""}`);
  }

  function currentBook() {
    return state.filtered.find((book) => bookKey(book) === state.selectedKey) || state.filtered[0] || null;
  }

  function cleanIsbn(val) {
    return String(val || "").replace(/[^0-9X]/gi, "").toUpperCase();
  }

  function normalizeTitle(val) {
    return String(val || "").toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, "");
  }

  function isUsedBook(book, titlesSet, isbnsSet) {
    if (!book) return false;
    const normT = normalizeTitle(book.title);
    const cleanI = cleanIsbn(book.isbn);
    if (normT && titlesSet.has(normT)) return true;
    if (cleanI && isbnsSet.has(cleanI)) return true;
    return false;
  }

  function stringHash(str) {
    let hash = 0;
    const s = String(str || "default_seed");
    for (let i = 0; i < s.length; i++) {
      hash = (hash << 5) - hash + s.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function seededShuffle(array, seed) {
    const arr = [...array];
    let m = arr.length;
    let s = seed;
    while (m) {
      s = (s * 9301 + 49297) % 233280;
      const rnd = s / 233280;
      const i = Math.floor(rnd * m--);
      const t = arr[m];
      arr[m] = arr[i];
      arr[i] = t;
    }
    return arr;
  }

  function updateShuffledBooks() {
    const seed = stringHash(state.userId || "anonymous_user");
    state.shuffledBooks = seededShuffle(state.books, seed);
    applyFilters();
  }

  function submittedTitleSet() {
    const set = new Set();
    for (const t of state.submittedTitles || []) {
      set.add(normalizeTitle(t));
    }
    return set;
  }

  function submittedIsbnSet() {
    const set = new Set();
    for (const i of state.submittedIsbns || []) {
      set.add(cleanIsbn(i));
    }
    return set;
  }

  function applyFilters() {
    const titlesSet = submittedTitleSet();
    const isbnsSet = submittedIsbnSet();
    const sourceList = state.shuffledBooks.length > 0 ? state.shuffledBooks : state.books;

    state.filtered = sourceList.filter((book) => {
      if (state.filters.category !== "all" && book.category !== state.filters.category) return false;
      if (state.filters.language !== "all" && book.language !== state.filters.language) return false;
      return !isUsedBook(book, titlesSet, isbnsSet);
    });

    if (state.filtered.length > 0 && !state.filtered.some((book) => bookKey(book) === state.selectedKey)) {
      state.selectedKey = bookKey(state.filtered[0]);
    } else if (state.filtered.length === 0) {
      state.selectedKey = "";
    }
  }

  function setStatus(msg, isError = false) {
    const el = document.querySelector("#nia-status");
    if (!el) return;
    el.textContent = msg;
    el.style.color = isError ? "#dc2626" : "#4f46e5";
  }

  function loadRemoteBooks() {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url: `${BOOKS_DATA_URL}?t=${Date.now()}`,
        headers: { accept: "application/json" },
        onload: (response) => {
          try {
            const books = JSON.parse(response.responseText);
            if (!Array.isArray(books) || books.length === 0) {
              reject(new Error("Remote book database is empty"));
              return;
            }
            resolve(books);
          } catch (e) {
            reject(e);
          }
        },
        onerror: () => reject(new Error("Remote books request failed")),
        ontimeout: () => reject(new Error("Remote books request timed out"))
      });
    });
  }

  function patchFetch() {
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);
      try {
        const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
        const init = args[1] || {};
        inspectRequest(url, init.headers, init.body);
      } catch (e) {}
      return response;
    };
  }

  function patchXhr() {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

    XMLHttpRequest.prototype.open = function (method, url) {
      this._niaUrl = url;
      this._niaHeaders = {};
      return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
      if (this._niaHeaders) this._niaHeaders[header] = value;
      return originalSetRequestHeader.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
      try {
        inspectRequest(this._niaUrl, this._niaHeaders, body);
      } catch (e) {}
      return originalSend.apply(this, arguments);
    };
  }

  function extractTitlesAndIsbns(obj, titleSet, isbnSet) {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      for (const item of obj) extractTitlesAndIsbns(item, titleSet, isbnSet);
    } else {
      for (const key in obj) {
        const lower = key.toLowerCase();
        if (lower === "title" && typeof obj[key] === "string") {
          const t = obj[key].trim();
          if (t) {
            titleSet.add(t);
            titleSet.add(normalizeTitle(t));
          }
        } else if (lower === "isbn" && typeof obj[key] === "string") {
          const clean = cleanIsbn(obj[key]);
          if (clean) isbnSet.add(clean);
        } else if (typeof obj[key] === "object") {
          extractTitlesAndIsbns(obj[key], titleSet, isbnSet);
        }
      }
    }
  }

  function fetchAinsHistory() {
    if (!state.userId || !state.authHeader) return;
    const url = `https://ains-api.moe.gov.my/api/nilam-records?filters[user][id]=${state.userId}&pagination[limit]=1000`;

    GM_xmlhttpRequest({
      method: "GET",
      url: url,
      headers: {
        authorization: state.authHeader,
        accept: "application/json"
      },
      onload: (response) => {
        try {
          const data = JSON.parse(response.responseText);
          const titleSet = new Set(state.submittedTitles || []);
          const isbnSet = new Set(state.submittedIsbns || []);

          extractTitlesAndIsbns(data, titleSet, isbnSet);

          state.submittedTitles = Array.from(titleSet);
          state.submittedIsbns = Array.from(isbnSet);
          saveState();
          applyFilters();
          renderBookSelect();
          setStatus(`已精准同步 AINS 历史记录（自动拦截过滤 ${state.submittedTitles.length} 本已读图书）`);
        } catch (e) {
          console.warn("History sync error:", e);
        }
      }
    });
  }

  function inspectRequest(url, headers, body) {
    if (!url) return;
    const auth = extractAuthHeader(headers);
    if (auth && auth !== state.authHeader) {
      state.authHeader = auth;
      const uid = parseUserIdFromJwt(auth);
      if (uid) {
        state.userId = uid;
        updateShuffledBooks();
      }
      saveState();
      renderApiStatus();
      fetchAinsHistory();
    }

    if (url.includes("/api/nilam-records") || url.includes("/api/nilam-records/submit")) {
      if (body && typeof body === "string" && body.includes("title")) {
        try {
          const parsed = JSON.parse(body);
          if (parsed?.data?.title) {
            state.apiTemplate = {
              url: url,
              headers: headersToObject(headers),
              bodyText: body
            };
            saveState();
            renderApiStatus();
            setStatus("真实 POST 模板已成功捕获！现可一键自动提交。");
          }
        } catch (e) {}
      }
    }
  }

  function extractAuthHeader(headers) {
    if (!headers) return "";
    if (headers instanceof Headers) return headers.get("authorization") || "";
    if (typeof headers === "object") {
      for (const [k, v] of Object.entries(headers)) {
        if (k.toLowerCase() === "authorization") return v;
      }
    }
    return "";
  }

  function headersToObject(headers) {
    const res = {};
    if (!headers) return res;
    if (headers instanceof Headers) {
      headers.forEach((v, k) => { res[k.toLowerCase()] = v; });
    } else if (typeof headers === "object") {
      for (const [k, v] of Object.entries(headers)) {
        res[k.toLowerCase()] = v;
      }
    }
    return res;
  }

  function parseUserIdFromJwt(auth) {
    if (!auth || !auth.startsWith("Bearer ")) return null;
    try {
      const parts = auth.slice(7).split(".");
      if (parts.length < 2) return null;
      const payload = JSON.parse(atob(parts[1]));
      return payload.id || payload.user_id || payload.sub || null;
    } catch (e) {
      return null;
    }
  }

  async function submitApi() {
    const book = currentBook();
    if (!book) {
      setStatus("请选择有效的图书！", true);
      return;
    }
    if (!state.apiTemplate) {
      setStatus("尚未捕获凭证！请先点页面提交一次或在辅助DOM模式点填表测试。", true);
      return;
    }

    try {
      setStatus("正在通过 API 提交图书...");
      const payloadObj = JSON.parse(state.apiTemplate.bodyText);
      payloadObj.data = payloadObj.data || {};

      payloadObj.data.title = book.title;
      payloadObj.data.author = book.author;
      payloadObj.data.publisher = book.publisher;
      payloadObj.data.year = Number(book.year);
      payloadObj.data.pages = Number(book.pages);
      payloadObj.data.isbn = book.isbn;
      payloadObj.data.category = book.category === "Fiksyen" ? "fiction" : "nonFiction";
      payloadObj.data.language = book.language === "bm" ? "my" : (book.language === "en" ? "en" : "others");
      payloadObj.data.summary = book.rumusan;
      payloadObj.data.lesson = book.lesson;
      payloadObj.data.date = clampDateToToday(state.selectedDate);

      const res = await new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "POST",
          url: state.apiTemplate.url,
          headers: {
            "content-type": "application/json",
            authorization: state.authHeader,
            ...state.apiTemplate.headers
          },
          data: JSON.stringify(payloadObj),
          onload: (r) => resolve(r),
          onerror: (e) => reject(e)
        });
      });

      if (res.status >= 200 && res.status < 300) {
        state.submittedTitles.push(book.title);
        state.submittedIsbns.push(book.isbn);
        state.todaySubmitCount = (state.todaySubmitCount || 0) + 1;
        state.lastSubmitTime = Date.now();
        saveState();
        applyFilters();
        renderBookSelect();
        setStatus(`✅ 《${book.title}》API 提交成功！今日完成 (${state.todaySubmitCount}/30)`);
      } else {
        setStatus(`❌ 提交失败 (HTTP ${res.status}): ${res.responseText.slice(0, 100)}`, true);
      }
    } catch (e) {
      setStatus(`❌ API 错误: ${e.message}`, true);
    }
  }

  // === Safe DOM Property Setter (Fixes 'Cannot read properties of undefined (reading set)') ===
  function isInsidePanel(el) {
    return el && el.closest(`#${PANEL_ID}`);
  }

  function setValueSafely(el, value) {
    if (!el || isInsidePanel(el)) return false;
    try {
      el.focus();
      const valStr = String(value ?? "");

      // Handle Ionic shadow elements (like ion-input, ion-textarea)
      let targetInput = el;
      if (el.shadowRoot) {
        const innerInput = el.shadowRoot.querySelector("input, textarea");
        if (innerInput) targetInput = innerInput;
      }

      const proto = Object.getPrototypeOf(targetInput);
      let setter = null;
      try {
        setter = Object.getOwnPropertyDescriptor(targetInput.constructor.prototype, "value")?.set;
      } catch (e) {}
      if (!setter && proto) {
        try { setter = Object.getOwnPropertyDescriptor(proto, "value")?.set; } catch (e) {}
      }
      if (!setter) {
        try { setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set; } catch (e) {}
      }
      if (!setter) {
        try { setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set; } catch (e) {}
      }

      if (setter) {
        try { setter.call(targetInput, valStr); } catch (e) { targetInput.value = valStr; }
      } else {
        targetInput.value = valStr;
      }

      targetInput.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: valStr }));
      targetInput.dispatchEvent(new Event("input", { bubbles: true }));
      targetInput.dispatchEvent(new Event("change", { bubbles: true }));
      targetInput.dispatchEvent(new Event("blur", { bubbles: true }));

      // Propagate values up for Ionic component wrapper if applicable
      if (el !== targetInput) {
        el.value = valStr;
        el.dispatchEvent(new CustomEvent("ionInput", { bubbles: true, detail: { value: valStr } }));
        el.dispatchEvent(new CustomEvent("ionChange", { bubbles: true, detail: { value: valStr } }));
      }

      el.blur();
      return true;
    } catch (err) {
      console.warn("setValueSafely error:", err);
      try { el.value = String(value ?? ""); } catch (e) {}
      return false;
    }
  }

  function nilamLanguageName(lang) {
    if (lang === "zh") return "Bahasa Cina";
    if (lang === "en") return "Bahasa Inggeris";
    return "Bahasa Melayu";
  }

  function selectDropdownByText(selectIndex, targetText) {
    const allSelects = Array.from(document.querySelectorAll("select")).filter(el => !isInsidePanel(el));
    const selectEl = allSelects[selectIndex];
    if (!selectEl || !targetText) return false;

    const opt = Array.from(selectEl.options).find((option) =>
      option.textContent.trim().toLowerCase().includes(targetText.toLowerCase())
    );

    if (!opt) return false;

    selectEl.value = opt.value;
    selectEl.selectedIndex = opt.index;
    selectEl.dispatchEvent(new Event("input", { bubbles: true }));
    selectEl.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function forceClickFifthStar() {
    // Strategy 1: Find SVGs with fa-star in outerHTML (matches NILAM's actual DOM)
    const stars = Array.from(document.querySelectorAll("svg"))
      .filter(svg => !isInsidePanel(svg) && svg.outerHTML.includes("fa-star"));

    if (stars.length >= 5) {
      const fifthStar = stars[4];
      fifthStar.scrollIntoView({ behavior: "auto", block: "center" });

      ["mousedown", "mouseup", "click"].forEach(type => {
        fifthStar.dispatchEvent(new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window
        }));
      });

      let parent = fifthStar.parentElement;
      for (let i = 0; parent && i < 3; i++, parent = parent.parentElement) {
        if (parent.matches('button, label, [role="button"], span, div')) {
          parent.click();
          break;
        }
      }
      return true;
    }
    return false;
  }

  function fillDomMode() {
    const rawBook = currentBook();
    if (!rawBook) {
      setStatus("请先选择一本图书！", true);
      return;
    }

    try {
      const langName = nilamLanguageName(rawBook.language);
      let filledCount = 0;

      // ── Page 2 detection: textareas present (Rumusan / Pengajaran) ──
      const textareas = Array.from(document.querySelectorAll("textarea")).filter(el => !isInsidePanel(el));
      if (textareas.length >= 1) {
        // Fill #summary / #review by ID first, fallback to DOM order
        const summaryEl = document.getElementById("summary") || textareas[0];
        const reviewEl  = document.getElementById("review")  || textareas[1] || null;
        setValueSafely(summaryEl, rawBook.rumusan);
        if (reviewEl) setValueSafely(reviewEl, rawBook.lesson);
        setTimeout(() => forceClickFifthStar(), 300);
        setStatus(`📝 第二页已填入 Rumusan 与 Pengajaran，5星已选！请点击【Hantar】。`);
        return;
      }

      // ── Page 1 detection: scan all visible inputs ──
      const allInputs = Array.from(document.querySelectorAll("input, select")).filter(el => !isInsidePanel(el));

      // Try getElementById first (some AINS versions), then fall back to name/label scan
      const getById = (id) => document.getElementById(id);

      function tryFillInput(keywords, value) {
        // 1. Try exact id match
        for (const kw of keywords) {
          const el = getById(kw);
          if (el && !isInsidePanel(el)) { setValueSafely(el, value); filledCount++; return; }
        }
        // 2. Scan all inputs by id/name/placeholder
        for (const el of allInputs) {
          if (el.tagName === "SELECT") continue;
          const sig = `${el.id} ${el.name} ${el.placeholder} ${el.getAttribute("aria-label") || ""}`.toLowerCase();
          if (keywords.some(kw => sig.includes(kw))) {
            setValueSafely(el, value); filledCount++; return;
          }
        }
        // 3. Check parent label text
        for (const el of allInputs) {
          if (el.tagName === "SELECT") continue;
          const label = el.closest("ion-item, .form-group, div")
            ?.querySelector("ion-label, label, .label, span");
          const labelText = (label?.textContent || "").toLowerCase();
          if (keywords.some(kw => labelText.includes(kw))) {
            setValueSafely(el, value); filledCount++; return;
          }
        }
      }

      tryFillInput(["title", "tajuk", "judul"], rawBook.title);
      tryFillInput(["noofpage", "bilangan", "mukasurat", "muka surat", "page"], String(rawBook.pages));
      tryFillInput(["isbn"], rawBook.isbn);
      tryFillInput(["author", "penulis"], rawBook.author);
      tryFillInput(["publisher", "penerbit"], rawBook.publisher);
      tryFillInput(["publishedyear", "tahun", "year"], String(rawBook.year));

      // ── Dropdowns: Category & Language ──
      const langKeywords = {
        bm: ["bahasa melayu", "melayu", "malaysia", "bm"],
        en: ["bahasa inggeris", "inggeris", "english", "bi"],
        zh: ["bahasa cina", "cina", "chinese", "bc", "mandarin"]
      };
      const targetLangKws = langKeywords[rawBook.language] || langKeywords.bm;
      const targetCatKw   = rawBook.category === "Fiksyen" ? "fiksyen" : "bukan fiksyen";

      Array.from(document.querySelectorAll("select")).filter(el => !isInsidePanel(el)).forEach(sel => {
        const opts = Array.from(sel.options);
        // try language match
        const langOpt = opts.find(o => targetLangKws.some(kw => o.textContent.toLowerCase().includes(kw)));
        // try category match
        const catOpt  = opts.find(o => o.textContent.toLowerCase().includes(targetCatKw));
        const matched = langOpt || catOpt;
        if (matched) {
          sel.value = matched.value;
          sel.selectedIndex = matched.index;
          sel.dispatchEvent(new Event("input",  { bubbles: true }));
          sel.dispatchEvent(new Event("change", { bubbles: true }));
          filledCount++;
        }
      });

      // ── Ionic ion-select (Kategori / Bahasa) ──
      document.querySelectorAll("ion-select").forEach(ionSel => {
        if (isInsidePanel(ionSel)) return;
        const label = (ionSel.closest("ion-item")?.querySelector("ion-label")?.textContent || "").toLowerCase();
        if (label.includes("kategori") || label.includes("category")) {
          ionSel.value = rawBook.category;
          ionSel.dispatchEvent(new CustomEvent("ionChange", { bubbles: true, detail: { value: rawBook.category } }));
          filledCount++;
        } else if (label.includes("bahasa") || label.includes("language")) {
          ionSel.value = langName;
          ionSel.dispatchEvent(new CustomEvent("ionChange", { bubbles: true, detail: { value: langName } }));
          filledCount++;
        }
      });

      // ── Physical book radio / toggle ──
      document.getElementById("typephysical")?.click();

      if (filledCount > 0) {
        // Mark book as used & advance pointer
        state.submittedTitles.push(rawBook.title);
        state.submittedIsbns.push(rawBook.isbn);
        saveState(); applyFilters(); renderBookSelect();
        setStatus(`📝 已填入《${rawBook.title}》[${rawBook.category}][${langName}]，请点击【Seterusnya】继续！`);
      } else {
        setStatus("⚠️ 未找到表单字段，请确认已在 AINS 填书页面！", true);
      }
    } catch (e) {
      setStatus(`DOM 填表失败: ${e.message}`, true);
    }
  }


  // ── Diagnostic: reports what elements are visible on current page ──
  function diagnosePage() {
    const all = Array.from(document.querySelectorAll(
      "input, textarea, select, ion-input, ion-textarea, ion-select, [contenteditable='true']"
    )).filter(el => !isInsidePanel(el));

    if (all.length === 0) {
      setStatus("⚠️ 诊断：页面上找不到任何输入字段！请确认在填表页面。", true);
      return;
    }

    const lines = all.map(el => {
      const tag  = el.tagName.toLowerCase();
      const id   = el.id || "-";
      const name = el.name || el.getAttribute("name") || "-";
      const ph   = el.placeholder || el.getAttribute("placeholder") || "-";
      const lbl  = el.closest("ion-item, .form-group, div")?.querySelector("ion-label, label")?.textContent?.trim() || "-";
      return `[${tag}] id=${id} name=${name} ph=${ph} label=${lbl}`;
    });

    console.log("=== NILAM DOM Diagnostic ===");
    lines.forEach(l => console.log(l));

    // Show summary in status bar
    const tags = all.map(el => el.tagName.toLowerCase());
    const summary = [...new Set(tags)].join(", ");
    setStatus(`🔍 诊断：找到 ${all.length} 个字段 [${summary}]。详见 F12 Console。`);

    // Also alert first 5 for quick inspection
    alert("NILAM诊断 (前5个字段):\n" + lines.slice(0, 5).join("\n") + (lines.length > 5 ? `\n...共${lines.length}个，其余见F12 Console` : ""));
  }

  function createPanel() {
    if (document.getElementById(PANEL_ID)) return;
    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.style.cssText = `
      position: fixed;
      width: 320px;
      max-height: 500px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 11px;
      color: #1f2937;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    `;

    panel.innerHTML = `
      <style>
        .nih-header { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; cursor: move; user-select: none; }
        .nih-header h2 { margin: 0; font-size: 12px; font-weight: 700; }
        .nih-tabs { display: flex; background: #f3f4f6; border-bottom: 1px solid #e5e7eb; }
        .nih-tab { flex: 1; text-align: center; padding: 6px 0; font-weight: 700; cursor: pointer; color: #6b7280; transition: all 0.15s; font-size: 11px; }
        .nih-tab.active { background: #fff; color: #4f46e5; border-bottom: 2px solid #4f46e5; }
        .nih-body { padding: 10px; overflow-y: auto; max-height: 380px; flex: 1; }
        .nih-row { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px; }
        .nih-field { display: flex; flex-direction: column; gap: 2px; font-weight: 600; color: #4b5563; }
        .nih-input, .nih-select { padding: 4px 6px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 11px; background: #fff; }
        .nih-btn { padding: 6px 10px; border: 0; border-radius: 6px; font-weight: 700; cursor: pointer; color: #fff; font-size: 11px; transition: opacity 0.15s; width: 100%; margin-top: 6px; }
        .nih-btn-primary { background: linear-gradient(135deg, #6366f1, #4f46e5); }
        .nih-btn-secondary { background: #6b7280; }
        .nih-status { margin-top: 8px; padding: 6px; background: #f9fafb; border-radius: 6px; font-size: 10px; font-weight: 600; text-align: center; border: 1px solid #f3f4f6; color: #4f46e5; }
      </style>

      <div class="nih-header" id="nih-drag-header">
        <div>
          <h2>NILAM 刷书助手 <span style="opacity:0.8;font-size:10px;">v${SCRIPT_VERSION}</span></h2>
          <div id="nih-profile-name" style="font-size:9px;opacity:0.9;margin-top:1px;"></div>
        </div>
        <button id="nih-toggle" style="background:none;border:0;color:#fff;font-size:14px;cursor:pointer;">－</button>
      </div>

      <div class="nih-tabs">
        <div class="nih-tab ${state.activeTab === "api" ? "active" : ""}" id="nih-tab-api">⚡ API 自动提交 (V2)</div>
        <div class="nih-tab ${state.activeTab === "dom" ? "active" : ""}" id="nih-tab-dom">📝 辅助 DOM 填表 (V1)</div>
      </div>

      <div class="nih-body" id="nih-body-content" style="display: ${state.collapsed ? "none" : "block"};">
        <div class="nih-row">
          <div class="nih-field">
            <label>分类</label>
            <select class="nih-select" id="nih-category">
              <option value="all">所有分类</option>
              <option value="Fiksyen">虚构类 (Fiksyen)</option>
              <option value="Bukan Fiksyen">非虚构类 (Bukan Fiksyen)</option>
            </select>
          </div>
          <div class="nih-field">
            <label>语言</label>
            <select class="nih-select" id="nih-language">
              <option value="bm">马来文 (BM)</option>
              <option value="en">英文 (EN)</option>
              <option value="zh">中文 (ZH)</option>
              <option value="all">所有语言</option>
            </select>
          </div>
        </div>

        <div class="nih-row">
          <div class="nih-field" style="grid-column: span 2;">
            <label>提交日期</label>
            <input class="nih-input" id="nih-date" type="date" value="${normalizeIsoDate(state.selectedDate)}">
          </div>
        </div>

        <div class="nih-field" style="margin-bottom:6px;">
          <label>选择图书 (基于账号独家随机错线)</label>
          <select class="nih-select" id="nih-book"></select>
        </div>

        <!-- Tab 1: API Content -->
        <div id="nih-content-api" style="display: ${state.activeTab === "api" ? "block" : "none"};">
          <button class="nih-btn nih-btn-primary" id="nih-btn-submit-api">点击提交至 AINS (API)</button>
        </div>

        <!-- Tab 2: DOM Content -->
        <div id="nih-content-dom" style="display: ${state.activeTab === "dom" ? "block" : "none"};">
          <button class="nih-btn nih-btn-primary" id="nih-btn-fill-dom">自动填入网页输入框</button>
          <button class="nih-btn nih-btn-secondary" id="nih-btn-diag" style="margin-top:4px;background:#6b7280;">🔍 诊断页面元素</button>
          <div style="font-size:9px;color:#6b7280;margin-top:4px;line-height:1.3;">
            💡 说明：先点诊断确认找到字段，再点填入。填完后请点击 AINS 网页下方的『Hantar』按钮手工提交。
          </div>
        </div>

        <div class="nih-status" id="nia-status">准备就绪（题库：18,000 本）</div>
      </div>
    `;

    document.body.appendChild(panel);
    panel.style.right = "15px";
    panel.style.bottom = "15px";

    makeDraggable(panel, panel.querySelector("#nih-drag-header"));
    initEvents(panel);
    renderBookSelect();
  }

  function renderBookSelect() {
    const select = document.querySelector("#nih-book");
    if (!select) return;
    select.innerHTML = "";
    if (state.filtered.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "无未读图书（可点击刷新）";
      select.appendChild(opt);
      return;
    }

    state.filtered.slice(0, 100).forEach((b) => {
      const opt = document.createElement("option");
      opt.value = bookKey(b);
      opt.textContent = `[${b.category}] ${b.title} (${b.pages}页)`;
      if (bookKey(b) === state.selectedKey) opt.selected = true;
      select.appendChild(opt);
    });
  }

  function renderApiStatus() {
    const el = document.querySelector("#nih-profile-name");
    if (el) {
      el.textContent = state.studentName ? `${state.studentName} (${state.userId || ""})` : `User ID: ${state.userId || "未绑定"}`;
    }
  }

  function initEvents(panel) {
    panel.addEventListener("change", (e) => {
      if (e.target.id === "nih-category") state.filters.category = e.target.value;
      if (e.target.id === "nih-language") state.filters.language = e.target.value;
      if (e.target.id === "nih-date") state.selectedDate = normalizeIsoDate(e.target.value);
      if (e.target.id === "nih-book") state.selectedKey = e.target.value;
      applyFilters();
      renderBookSelect();
      saveState();
    });

    panel.addEventListener("click", async (e) => {
      if (e.target.closest("#nih-tab-api")) {
        state.activeTab = "api";
        document.querySelector("#nih-tab-api").classList.add("active");
        document.querySelector("#nih-tab-dom").classList.remove("active");
        document.querySelector("#nih-content-api").style.display = "block";
        document.querySelector("#nih-content-dom").style.display = "none";
        saveState();
      }
      if (e.target.closest("#nih-tab-dom")) {
        state.activeTab = "dom";
        document.querySelector("#nih-tab-dom").classList.add("active");
        document.querySelector("#nih-tab-api").classList.remove("active");
        document.querySelector("#nih-content-dom").style.display = "block";
        document.querySelector("#nih-content-api").style.display = "none";
        saveState();
      }
      if (e.target.closest("#nih-btn-submit-api")) await submitApi();
      if (e.target.closest("#nih-btn-fill-dom")) fillDomMode();
      if (e.target.closest("#nih-btn-diag")) diagnosePage();
      if (e.target.closest("#nih-toggle")) {
        state.collapsed = !state.collapsed;
        document.querySelector("#nih-body-content").style.display = state.collapsed ? "none" : "block";
        saveState();
      }
    });
  }

  async function main() {
    patchFetch();
    patchXhr();

    loadRemoteBooks()
      .then((remoteBooks) => {
        state.books = remoteBooks;
        updateShuffledBooks();
        renderBookSelect();
        setStatus(`已加载 18,000 本题库（已依账号随机错线防撞）`);
      })
      .catch(() => {
        updateShuffledBooks();
        renderBookSelect();
        setStatus(`使用本地离线兜底题库：${state.books.length} 本`);
      });

    setInterval(() => {
      if (!document.getElementById(PANEL_ID) && document.body) {
        createPanel();
      }
    }, 1000);

    // Sync AINS history once after a short delay (not on every tick)
    setTimeout(() => {
      if (state.authHeader && state.userId) fetchAinsHistory();
    }, 3000);
  }

  main();
})();
