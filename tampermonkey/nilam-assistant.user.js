// ==UserScript==
// @name         NILAM Assistant (DOM 半自动填表版)
// @namespace    https://github.com/cscLearn/nilam-assistant
// @version      5.0
// @description  稳定可用的 DOM 半自动填表版本。内置 10 本书（三语各多本），自动填写第一页、第二页摘要与感想，并自动点击五星评分。第二页需手动滚动至 Hantar 按钮提交。此版本使用 @grant none，MouseEvent view:window 在非沙盒环境下完全正常。适合稳定使用，不依赖 API Token。
// @author       cscLearn
// @match        https://ains.moe.gov.my/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://raw.githubusercontent.com/cscLearn/nilam-assistant/main/tampermonkey/nilam-assistant.user.js
// @downloadURL  https://raw.githubusercontent.com/cscLearn/nilam-assistant/main/tampermonkey/nilam-assistant.user.js
// ==/UserScript==

(function () {
  "use strict";

  let currentIndex = Number(localStorage.getItem("nilam_currentIndex") || 0);
  let filledPage2 = false;

  const booksData = [
    {
      date: "2026-06-01",
      title: "Kucing yang Rajin",
      pages: "16",
      isbn: "978-967-317-301-3",
      author: "Nor Azlina Ahmad",
      publisher: "KOHWAI & YOUNG",
      year: "2011",
      category: "Fiksyen",
      language: "Bahasa Melayu",
      rumusan: "Seekor kucing kecil rajin membantu ibunya mengemas rumah dan menjaga adik-adiknya. Sikap rajinnya membuatkan semua haiwan di kampung menyukainya.",
      lesson: "Kita hendaklah rajin membantu keluarga dan tidak malas membuat kerja harian."
    },
    {
      date: "2026-06-02",
      title: "Burung Pipit yang Baik Hati",
      pages: "18",
      isbn: "978-967-317-302-0",
      author: "Siti Hajar",
      publisher: "KOHWAI & YOUNG",
      year: "2012",
      category: "Fiksyen",
      language: "Bahasa Melayu",
      rumusan: "Seekor burung pipit membantu seekor semut yang hampir lemas. Kemudian, semut itu pula menyelamatkan burung pipit daripada bahaya.",
      lesson: "Kita hendaklah saling membantu kerana kebaikan akan dibalas dengan kebaikan."
    },
    {
      date: "2026-06-03",
      title: "The Helpful Rabbit",
      pages: "20",
      isbn: "978-0-7445-5101-3",
      author: "Mary Green",
      publisher: "Ladybird Books",
      year: "2014",
      category: "Fiksyen",
      language: "English",
      rumusan: "A little rabbit helps his friends gather food before the rain comes. Because of his kindness, all the animals have enough food to eat.",
      lesson: "We should help our friends and work together when facing problems."
    },
    {
      date: "2026-06-04",
      title: "The Lost Kitten",
      pages: "22",
      isbn: "978-0-7445-5102-0",
      author: "Helen Brown",
      publisher: "Ladybird Books",
      year: "2015",
      category: "Fiksyen",
      language: "English",
      rumusan: "A kitten loses its way while playing outside. With the help of a kind girl and a friendly dog, it finally returns home safely.",
      lesson: "We must be careful when going out and should ask for help when we are lost."
    },
    {
      date: "2026-06-05",
      title: "小猴子摘香蕉",
      pages: "18",
      isbn: "978-7533261018",
      author: "儿童故事编写组",
      publisher: "明天出版社",
      year: "2011",
      category: "Fiksyen",
      language: "Lain-lain",
      rumusan: "小猴子想摘高高的香蕉，可是一个人摘不到。后来它请朋友帮忙，大家一起合作，终于摘到了香蕉。",
      lesson: "遇到困难时，可以请别人帮忙。大家合作，事情会更容易完成。"
    },
    {
      date: "2026-06-06",
      title: "小熊学分享",
      pages: "20",
      isbn: "978-7533261025",
      author: "儿童故事编写组",
      publisher: "明天出版社",
      year: "2012",
      category: "Fiksyen",
      language: "Lain-lain",
      rumusan: "小熊有很多蜂蜜，却不愿意和朋友分享。后来朋友们帮助它修好蜂窝，小熊明白了分享的快乐。",
      lesson: "我们要学会分享，也要珍惜朋友之间的情谊。"
    },
    {
      date: "2026-06-07",
      title: "Ikan Kecil yang Berani",
      pages: "16",
      isbn: "978-967-317-303-7",
      author: "Zainab Hassan",
      publisher: "KOHWAI & YOUNG",
      year: "2013",
      category: "Fiksyen",
      language: "Bahasa Melayu",
      rumusan: "Seekor ikan kecil takut berenang jauh dari ibunya. Selepas berlatih setiap hari, ikan itu menjadi lebih berani dan pandai menjaga diri.",
      lesson: "Kita perlu berlatih dan berani mencuba perkara yang baik."
    },
    {
      date: "2026-06-08",
      title: "The Clean Classroom",
      pages: "18",
      isbn: "978-0-7445-5103-7",
      author: "Peter Hall",
      publisher: "Oxford Reading Tree",
      year: "2016",
      category: "Fiksyen",
      language: "English",
      rumusan: "A group of pupils work together to clean their classroom before their teacher arrives. Their teamwork makes the classroom neat and cheerful.",
      lesson: "We should keep our classroom clean and work together as a team."
    },
    {
      date: "2026-06-09",
      title: "小兔子找朋友",
      pages: "22",
      isbn: "978-7533261032",
      author: "林小梅",
      publisher: "儿童读物出版社",
      year: "2013",
      category: "Fiksyen",
      language: "Lain-lain",
      rumusan: "小兔子刚搬到森林里，觉得很孤单。它主动和小鹿、小鸟打招呼，最后交到了很多朋友。",
      lesson: "我们要勇敢和别人交流，真诚待人就能交到朋友。"
    },
    {
      date: "2026-06-10",
      title: "小鸭子过马路",
      pages: "16",
      isbn: "978-7533261049",
      author: "王丽丽",
      publisher: "儿童读物出版社",
      year: "2014",
      category: "Fiksyen",
      language: "Lain-lain",
      rumusan: "小鸭子想自己过马路，差点发生危险。后来它听从妈妈的话，学会看红绿灯和注意车辆。",
      lesson: "我们过马路时要遵守交通规则，注意安全。"
    }
  ];

  function setValue(el, value) {
    if (!el) return false;

    el.focus();

    const setter =
      Object.getOwnPropertyDescriptor(el.constructor.prototype, "value")?.set ||
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set ||
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;

    if (setter) setter.call(el, String(value));
    else el.value = String(value);

    el.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      inputType: "insertText",
      data: String(value)
    }));

    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
    el.blur();

    return true;
  }

  function selectDropdownByText(selectIndex, targetText) {
    const selectEl = document.querySelectorAll("select")[selectIndex];
    if (!selectEl || !targetText) return false;

    const opt = Array.from(selectEl.options).find(o =>
      o.textContent.trim().includes(targetText)
    );

    if (!opt) return false;

    selectEl.value = opt.value;
    selectEl.selectedIndex = opt.index;
    selectEl.dispatchEvent(new Event("change", { bubbles: true }));

    return true;
  }

  function fillDate(b) {
    const dateInput = document.querySelectorAll("input")[10];

    if (!dateInput) {
      console.log("❌ 找不到日期 input[10]");
      return false;
    }

    setValue(dateInput, b.date);

    dateInput.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      key: "Enter"
    }));

    dateInput.dispatchEvent(new KeyboardEvent("keyup", {
      bubbles: true,
      key: "Enter"
    }));

    console.log("✅ 日期已填写:", b.date);
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

  function scrollToActionButton() {
    setTimeout(() => {
      const btn = Array.from(document.querySelectorAll("button, span, div, p"))
        .find(el => {
          const t = (el.textContent || "").trim();
          return (
            t.includes("Seterusnya") ||
            t.includes("Hantar") ||
            t.includes("Simpan")
          );
        });

      if (btn) {
        btn.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "smooth"
        });
      }
    }, 400);
  }

  function clickSeterusnya() {
    const btn = Array.from(document.querySelectorAll("button, span, div, p"))
      .find(el => (el.textContent || "").trim().includes("Seterusnya"));

    if (btn) {
      btn.scrollIntoView({ behavior: "smooth", block: "center" });
      btn.click();
      console.log("✅ 已点击 Seterusnya");
      return true;
    }

    console.log("❌ 找不到 Seterusnya");
    return false;
  }

  function updatePanel() {
    const status = document.getElementById("nilam-status");
    if (!status) return;

    const b = booksData[currentIndex];

    status.innerHTML = `
      进度：第 ${Math.min(currentIndex + 1, booksData.length)} / ${booksData.length} 本<br>
      日期：${b?.date || "-"}<br>
      <b>${b?.title || "全部完成"}</b>
    `;
  }

  function nextBook() {
    currentIndex = Math.min(currentIndex + 1, booksData.length);
    localStorage.setItem("nilam_currentIndex", currentIndex);
    updatePanel();
  }

  function previousBook() {
    currentIndex = Math.max(0, currentIndex - 1);
    localStorage.setItem("nilam_currentIndex", currentIndex);
    updatePanel();
  }

  function resetBooks() {
    currentIndex = 0;
    localStorage.setItem("nilam_currentIndex", currentIndex);
    updatePanel();
  }

  function fillPage1(b) {
    console.log("📄 自动感知：第一页");

    fillDate(b);

    setValue(document.getElementById("title"), b.title);
    setValue(document.getElementById("noOfPage"), b.pages);
    setValue(document.getElementById("isbn"), b.isbn);
    setValue(document.getElementById("author"), b.author);
    setValue(document.getElementById("publisher"), b.publisher);
    setValue(document.getElementById("publishedYear"), b.year);

    const physical = document.getElementById("typephysical");
    if (physical) physical.click();

    selectDropdownByText(0, b.category);
    selectDropdownByText(1, b.language);

    setTimeout(clickSeterusnya, 900);
  }

  function fillPage2(b) {
    console.log("📄 自动感知：第二页");

    setValue(document.getElementById("summary"), b.rumusan);
    setValue(document.getElementById("review"), b.lesson);

    setTimeout(() => {
      forceClickFifthStar();
      scrollToActionButton();
      filledPage2 = true;
    }, 500);
  }

  setInterval(() => {
    if (currentIndex >= booksData.length) return;

    const b = booksData[currentIndex];

    const btnPasti = Array.from(document.querySelectorAll("button, span, div"))
      .find(el => (el.textContent || "").trim() === "Pasti");

    if (btnPasti) {
      btnPasti.click();
      console.log("✅ 已点击 Pasti");
      filledPage2 = false;
      nextBook();
      return;
    }

    const titleInput = document.getElementById("title");
    if (titleInput && titleInput.value === "") {
      fillPage1(b);
      return;
    }

    const summaryInput = document.getElementById("summary");
    if (summaryInput && summaryInput.value === "") {
      fillPage2(b);
      return;
    }

    if (summaryInput && !filledPage2) {
      scrollToActionButton();
    }
  }, 700);

  function createPanel() {
    if (document.getElementById("nilam-assistant-panel")) return;

    const panel = document.createElement("div");
    panel.id = "nilam-assistant-panel";
    panel.style.cssText = `
      position:fixed;
      right:20px;
      bottom:20px;
      z-index:999999;
      background:white;
      border:2px solid #6846f5;
      border-radius:14px;
      padding:12px;
      width:250px;
      box-shadow:0 6px 20px rgba(0,0,0,.25);
      font-family:Arial,sans-serif;
      color:#222;
    `;

    panel.innerHTML = `
      <div style="font-weight:bold;color:#6846f5;font-size:15px;margin-bottom:6px;">
        📚 NILAM 助手 v5.0
      </div>

      <div id="nilam-status" style="font-size:12px;margin-bottom:10px;line-height:1.4;color:#333;"></div>

      <button id="nilam-next" style="width:48%;padding:6px;margin-right:2%;background:#333;color:white;border:0;border-radius:6px;cursor:pointer;">
        下一本
      </button>

      <button id="nilam-prev" style="width:48%;padding:6px;background:#777;color:white;border:0;border-radius:6px;cursor:pointer;">
        上一本
      </button>

      <button id="nilam-reset" style="width:100%;padding:6px;margin-top:6px;background:#eee;color:#222;border:1px solid #ccc;border-radius:6px;cursor:pointer;">
        重置进度
      </button>

      <button id="nilam-star" style="width:100%;padding:6px;margin-top:6px;background:#f5a623;color:white;border:0;border-radius:6px;cursor:pointer;">
        补点五星
      </button>
    `;

    document.body.appendChild(panel);

    document.getElementById("nilam-next").onclick = nextBook;
    document.getElementById("nilam-prev").onclick = previousBook;
    document.getElementById("nilam-reset").onclick = resetBooks;
    document.getElementById("nilam-star").onclick = forceClickFifthStar;

    updatePanel();
  }

  createPanel();

  console.log("✅ NILAM Assistant v5.0 已启动");
})();
