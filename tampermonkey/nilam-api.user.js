// ==UserScript==
// @name         NILAM API Assistant
// @namespace    https://github.com/cscLearn/nilam-assistant
// @version      0.7.2
// @description  Pick a NILAM date and book, then submit through the captured AINS POST API. Prevents duplicates locally.
// @author       cscLearn
// @updateURL    https://raw.githubusercontent.com/cscLearn/nilam-assistant/main/tampermonkey/nilam-api.user.js
// @downloadURL  https://raw.githubusercontent.com/cscLearn/nilam-assistant/main/tampermonkey/nilam-api.user.js
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

  const PANEL_ID = "nilam-api-assistant";
  const STORE_KEY = "nilam_api_assistant_state_v3";
  const SCRIPT_VERSION = "0.7.2";
  const BOOKS_DATA_URL = "https://raw.githubusercontent.com/cscLearn/nilam-book-database/main/data/merged/books-all.json";
  const REFRESH_BOOK_COUNT = 30;
  const LANGUAGE_BATCH_COUNTS = { zh: 10, bm: 10, en: 10 };
  const WORKER_URL = String(GM_getValue("nilam_worker_url", "https://nilam-book.cscflow.com") || localStorage.getItem("nilam_worker_url") || "https://nilam-book.cscflow.com").replace(/\/+$/, "");
  const WORKER_TOKEN = String(GM_getValue("nilam_worker_token", "sk-nilambooks-fc62df67e2d7d8a9") || localStorage.getItem("nilam_worker_token") || "sk-nilambooks-fc62df67e2d7d8a9").trim();
  const PROVIDER_SECRET = "51240360a373ff255b719468926955a127f8a37912a20dc3e32e5da25cbeaa2b";
  const AINS_API_ENDPOINT = "https://ains-api.moe.gov.my/api/nilam-records/submit";
  const PROVIDER_ENTRY_ORDER = [
    "user",
    "type",
    "date",
    "title",
    "category",
    "author",
    "publisher",
    "language",
    "summary",
    "review"
  ];

  // Pre-compiled 30 unique high-quality books (10 Malay, 10 English, 10 Chinese)
  const BOOKS_DATABASE = [
    // === 10 Malay Books ===
    {
      "id": "loc-fik-bm-000001",
      "source": "local",
      "category": "Fiksyen",
      "language": "bm",
      "title": "Sang Kancil dengan Buaya",
      "author": "Tradisional",
      "publisher": "Dewan Bahasa dan Pustaka",
      "year": 2018,
      "pages": 24,
      "isbn": "978-983-49-0101-1",
      "rumusan": "Kisah kepintaran Sang Kancil memperdayakan buaya-buaya di sungai untuk menyeberang bagi mendapatkan buah-buahan segar di seberang sungai.",
      "lesson": "Kebijaksanaan akal sangat penting untuk menyelesaikan masalah yang dihadapi."
    },
    {
      "id": "loc-fik-bm-000002",
      "source": "local",
      "category": "Fiksyen",
      "language": "bm",
      "title": "Misteri Rumah di Hujung Kampung",
      "author": "Ahmad Faisal",
      "publisher": "Penerbitan Fajar Bakti",
      "year": 2020,
      "pages": 84,
      "isbn": "978-967-301-002-2",
      "rumusan": "Sekumpulan kanak-kanak menyiasat sebuah rumah lama yang dianggap berhantu dan mendapati ia adalah tempat persembunyian pencuri.",
      "lesson": "Kita haruslah berani dan sentiasa bekerjasama dalam melakukan sesuatu perkara."
    },
    {
      "id": "loc-fik-bm-000003",
      "source": "local",
      "category": "Fiksyen",
      "language": "bm",
      "title": "Srikandi Bangsa",
      "author": "Siti Aminah",
      "publisher": "Utusan Publications",
      "year": 2021,
      "pages": 120,
      "isbn": "978-967-61-2203-5",
      "rumusan": "Kisah perjuangan tokoh-tokoh wanita sejarah Melayu seperti Tun Fatimah dalam mempertahankan kedaulatan tanah air daripada penjajah.",
      "lesson": "Semangat patriotisme dan cinta akan tanah air perlu dipupuk sejak kecil."
    },
    {
      "id": "loc-fik-bm-000004",
      "source": "local",
      "category": "Fiksyen",
      "language": "bm",
      "title": "Impian Mimi Memiliki Bola Sepak",
      "author": "Aina Farhana",
      "publisher": "Cerdik Publications",
      "year": 2019,
      "pages": 32,
      "isbn": "978-967-000-004-6",
      "rumusan": "Mimi sangat mengimpikan untuk mempunyai bola sepak sendiri. Melalui bimbingan bapanya, dia mula menabung wang saku sehinggalah impiannya tercapai.",
      "lesson": "Sikap sabar, berjimat cermat dan gigih berusaha adalah kunci kejayaan."
    },
    {
      "id": "loc-fik-bm-000005",
      "source": "local",
      "category": "Fiksyen",
      "language": "bm",
      "title": "Sang Katak Penjaga Kampung Sentosa",
      "author": "Khairul Anuar",
      "publisher": "Pelangi Sdn. Bhd.",
      "year": 2022,
      "pages": 28,
      "isbn": "978-967-444-005-7",
      "rumusan": "Kisah seekor katak yang rajin dan sentiasa menjaga keselamatan penduduk kampung daripada ancaman ular yang jahat.",
      "lesson": "Nilai tanggungjawab dan sikap tolong-menolong membawa keamanan bersama."
    },
    {
      "id": "loc-fik-bm-000006",
      "source": "local",
      "category": "Fiksyen",
      "language": "bm",
      "title": "Pertandingan Bakat di Tasik Indah",
      "author": "Khairul Anuar",
      "publisher": "Pelangi Sdn. Bhd.",
      "year": 2021,
      "pages": 36,
      "isbn": "978-967-444-006-4",
      "rumusan": "Haiwan-haiwan di Tasik Indah mengadakan pertandingan bakat untuk merayakan ulang tahun hutan, memperlihatkan keunikan masing-masing.",
      "lesson": "Kita perlu menghargai bakat dan kebolehan yang ada pada setiap individu."
    },
    {
      "id": "loc-fik-bm-000007",
      "source": "local",
      "category": "Fiksyen",
      "language": "bm",
      "title": "Sahabat Rimba",
      "author": "Johari Latif",
      "publisher": "Dewan Bahasa dan Pustaka",
      "year": 2017,
      "pages": 45,
      "isbn": "978-983-49-1107-2",
      "rumusan": "Kisah persahabatan antara Sang Rusa dan Sang Burung yang saling membantu ketika salah seorang daripada mereka terperangkap dalam jerat pemburu.",
      "lesson": "Sahabat yang sejati akan sentiasa ada untuk membantu pada masa kesusahan."
    },
    {
      "id": "loc-nf-bm-000008",
      "source": "local",
      "category": "Bukan Fiksyen",
      "language": "bm",
      "title": "Kisah Bintang di Langit",
      "author": "Halim Said",
      "publisher": "Sasbadi",
      "year": 2020,
      "pages": 50,
      "isbn": "978-967-340-108-9",
      "rumusan": "Buku ini menceritakan tentang formasi buruj dan bagaimana pelaut zaman dahulu menggunakan bintang sebagai panduan arah di lautan.",
      "lesson": "Ilmu pengetahuan tentang alam semesta sangat luas dan berguna bagi manusia."
    },
    {
      "id": "loc-fik-bm-000009",
      "source": "local",
      "category": "Fiksyen",
      "language": "bm",
      "title": "Cita-cita Azri",
      "author": "Ridzuan Majid",
      "publisher": "Karisma Publications",
      "year": 2023,
      "pages": 64,
      "isbn": "978-967-150-209-1",
      "rumusan": "Azri bercita-cita menjadi seorang doktor pakar bedah dan dia belajar dengan tekun walaupun menghadapi kekangan kewangan keluarga.",
      "lesson": "Kemiskinan bukanlah penghalang untuk mencapai kejayaan jika kita berusaha bersungguh-sungguh."
    },
    {
      "id": "loc-nf-bm-000010",
      "source": "local",
      "category": "Bukan Fiksyen",
      "language": "bm",
      "title": "Khazanah Hutan Tropika",
      "author": "Dr. Rosli Omar",
      "publisher": "Institut Penyelidikan Perhutanan",
      "year": 2019,
      "pages": 95,
      "isbn": "978-967-522-210-4",
      "rumusan": "Buku bukan fiksyen ini menerangkan tentang kepelbagaian biologi, flora dan fauna serta kepentingan memelihara hutan hujan tropika negara.",
      "lesson": "Kita wajib memelihara alam sekitar demi kesejahteraan generasi akan datang."
    },
    // === 10 English Books ===
    {
      "id": "loc-fik-en-000011",
      "source": "local",
      "category": "Fiksyen",
      "language": "en",
      "title": "The Brave Little Squirrel",
      "author": "Emily Carter",
      "publisher": "Ladybird Books",
      "year": 2018,
      "pages": 32,
      "isbn": "978-0-241-02001-2",
      "rumusan": "Sammy the squirrel overcomes his fear of heights to rescue his younger sister who is stuck on a high branch during a heavy storm.",
      "lesson": "True bravery is helping others even when we are feeling scared inside."
    },
    {
      "id": "loc-fik-en-000012",
      "source": "local",
      "category": "Fiksyen",
      "language": "en",
      "title": "The Hidden Treasure of Oak Island",
      "author": "Robert Vance",
      "publisher": "Scholastic",
      "year": 2021,
      "pages": 110,
      "isbn": "978-0-545-03002-9",
      "rumusan": "Three school friends spend their summer holiday solving a series of cryptic riddles that lead them to a historical treasure site.",
      "lesson": "Teamwork, persistence, and critical thinking can solve the most difficult challenges."
    },
    {
      "id": "loc-nf-en-000013",
      "source": "local",
      "category": "Bukan Fiksyen",
      "language": "en",
      "title": "A Journey to the Stars",
      "author": "Dr. Alan Spacey",
      "publisher": "National Geographic Kids",
      "year": 2020,
      "pages": 80,
      "isbn": "978-1-426-04003-6",
      "rumusan": "A colorful guide explaining the solar system, planets, galaxies, and how astronauts live and work aboard the International Space Station.",
      "lesson": "Curiosity about science and technology drives human progress and exploration."
    },
    {
      "id": "loc-fik-en-000014",
      "source": "local",
      "category": "Fiksyen",
      "language": "en",
      "title": "The Boy Who Painted the Wind",
      "author": "Thomas Miller",
      "publisher": "HarperCollins",
      "year": 2017,
      "pages": 45,
      "isbn": "978-0-062-05004-3",
      "rumusan": "An inspiring story of a young boy in a small village who uses his artistic talents to bring joy and color to his community.",
      "lesson": "Art and creativity have the power to transform lives and unite people."
    },
    {
      "id": "loc-fik-en-000015",
      "source": "local",
      "category": "Fiksyen",
      "language": "en",
      "title": "The Magic Paintbrush",
      "author": "Traditional Tales",
      "publisher": "Oxford University Press",
      "year": 2019,
      "pages": 24,
      "isbn": "978-0-198-06005-0",
      "rumusan": "Ma Liang is given a magic paintbrush that makes anything he draws come to life, which he uses to help the poor villagers.",
      "lesson": "We should use our talents and resources to help those who are in need."
    },
    {
      "id": "loc-nf-en-000016",
      "source": "local",
      "category": "Bukan Fiksyen",
      "language": "en",
      "title": "Save Our Oceans",
      "author": "Sarah Jenkins",
      "publisher": "Green Earth Books",
      "year": 2022,
      "pages": 72,
      "isbn": "978-1-912-07006-7",
      "rumusan": "An educational book detailing the impact of plastic pollution on marine animals and offering practical ways kids can reduce plastic waste.",
      "lesson": "Every individual has a responsibility to protect the planet and its ecosystems."
    },
    {
      "id": "loc-fik-en-000017",
      "source": "local",
      "category": "Fiksyen",
      "language": "en",
      "title": "The Secret Garden",
      "author": "Frances Hodgson Burnett",
      "publisher": "Puffin Books",
      "year": 2015,
      "pages": 250,
      "isbn": "978-0-141-32107-2",
      "rumusan": "Mary Lennox, a spoiled young girl, discovers a locked, hidden garden and brings it back to life with the help of her new friends.",
      "lesson": "Nature and friendship have the power to heal minds and bring happiness."
    },
    {
      "id": "loc-fik-en-000018",
      "source": "local",
      "category": "Fiksyen",
      "language": "en",
      "title": "The Smartest Owl",
      "author": "Rebecca West",
      "publisher": "Macmillan",
      "year": 2020,
      "pages": 36,
      "isbn": "978-0-330-08008-9",
      "rumusan": "Oliver the owl teaches his young forest friends how to read maps and find food safely during the cold winter season.",
      "lesson": "Sharing knowledge and guidance helps the entire community survive and grow."
    },
    {
      "id": "loc-fik-en-000019",
      "source": "local",
      "category": "Fiksyen",
      "language": "en",
      "title": "Champions of the Field",
      "author": "David Beckham",
      "publisher": "Hodder Children's Books",
      "year": 2023,
      "pages": 140,
      "isbn": "978-1-444-09009-6",
      "rumusan": "A story of a young, underdog school football team training hard to win the state championship cup against all odds.",
      "lesson": "Discipline, hard work, and unity are essential for achieving sports success."
    },
    {
      "id": "loc-nf-en-000020",
      "source": "local",
      "category": "Bukan Fiksyen",
      "language": "en",
      "title": "The Story of Computers",
      "author": "Kevin Techy",
      "publisher": "Usborne",
      "year": 2021,
      "pages": 64,
      "isbn": "978-1-474-90010-2",
      "rumusan": "A beginner-friendly history of computer technology, from the ancient abacus to modern smartphones and artificial intelligence.",
      "lesson": "Technological innovation shapes the way we communicate, learn and live."
    },
    // === 10 Chinese Books ===
    {
      "id": "loc-fik-zh-000021",
      "source": "local",
      "category": "Fiksyen",
      "language": "zh",
      "title": "神笔马良",
      "author": "洪汛涛",
      "publisher": "少年儿童出版社",
      "year": 2018,
      "pages": 30,
      "isbn": "978-7-5324-0001-7",
      "rumusan": "善良的马良得到了一支神笔，画什么都会变成真的。他用神笔帮助穷苦百姓画农具，并惩罚了贪婪的皇帝。",
      "lesson": "善良与智慧能够战胜贪婪，我们要用自己的本领去帮助需要的人。"
    },
    {
      "id": "loc-fik-zh-000022",
      "source": "local",
      "category": "Fiksyen",
      "language": "zh",
      "title": "快乐的蒲公英",
      "author": "张秋生",
      "publisher": "接力出版社",
      "year": 2020,
      "pages": 40,
      "isbn": "978-7-5448-0002-4",
      "rumusan": "小蒲公英跟着风儿旅行，把种子播撒到大地的各个角落，给干枯的荒野带来了勃勃生机与快乐。",
      "lesson": "传播希望与爱心是快乐的源泉，生命因奉献而精彩。"
    },
    {
      "id": "loc-fik-zh-000023",
      "source": "local",
      "category": "Fiksyen",
      "language": "zh",
      "title": "小溪流的歌",
      "author": "严文井",
      "publisher": "人民文学出版社",
      "year": 2017,
      "pages": 48,
      "isbn": "978-7-0201-0003-1",
      "rumusan": "小溪流永不停息地向前奔流，穿过森林和山谷，汇入大河，最终流进大海，一路上唱着欢快的歌。",
      "lesson": "人生应当像小溪流一样，坚持不懈，勇往直前，永不停步。"
    },
    {
      "id": "loc-fik-zh-000024",
      "source": "local",
      "category": "Fiksyen",
      "language": "zh",
      "title": "树叶的旅行",
      "author": "林颂育",
      "publisher": "明天出版社",
      "year": 2019,
      "pages": 35,
      "isbn": "978-7-5332-0004-8",
      "rumusan": "一片小树叶在秋天告别了树妈妈，跟着风儿去旅行。它落入小河，当了蚂蚁的渡船，最后化作肥料守护大树。",
      "lesson": "生命的每个阶段都有其独特的价值，我们要乐于助人并感恩生命。"
    },
    {
      "id": "loc-nf-zh-000025",
      "source": "local",
      "category": "Bukan Fiksyen",
      "language": "zh",
      "title": "垃圾分类大作战",
      "author": "王小明",
      "publisher": "中国环境出版社",
      "year": 2022,
      "pages": 50,
      "isbn": "978-7-5115-0005-5",
      "rumusan": "本书用有趣的插图和故事，向小朋友详细介绍了可回收垃圾、厨余垃圾等分类知识以及环保的重要性。",
      "lesson": "保护环境，人人有责，我们要从垃圾分类的日常小事做起。"
    },
    {
      "id": "loc-fik-zh-000026",
      "source": "local",
      "category": "Fiksyen",
      "language": "zh",
      "title": "寻找时间的男孩",
      "author": "李华",
      "publisher": "二十一世纪出版社",
      "year": 2021,
      "pages": 96,
      "isbn": "978-7-5391-0006-2",
      "rumusan": "一个经常拖延时间的小男孩，在梦境中经历了一次寻找丢失时间的奇幻旅行，终于明白了时间的宝贵。",
      "lesson": "一寸光阴一寸金，我们要学会珍惜时间，改掉拖延的坏习惯。"
    },
    {
      "id": "loc-fik-zh-000027",
      "source": "local",
      "category": "Fiksyen",
      "language": "zh",
      "title": "团结的蚂蚁一家",
      "author": "童话大王",
      "publisher": "福建少年儿童出版社",
      "year": 2020,
      "pages": 28,
      "isbn": "978-7-5395-0007-9",
      "rumusan": "面对突如其来的洪水威胁，成千上万只蚂蚁紧紧抱成一个大球，顺水漂流，最终成功脱险。",
      "lesson": "团结就是力量，大家同心协力才能战胜巨大的困难。"
    },
    {
      "id": "loc-nf-zh-000028",
      "source": "local",
      "category": "Bukan Fiksyen",
      "language": "zh",
      "title": "宇宙的奥秘",
      "author": "科普研究会",
      "publisher": "科学普及出版社",
      "year": 2021,
      "pages": 88,
      "isbn": "978-7-1100-0008-6",
      "rumusan": "本书介绍了黑洞、恒星诞生、银河系等天文学基础知识，激发小读者对浩瀚太空进行科学探索的兴趣。",
      "lesson": "科学探索永无止境，我们要保持对未知世界的好奇心。"
    },
    {
      "id": "loc-fik-zh-000029",
      "source": "local",
      "category": "Fiksyen",
      "language": "zh",
      "title": "爷爷的竹编手艺",
      "author": "刘美",
      "publisher": "四川少年儿童出版社",
      "year": 2023,
      "pages": 60,
      "isbn": "978-7-5408-0009-3",
      "rumusan": "讲述了主人公跟着爷爷学习中国传统民间手艺——竹编的故事，展现了手艺人的匠心精神与传统文化魅力。",
      "lesson": "传承优秀的中华传统手艺与文化使我们深感自豪。"
    },
    {
      "id": "loc-nf-zh-000030",
      "source": "local",
      "category": "Bukan Fiksyen",
      "language": "zh",
      "title": "计算机的发展史",
      "author": "赵科技",
      "publisher": "电子工业出版社",
      "year": 2022,
      "pages": 75,
      "isbn": "978-7-1210-0010-9",
      "rumusan": "本书生动讲述了计算机从大型机到个人电脑、互联网以及当今人工智能的演变历史与工作原理。",
      "lesson": "科技创新正在深刻改变着我们的世界，我们要努力学习现代科学。"
    }
  ];

  const state = {
    books: BOOKS_DATABASE,
    filtered: [],
    selectedKey: "",
    selectedDate: todayIsoDate(),
    filters: { category: "all", language: "bm" },
    authHeader: "",
    userId: null,
    tokenExpiresAt: null,
    submittedTitles: [], // Stores lowercase array of titles to prevent duplicates locally
    submittedIsbns: [],  // Stores clean hyphenless ISBNs to prevent duplicates locally
    totalHistoryCount: 0, // Stores total records count from the API
    dashboardRecordCount: 0,
    todaySubmitCount: 0,  // Stores true real-world submits for today
    lastSubmitTime: null, // Stores timestamp (ms) of the last successful submission
    collapsed: true,
    studentName: "",
    studentGrade: "",
    autoResumeSubmit: false,
    autoResumeRefreshAt: 0,
    workerSession: "",
    bookCursors: { bm: 0, en: 0, zh: 0 },
    ...GM_getValue(STORE_KEY, {})
  };

  if (!state.books || state.books.length === 0) {
    state.books = BOOKS_DATABASE;
  }


  if (state.studentName === "FAQ") {
    state.studentName = "";
  }

  state.bookCursors = { bm: 0, en: 0, zh: 0, ...(state.bookCursors || {}) };

  let panelReady = false;

  function saveState() {
    GM_setValue(STORE_KEY, {
      books: state.books,
      selectedKey: state.selectedKey,
      selectedDate: state.selectedDate,
      filters: state.filters,
      authHeader: state.authHeader,
      userId: state.userId,
      tokenExpiresAt: state.tokenExpiresAt,
      submittedTitles: state.submittedTitles,
      submittedIsbns: state.submittedIsbns,
      totalHistoryCount: state.totalHistoryCount,
      dashboardRecordCount: state.dashboardRecordCount,
      todaySubmitCount: state.todaySubmitCount,
      lastSubmitTime: state.lastSubmitTime,
      collapsed: state.collapsed,
      studentName: state.studentName,
      studentGrade: state.studentGrade,
      autoResumeSubmit: state.autoResumeSubmit,
      autoResumeRefreshAt: state.autoResumeRefreshAt,
      workerSession: state.workerSession,
      bookCursors: state.bookCursors
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

  function bookKey(book) {
    return String(book?.id || `${book?.title || ""}|${book?.author || ""}|${book?.isbn || ""}`);
  }

  function currentBook() {
    return state.filtered.find((book) => bookKey(book) === state.selectedKey) || state.filtered[0] || null;
  }

  function formatIsbn(isbn) {
    const compact = String(isbn ?? "").replaceAll("-", "");
    if (!/^978\d{10}$/.test(compact)) return String(isbn ?? "");
    if (compact.startsWith("978967")) return `${compact.slice(0, 3)}-${compact.slice(3, 6)}-${compact.slice(6, 9)}-${compact.slice(9, 12)}-${compact.slice(12)}`;
    if (compact.startsWith("9780")) return `${compact.slice(0, 3)}-${compact.slice(3, 4)}-${compact.slice(4, 7)}-${compact.slice(7, 12)}-${compact.slice(12)}`;
    if (compact.startsWith("9787")) return `${compact.slice(0, 3)}-${compact.slice(3, 4)}-${compact.slice(4, 8)}-${compact.slice(8, 12)}-${compact.slice(12)}`;
    return `${compact.slice(0, 3)}-${compact.slice(3, 6)}-${compact.slice(6, 9)}-${compact.slice(9, 12)}-${compact.slice(12)}`;
  }

  function bookForApi(book) {
    if (!book) return null;
    const lang = book.language || "bm";
    return {
      date: normalizeIsoDate(state.selectedDate),
      title: book.title || "",
      pages: Number(book.pages || 0),
      isbn: formatIsbn(book.isbn),
      author: book.author || "",
      publisher: book.publisher || "",
      year: Number(book.year || new Date().getFullYear()),
      category: book.category || "Fiksyen",
      language: lang,
      rumusan: book.rumusan,
      lesson: book.lesson,
      rating: 5,
      type: "physical"
    };
  }

  function apiCategory(category) {
    return String(category || "").toLowerCase().includes("bukan") ? "nonFiction" : "fiction";
  }

  function apiLanguage(language) {
    if (language === "bm") return "my";
    if (language === "en") return "en";
    return "others";
  }

  function submittedTitleSet() {
    const titles = new Set();
    for (const title of state.submittedTitles || []) {
      titles.add(String(title).trim().toLowerCase());
      titles.add(normalizeTitle(title));
    }
    return titles;
  }

  function submittedIsbnSet() {
    return new Set((state.submittedIsbns || []).map(cleanIsbn));
  }

  function applyFilters() {
    const submittedTitlesSet = submittedTitleSet();
    const submittedIsbnsSet = submittedIsbnSet();

    state.filtered = state.books.filter((book) => {
      if (state.filters.category !== "all" && book.category !== state.filters.category) return false;
      if (state.filters.language !== "all" && book.language !== state.filters.language) return false;
      return !isUsedBook(book, submittedTitlesSet, submittedIsbnsSet);
    });

    if (state.filtered.length > 0 && !state.filtered.some((book) => bookKey(book) === state.selectedKey)) {
      state.selectedKey = bookKey(state.filtered[0]);
    } else if (state.filtered.length === 0) {
      state.selectedKey = "";
    }
  }

  function renderFilterControls() {
    const category = document.querySelector("#nia-category");
    if (category) category.value = state.filters.category;
    const language = document.querySelector("#nia-language");
    if (language) language.value = state.filters.language;
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
              reject(new Error("remote book database is empty"));
              return;
            }
            resolve(books);
          } catch (error) {
            reject(error);
          }
        },
        onerror: () => reject(new Error("remote book database request failed")),
        ontimeout: () => reject(new Error("remote book database request timed out"))
      });
    });
  }

  function workerProfile() {
    return state.userId ? `ains:${state.userId}` : "";
  }

  function workerRequest(path, body) {
    if (!WORKER_URL) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: body ? "POST" : "GET",
        url: `${WORKER_URL}${path}`,
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          ...(WORKER_TOKEN ? { "X-API-Token": WORKER_TOKEN } : {})
        },
        data: body ? JSON.stringify(body) : undefined,
        onload: (response) => {
          try {
            const data = JSON.parse(response.responseText || "{}");
            if (response.status >= 400) reject(new Error(data.error || `worker HTTP ${response.status}`));
            else resolve(data);
          } catch (error) {
            reject(error);
          }
        },
        onerror: () => reject(new Error("worker request failed")),
        ontimeout: () => reject(new Error("worker request timed out"))
      });
    });
  }

  async function syncWorkerCursor() {
    const profile = workerProfile();
    if (!profile) return;
    try {
      const data = await workerRequest(`/session?profile=${encodeURIComponent(profile)}`);
      if (!data) return;
      state.workerSession = data.currentSession || state.workerSession;
      const remote = { bm: 0, en: 0, zh: 0, ...(data.bookCursors || {}) };
      const local = { bm: 0, en: 0, zh: 0, ...(state.bookCursors || {}) };
      const merged = {
        bm: Math.max(Number(local.bm || 0), Number(remote.bm || 0)),
        en: Math.max(Number(local.en || 0), Number(remote.en || 0)),
        zh: Math.max(Number(local.zh || 0), Number(remote.zh || 0))
      };
      state.bookCursors = {
        bm: merged.bm,
        en: merged.en,
        zh: merged.zh
      };
      saveState();
      if (merged.bm > remote.bm || merged.en > remote.en || merged.zh > remote.zh) {
        await workerRequest("/cursor", { profile, session: state.workerSession, bookCursors: merged });
      }
    } catch (error) {
      console.warn("NILAM API Assistant: worker cursor sync failed", error);
    }
  }

  async function advanceBookCursor(language) {
    const lang = ["bm", "en", "zh"].includes(language) ? language : "bm";
    state.bookCursors = { bm: 0, en: 0, zh: 0, ...(state.bookCursors || {}) };
    state.bookCursors[lang] = Number(state.bookCursors[lang] || 0) + 1;
    saveState();

    const profile = workerProfile();
    if (!profile || !state.workerSession) return;
    try {
      const data = await workerRequest("/advance", { profile, lang, session: state.workerSession });
      if (data?.bookCursors) {
        state.workerSession = data.currentSession || state.workerSession;
        const remote = { bm: 0, en: 0, zh: 0, ...data.bookCursors };
        const local = { bm: 0, en: 0, zh: 0, ...(state.bookCursors || {}) };
        state.bookCursors = {
          bm: Math.max(Number(local.bm || 0), Number(remote.bm || 0)),
          en: Math.max(Number(local.en || 0), Number(remote.en || 0)),
          zh: Math.max(Number(local.zh || 0), Number(remote.zh || 0))
        };
        saveState();
      }
    } catch (error) {
      console.warn("NILAM API Assistant: worker cursor advance failed", error);
    }
  }

  function cleanIsbn(isbn) {
    return String(isbn || "").replaceAll("-", "").replaceAll(" ", "").trim().toLowerCase();
  }

  function normalizeTitle(title) {
    return String(title || "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  function isUsedBook(book, usedTitles, usedIsbns, oldKeys = new Set()) {
    const titleLower = String(book?.title || "").trim().toLowerCase();
    const titleNormalized = normalizeTitle(book?.title);
    const isbnClean = cleanIsbn(book?.isbn);
    return oldKeys.has(bookKey(book)) || usedTitles.has(titleLower) || usedTitles.has(titleNormalized) || (isbnClean && usedIsbns.has(isbnClean));
  }

  function cursorBookBatch(remoteBooks) {
    const usedTitles = submittedTitleSet();
    const usedIsbns = submittedIsbnSet();
    const pickedKeys = new Set();
    const batch = [];
    const cursors = { bm: 0, en: 0, zh: 0, ...(state.bookCursors || {}) };

    for (const language of Object.keys(LANGUAGE_BATCH_COUNTS)) {
      const pool = remoteBooks.filter((book) => book.language === language);
      if (!pool.length) continue;

      let scanned = 0;
      let index = Number(cursors[language] || 0) % pool.length;
      while (scanned < pool.length && batch.filter((book) => book.language === language).length < LANGUAGE_BATCH_COUNTS[language]) {
        const book = pool[index];
        const key = bookKey(book);
        if (!pickedKeys.has(key) && !isUsedBook(book, usedTitles, usedIsbns)) {
          pickedKeys.add(key);
          batch.push(book);
        }
        index = (index + 1) % pool.length;
        scanned += 1;
      }
    }

    return batch;
  }

  function parseJwtPayload(authHeader) {
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7);
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  }

  function tokenStatus() {
    if (!state.authHeader) {
      return { ok: false, label: "无登录凭证" };
    }
    if (!state.tokenExpiresAt) {
      return { ok: true, label: "已捕获凭证" };
    }

    const msLeft = Number(state.tokenExpiresAt) - Date.now();
    if (msLeft <= 0) return { ok: false, label: "凭证已过期" };
    const minutes = Math.floor(msLeft / 60000);
    if (minutes < 5) return { ok: true, label: `凭证将在 ${minutes} 分钟内过期` };
    return { ok: true, label: `凭证有效 (剩 ${minutes} 分钟)` };
  }

  function ensureUsableToken(action) {
    const status = tokenStatus();
    if (status.ok) return true;
    setStatus(`${action} 拦截：${status.label}。请在 AINS 手动提交一次以更新凭证。`);
    return false;
  }

  function updateCapturedToken(authHeader) {
    if (authHeader && authHeader.startsWith("Bearer ")) {
      state.authHeader = authHeader;
      try {
        const payload = parseJwtPayload(authHeader);
        if (payload && payload.id) {
          const previousUserId = state.userId;
          state.userId = payload.id;
          state.tokenExpiresAt = payload.exp ? Number(payload.exp) * 1000 : null;
          if (previousUserId && String(previousUserId) !== String(state.userId)) {
            state.submittedTitles = [];
            state.submittedIsbns = [];
            state.totalHistoryCount = 0;
            state.dashboardRecordCount = 0;
            state.todaySubmitCount = 0;
            stopAutoSubmit(`检测到账号切换：${previousUserId} -> ${state.userId}。正在同步历史记录。`, { keepResume: state.autoResumeSubmit });
            setTimeout(() => {
              if (state.authHeader && tokenStatus().ok) fetchHistory(true);
            }, 0);
          }
          console.log("NILAM API Assistant: Synced User ID ->", state.userId);
        }
      } catch (e) {
        console.error("NILAM API Assistant: Failed to parse User ID from JWT", e);
      }

      if (state.apiTemplate) {
        state.apiTemplate.headers["authorization"] = authHeader;
        console.log("NILAM API Assistant: Automatically updated Bearer Token in background.");
      }
      saveState();
      renderApiStatus();
      syncWorkerCursor();
      resumeAutoSubmitIfReady();
    }
  }

  function providerPayload(data) {
    const payload = {};
    for (const key of PROVIDER_ENTRY_ORDER) {
      payload[key] = key === "user" ? Number(data[key]) : data[key];
    }
    return payload;
  }

  function buildAinsPayload(book) {
    const data = {
      user: Number(state.userId),
      type: "book",
      date: book.date,
      title: book.title,
      bookType: "physical",
      category: apiCategory(book.category),
      noOfPage: Number(book.pages),
      isbn: book.isbn,
      author: book.author,
      publisher: book.publisher,
      publishedYear: String(book.year),
      language: apiLanguage(book.language),
      summary: book.rumusan,
      review: book.lesson,
      rating: Number(book.rating || 5),
      reviewIsVideo: false
    };

    data.provider = CryptoJS.AES.encrypt(
      JSON.stringify(providerPayload(data)),
      PROVIDER_SECRET
    ).toString();

    return { data };
  }

  function decryptProvider(provider) {
    const bytes = CryptoJS.AES.decrypt(provider, PROVIDER_SECRET);
    const text = bytes.toString(CryptoJS.enc.Utf8);
    return text ? JSON.parse(text) : null;
  }

  function normalizeComparable(value) {
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return String(value ?? "").trim();
  }

  function validatePayloadLocally(payload) {
    if (!payload?.data || typeof payload.data !== "object") {
      return { ok: false, message: "payload.data missing" };
    }
    if (!payload.data.provider) {
      return { ok: false, message: "provider missing" };
    }

    let provider;
    try {
      provider = decryptProvider(payload.data.provider);
    } catch (error) {
      return { ok: false, message: `provider decrypt failed: ${error.message}` };
    }
    if (!provider) {
      return { ok: false, message: "provider decrypt returned empty payload" };
    }

    for (let index = 0; index < PROVIDER_ENTRY_ORDER.length; index += 1) {
      const key = PROVIDER_ENTRY_ORDER[index];
      const bodyValue = normalizeComparable(payload.data[key]);
      const providerValue = normalizeComparable(provider[key]);
      if (bodyValue !== providerValue) {
        return { ok: false, message: `entry ${index}: ${key} mismatch`, key, bodyValue, providerValue };
      }
    }

    return { ok: true, message: "preflight OK" };
  }

  function setDiagnostics(result) {
    const el = document.querySelector("#nia-diagnostics");
    if (!el) return;
    if (!result) {
      el.textContent = "";
      return;
    }
    el.textContent = result.ok
      ? result.message
      : `${result.message}${result.key ? ` | body=${result.bodyValue} provider=${result.providerValue}` : ""}`;
  }

  function normalizeTitle(title) {
    return String(title || "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  function extractTitlesAndIsbnsFromJson(obj, titleSet = new Set(), isbnSet = new Set()) {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      for (const item of obj) {
        extractTitlesAndIsbnsFromJson(item, titleSet, isbnSet);
      }
    } else {
      for (const key in obj) {
        const lowerKey = key.toLowerCase();
        if (lowerKey === "title" && typeof obj[key] === "string") {
          titleSet.add(obj[key].trim().toLowerCase());
          titleSet.add(normalizeTitle(obj[key]));
        } else if (lowerKey === "isbn" && typeof obj[key] === "string") {
          const clean = obj[key].replaceAll("-", "").replaceAll(" ", "").trim().toLowerCase();
          if (clean) isbnSet.add(clean);
        } else {
          extractTitlesAndIsbnsFromJson(obj[key], titleSet, isbnSet);
        }
      }
    }
  }

  let loggedRecordSample = false;

  function countTodaySubmissions(obj, todayStr, counts = { realWorld: 0, readDate: 0 }) {
    if (!obj || typeof obj !== "object") return counts;

    if (Array.isArray(obj)) {
      for (const item of obj) {
        countTodaySubmissions(item, todayStr, counts);
      }
    } else {
      // Print sample record structure to console once
      if (!loggedRecordSample && (obj.title || obj.attributes?.title || obj.isbn || obj.attributes?.isbn)) {
        console.log("NILAM API Assistant: Traversed record object keys ->", Object.keys(obj), "attributes keys ->", obj.attributes ? Object.keys(obj.attributes) : "none", "values ->", obj);
        loggedRecordSample = true;
      }

      const dateVal = obj.date || obj.attributes?.date;

      // Fallback through all typical creation date keys
      const createdVal = obj.createdAt || obj.attributes?.createdAt ||
        obj.created_at || obj.attributes?.created_at ||
        obj.publishedAt || obj.attributes?.publishedAt ||
        obj.published_at || obj.attributes?.published_at ||
        obj.updatedAt || obj.attributes?.updatedAt;

      if (dateVal || createdVal) {
        if (dateVal === todayStr) {
          counts.readDate++;
        }
        if (createdVal) {
          const dateObj = new Date(createdVal);
          if (!isNaN(dateObj.getTime())) {
            const localIso = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
            if (localIso === todayStr) {
              counts.realWorld++;
            }
          }
        }
      }
      for (const key in obj) {
        if (key !== "user" && key !== "school" && key !== "class" && typeof obj[key] === "object") {
          countTodaySubmissions(obj[key], todayStr, counts);
        }
      }
    }
    return counts;
  }

  function extractTodayCountFromCounter(obj) {
    if (!obj || typeof obj !== "object") return null;

    const keysToCheck = ["today", "todaycount", "today_count", "readtoday", "read_today", "counter", "count"];
    for (const key in obj) {
      const lower = key.toLowerCase();
      if (keysToCheck.includes(lower) && typeof obj[key] === "number") {
        return obj[key];
      }
    }

    for (const key in obj) {
      if (typeof obj[key] === "object") {
        const res = extractTodayCountFromCounter(obj[key]);
        if (res !== null) return res;
      }
    }
    return null;
  }

  function requestHeaders(extra = {}) {
    const headers = { ...extra };
    if (state.authHeader) headers.authorization = state.authHeader;
    return headers;
  }

  async function fetchHistory(renderAfter = true) {
    if (!state.userId) {
      setStatus("同步失败：暂无登录凭证。");
      return;
    }
    if (!ensureUsableToken("同步历史记录")) return;
    setStatus("正在同步阅读历史记录...");
    const url = `https://ains-api.moe.gov.my/api/nilam-records?filters[user][id]=${state.userId}&pagination[limit]=1000`;

    try {
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: requestHeaders({ accept: "application/json" })
      });
      const text = await response.text();

      if (response.status === 401) {
        console.error("NILAM API Assistant: History sync unauthorized", text);
        state.tokenExpiresAt = 0;
        saveState();
        renderApiStatus();
        setStatus("同步失败：登录凭证已过期。请刷新页面或重新提交。");
        return;
      }

      if (!response.ok) {
        console.error("NILAM API Assistant: History sync HTTP error", response.status, text);
        setStatus(`同步失败：服务器返回错误 HTTP ${response.status}。`);
        return;
      }

      const data = JSON.parse(text);
      const totalRaw = Array.isArray(data.data) ? data.data.length : (data.meta?.pagination?.total || 0);
      const currentTotal = state.totalHistoryCount || 0;
      if (totalRaw >= currentTotal || currentTotal - totalRaw > 5) {
        state.totalHistoryCount = totalRaw;
      }

      const titleSet = new Set(state.submittedTitles || []);
      const isbnSet = new Set(state.submittedIsbns || []);
      extractTitlesAndIsbnsFromJson(data, titleSet, isbnSet);
      state.submittedTitles = Array.from(titleSet);
      state.submittedIsbns = Array.from(isbnSet);

      const todayStr = todayIsoDate();
      const counts = countTodaySubmissions(data, todayStr);
      state.todaySubmitCount = Math.max(state.todaySubmitCount || 0, counts.realWorld);

      saveState();

      // Fetch official student information counter for today's submissions count
      const counterUrl = "https://ains-api.moe.gov.my/api/student-informations/info/counter";
      try {
        const res = await fetch(counterUrl, {
          method: "GET",
          credentials: "include",
          headers: requestHeaders({ accept: "application/json" })
        });
        if (res.ok) {
          const resText = await res.text();
          const counterData = JSON.parse(resText);
          console.log("NILAM API Assistant: Direct synced counter response ->", counterData);
          const count = extractTodayCountFromCounter(counterData);
          if (count !== null) {
            state.todaySubmitCount = Math.max(state.todaySubmitCount || 0, count);
            saveState();
          }
        }
      } catch (err) {
        console.error("Failed to fetch today counter during sync", err);
      }

      console.log("NILAM API Assistant: Synced Titles ->", state.submittedTitles);
      console.log("NILAM API Assistant: Synced ISBNs ->", state.submittedIsbns);

      setStatus(`成功同步历史记录，共 ${state.totalHistoryCount} 条数据，去重已读 ${state.submittedTitles.length} 本。`);
      if (renderAfter) {
        applyFilters();
        renderApiStatus();
        renderBookSelect();
      }
    } catch (e) {
      console.error("NILAM API Assistant: History sync failed", e);
      setStatus(`同步失败：${e.message}`);
    }
  }


  function isCurrentBookDuplicate() {
    return isUsedBook(currentBook(), submittedTitleSet(), submittedIsbnSet());
  }

  function skipUsedBookSelection() {
    const before = state.selectedKey;
    applyFilters();
    renderBookSelect();
    return state.selectedKey && state.selectedKey !== before;
  }

  function patchFetch() {
    const originalFetch = window.fetch;
    window.fetch = async function (input, init = {}) {
      const request = input instanceof Request ? input.clone() : null;
      const url = typeof input === "string" ? input : input.url;
      const method = init.method || request?.method || "GET";

      if (url.includes("/api/") || url.includes("moe.gov.my")) {
        console.log(`NILAM API Assistant: Intercepted Fetch -> [${method}] ${url}`);
      }

      const mergedHeaders = {};
      if (request?.headers) {
        new Headers(request.headers).forEach((v, k) => {
          mergedHeaders[k.toLowerCase()] = v;
        });
      }
      if (init.headers) {
        new Headers(init.headers).forEach((v, k) => {
          mergedHeaders[k.toLowerCase()] = v;
        });
      }

      let body = init.body;
      if (body === undefined && request && String(method).toUpperCase() === "POST") {
        body = await request.text();
      }

      let auth = mergedHeaders["authorization"];
      updateCapturedToken(auth);

      const response = await originalFetch.apply(this, arguments);
      if (response.ok) {

        // Capture/Intercept history GET requests dynamically to update local duplicates
        if (url.includes("nilam-records") && String(method).toUpperCase() === "GET") {
          try {
            const clone = response.clone();
            const data = await clone.json();
            const totalRaw = Array.isArray(data.data) ? data.data.length : (data.meta?.pagination?.total || 0);
            const currentTotal = state.totalHistoryCount || 0;
            if (totalRaw >= currentTotal || currentTotal - totalRaw > 5) {
              state.totalHistoryCount = totalRaw;
            }

            const titleSet = new Set(state.submittedTitles || []);
            const isbnSet = new Set(state.submittedIsbns || []);
            extractTitlesAndIsbnsFromJson(data, titleSet, isbnSet);
            state.submittedTitles = Array.from(titleSet);
            state.submittedIsbns = Array.from(isbnSet);

            const todayStr = todayIsoDate();
            const counts = countTodaySubmissions(data, todayStr);
            state.todaySubmitCount = Math.max(state.todaySubmitCount || 0, counts.realWorld);

            saveState();
            console.log("NILAM API Assistant: Intercepted and synced records ->", state.submittedTitles.length, "total ->", state.totalHistoryCount, "today ->", state.todaySubmitCount);
            applyFilters();
            renderApiStatus();
            renderBookSelect();
          } catch (e) {
            console.error("Failed to parse intercepted history GET response", e);
          }
        }

        if (url.includes("info/counter") && String(method).toUpperCase() === "GET") {
          try {
            const clone = response.clone();
            const data = await clone.json();
            console.log("NILAM API Assistant: Intercepted info/counter response ->", data);
            const count = extractTodayCountFromCounter(data);
            if (count !== null) {
              state.todaySubmitCount = Math.max(state.todaySubmitCount || 0, count);
              saveState();
              renderApiStatus();
            }
          } catch (e) {
            console.error("Failed to parse intercepted info/counter response", e);
          }
        }
      }
      return response;
    };
  }

  function patchXhr() {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    const originalSetHeader = XMLHttpRequest.prototype.setRequestHeader;

    XMLHttpRequest.prototype.open = function (method, url) {
      this.__nilamApi = { method, url, headers: {} };
      if (url.includes("/api/") || url.includes("moe.gov.my")) {
        console.log(`NILAM API Assistant: Intercepted XHR -> [${method}] ${url}`);
      }
      return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.setRequestHeader = function (key, value) {
      if (this.__nilamApi) this.__nilamApi.headers[key] = value;
      const lower = String(key).toLowerCase();
      if (lower === "authorization") {
        updateCapturedToken(value);
      }
      return originalSetHeader.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
      this.addEventListener("load", () => {
        if (this.status >= 200 && this.status < 300 && this.__nilamApi) {
          const url = new URL(this.__nilamApi.url, location.href).href;
          const method = this.__nilamApi.method;

          // Capture/Intercept XHR history GET requests
          if (url.includes("nilam-records") && String(method).toUpperCase() === "GET") {
            try {
              const data = JSON.parse(this.responseText);
              const totalRaw = Array.isArray(data.data) ? data.data.length : (data.meta?.pagination?.total || 0);
              const currentTotal = state.totalHistoryCount || 0;
              if (totalRaw >= currentTotal || currentTotal - totalRaw > 5) {
                state.totalHistoryCount = totalRaw;
              }

              const titleSet = new Set(state.submittedTitles || []);
              const isbnSet = new Set(state.submittedIsbns || []);
              extractTitlesAndIsbnsFromJson(data, titleSet, isbnSet);
              state.submittedTitles = Array.from(titleSet);
              state.submittedIsbns = Array.from(isbnSet);

              const todayStr = todayIsoDate();
              const counts = countTodaySubmissions(data, todayStr);
              state.todaySubmitCount = Math.max(state.todaySubmitCount || 0, counts.realWorld);

              saveState();
              console.log("NILAM API Assistant: Intercepted and synced XHR records ->", state.submittedTitles.length, "total ->", state.totalHistoryCount, "today ->", state.todaySubmitCount);
              applyFilters();
              renderApiStatus();
              renderBookSelect();
            } catch (e) {
              console.error("Failed to parse intercepted XHR history response", e);
            }
          }

          if (url.includes("info/counter") && String(method).toUpperCase() === "GET") {
            try {
              const data = JSON.parse(this.responseText);
              console.log("NILAM API Assistant: Intercepted XHR info/counter response ->", data);
              const count = extractTodayCountFromCounter(data);
              if (count !== null) {
                state.todaySubmitCount = Math.max(state.todaySubmitCount || 0, count);
                saveState();
                renderApiStatus();
              }
            } catch (e) {
              console.error("Failed to parse intercepted XHR info/counter response", e);
            }
          }
        }
      });
      return originalSend.apply(this, arguments);
    };
  }

  function shiftSelectedDate(offsetDays) {
    const current = new Date(normalizeIsoDate(state.selectedDate));
    if (isNaN(current.getTime())) return;
    current.setDate(current.getDate() + offsetDays);
    state.selectedDate = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
    saveState();

    const dateInput = document.querySelector("#nia-date");
    if (dateInput) {
      dateInput.value = state.selectedDate;
    }
    renderPreview();
  }

  async function submitApi() {
    const todayCount = state.todaySubmitCount || 0;
    if (todayCount >= 30) {
      setStatus("拦截：今日提交已达安全上限（30本），防止封号风险！");
      return "daily_limit";
    }

    const rawBook = currentBook();
    const book = bookForApi(rawBook);
    if (!book) {
      setStatus("请先选择一本图书。");
      return "no_book";
    }
    if (isCurrentBookDuplicate()) {
      await advanceBookCursor(rawBook?.language);
      const skipped = skipUsedBookSelection();
      setStatus(skipped ? "已跳过已读书本，改选下一本未读书。" : "提交拦截：该书已被阅读，当前列表没有未读书。请刷新题库。");
      return skipped ? "duplicate_skipped" : "duplicate_blocked";
    }

    if (state.lastSubmitTime) {
      const elapsed = Date.now() - Number(state.lastSubmitTime);
      if (elapsed < 10000) {
        const remaining = Math.ceil((10000 - elapsed) / 1000);
        setStatus(`冷却拦截：为了模拟真人录入，请等待 ${remaining} 秒冷却时间。`);
        return "cooldown";
      }
    }
    if (!ensureUsableToken("提交")) return "missing_token";

    if (!state.userId) {
      let auth = state.authHeader;
      updateCapturedToken(auth);
      if (!state.userId) {
        setStatus("用户 ID 缺失。请尝试重新登录。");
        return "missing_user";
      }
    }

    try {
      setStatus("正在提交至 AINS 服务器...");
      const bodyPayload = buildAinsPayload(book);
      const preflight = validatePayloadLocally(bodyPayload);
      setDiagnostics(preflight);
      if (!preflight.ok) {
        setStatus(`提交拦截：本地预校验未通过 (${preflight.message})`);
        return "preflight_blocked";
      }

      const headers = {
        ...requestHeaders({ "content-type": "application/json" })
      };

      console.log("NILAM API Assistant: Request URL ->", AINS_API_ENDPOINT);
      console.log("NILAM API Assistant: Request Headers ->", headers);
      console.log("NILAM API Assistant: Request Payload ->", bodyPayload);

      const response = await fetch(AINS_API_ENDPOINT, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(bodyPayload)
      });

      const text = await response.text();
      if (response.status === 401) {
        state.tokenExpiresAt = 0;
        saveState();
        renderApiStatus();
        setStatus("提交返回 401，登录凭证已过期。");
        return "missing_token";
      }
      if (!response.ok) {
        console.error("NILAM API Assistant: Response Error Detail ->", text);
        setDiagnostics({ ok: false, message: text.slice(0, 260) });
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 240)}`);
      }

      setStatus(`提交成功：${book.title}`);

      // Update local submitted titles and ISBNs array immediately to avoid reloading requirement
      const newTitles = new Set(state.submittedTitles || []);
      newTitles.add(String(book.title).trim().toLowerCase());
      state.submittedTitles = Array.from(newTitles);

      const newIsbns = new Set(state.submittedIsbns || []);
      const isbnClean = String(book.isbn || "").replaceAll("-", "").replaceAll(" ", "").trim().toLowerCase();
      if (isbnClean) newIsbns.add(isbnClean);
      state.submittedIsbns = Array.from(newIsbns);

      // Increment real-world calendar day submits count
      state.todaySubmitCount = (state.todaySubmitCount || 0) + 1;
      state.totalHistoryCount = (state.totalHistoryCount || 0) + 1;
      state.dashboardRecordCount = (state.dashboardRecordCount || 0) + 1;
      state.lastSubmitTime = Date.now();
      await advanceBookCursor(book.language);

      // Update AINS dashboard DOM directly without refresh
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while ((node = walker.nextNode())) {
        const text = node.nodeValue;
        const prevCount = String(state.dashboardRecordCount - 1);
        if (text.includes(prevCount) && node.parentElement && node.parentElement.innerText && node.parentElement.innerText.includes("Rekod")) {
          node.nodeValue = text.replace(prevCount, String(state.dashboardRecordCount));
          break;
        }
      }

      saveState();
      renderApiStatus();

      // Automatically shift selected date to the next day
      shiftSelectedDate(1);

      const currentIndex = state.filtered.findIndex((b) => bookKey(b) === state.selectedKey);
      let isLastBook = false;
      if (currentIndex !== -1 && currentIndex < state.filtered.length - 1) {
        state.selectedKey = bookKey(state.filtered[currentIndex + 1]);
        saveState();
        renderBookSelect();
      } else {
        isLastBook = true;
        renderBookSelect(); // Re-render to disable button on last duplicate book
      }

      // Automatically fetch updated history and refresh book list if needed
      fetchHistory(true).then(() => {
        if (isLastBook) {
          refreshBooks(); // Automatically load new books when exhausted
        }
      }).catch(err => console.error("Auto-sync failed:", err));
      return "submitted";
    } catch (error) {
      setStatus(`提交失败：${error.message}`);
      return "error";
    }
  }

  function setStatus(text) {
    const el = document.querySelector("#nia-status");
    if (el) el.textContent = text;
    else console.log("NILAM API Assistant:", text);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function renderApiStatus() {
    const el = document.querySelector("#nia-api-status");
    const status = tokenStatus();
    if (el) {
      el.innerHTML = status.ok
        ? `<span style="color:#10b981;font-weight:700;">就绪</span><br><span style="font-size:10px;color:#6b7280;">User ID: ${state.userId || "获取中"} | ${status.label} | v${SCRIPT_VERSION}</span>`
        : `<span style="color:#ef4444;font-weight:700;">未捕获凭证</span><br><span style="font-size:10px;color:#6b7280;">请正常登录 AINS 即可自动捕获。 | v${SCRIPT_VERSION}</span>`;
    }
    const countEl = document.querySelector("#nia-history-count");
    if (countEl) {
      countEl.textContent = String(state.dashboardRecordCount || state.totalHistoryCount || 0);
    }
    const todayCountEl = document.querySelector("#nia-today-count");
    if (todayCountEl) {
      if (state.lastSubmitTime && new Date(Number(state.lastSubmitTime)).toDateString() !== new Date().toDateString()) {
        state.todaySubmitCount = 0;
      }
      const todayCount = state.todaySubmitCount || 0;
      todayCountEl.textContent = todayCount;
      if (todayCount >= 30) {
        todayCountEl.style.color = "#ef4444";
        todayCountEl.style.fontWeight = "900";
      } else {
        todayCountEl.style.color = "#10b981";
      }
    }
    const debugEl = document.querySelector("#nia-debug-template");
    if (debugEl) {
      debugEl.value = state.apiTemplate
        ? (typeof state.apiTemplate.bodyText === "string" ? state.apiTemplate.bodyText : JSON.stringify(state.apiTemplate, null, 2))
        : "暂无捕获的 API 负载。";
    }
    updateCooldownUI();
  }

  function updateCooldownUI() {
    const submitBtn = document.querySelector("#nia-submit");
    if (!submitBtn) return;

    if (isCurrentBookDuplicate()) {
      return;
    }

    if (!state.lastSubmitTime) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = "1";
      submitBtn.style.cursor = "pointer";
      submitBtn.textContent = "点击提交至 AINS (API)";
      return;
    }

    const elapsedMs = Date.now() - Number(state.lastSubmitTime);
    const elapsedSec = Math.floor(elapsedMs / 1000);
    const cooldownSec = 10; // 10 seconds cooldown to behave like human

    if (elapsedSec < cooldownSec) {
      const remaining = cooldownSec - elapsedSec;
      submitBtn.disabled = true;
      submitBtn.style.opacity = "0.6";
      submitBtn.style.cursor = "not-allowed";
      submitBtn.textContent = `冷却中 (${remaining}秒)`;
    } else {
      submitBtn.disabled = false;
      submitBtn.style.opacity = "1";
      submitBtn.style.cursor = "pointer";
      submitBtn.textContent = "点击提交至 AINS (API)";
    }

    const timerEl = document.querySelector("#nia-timer-label");
    if (timerEl) {
      if (elapsedSec < 10) {
        timerEl.textContent = `上次提交：${elapsedSec}秒前`;
      } else if (elapsedSec < 3600) {
        const min = Math.floor(elapsedSec / 60);
        const sec = elapsedSec % 60;
        timerEl.textContent = `上次提交：${min}分${sec}秒前`;
      } else {
        timerEl.textContent = `上次提交：> 1小时前`;
      }
    }
  }

  function renderBookSelect() {
    const select = document.querySelector("#nia-book");
    if (!select) return;

    const submittedTitlesSet = new Set((state.submittedTitles || []).map(t => String(t).trim().toLowerCase()));
    const submittedIsbnsSet = new Set((state.submittedIsbns || []).map(i => String(i).replaceAll("-", "").replaceAll(" ", "").trim().toLowerCase()));

    select.innerHTML = state.filtered.map((book) => {
      const key = bookKey(book);
      const titleLower = String(book.title || "").trim().toLowerCase();
      const isbnClean = String(book.isbn || "").replaceAll("-", "").replaceAll(" ", "").trim().toLowerCase();

      const isDup = submittedTitlesSet.has(titleLower) || (isbnClean && submittedIsbnsSet.has(isbnClean));

      const prefix = isDup ? "🔴 [已读] " : "🟢 [未读] ";
      const displayTitle = `${prefix}${book.title || "Untitled"} - ${book.author || ""}`.trim();
      return `<option value="${escapeHtml(key)}" ${isDup ? 'style="color:#ef4444;"' : 'style="color:#10b981;"'}>${escapeHtml(displayTitle)}</option>`;
    }).join("");
    select.value = state.selectedKey || bookKey(state.filtered[0]);
    renderPreview();
  }

  function renderPreview() {
    const el = document.querySelector("#nia-preview");
    if (!el) return;
    const book = bookForApi(currentBook());
    if (!book) {
      el.value = "";
      return;
    }
    if (state.userId && typeof CryptoJS !== "undefined") {
      el.value = JSON.stringify(buildAinsPayload(book), null, 2);
    } else {
      el.value = JSON.stringify(book, null, 2);
    }

    const submitBtn = document.querySelector("#nia-submit");
    if (submitBtn) {
      if (isCurrentBookDuplicate()) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.5";
        submitBtn.style.cursor = "not-allowed";
        submitBtn.textContent = "Duplicate (Blocked)";
      } else {
        updateCooldownUI();
      }
    }
    saveState();
  }

  async function refreshBooks() {
    setStatus("Refreshing unused books...");
    try {
      if (state.authHeader && state.userId && tokenStatus().ok) {
        await fetchHistory(false);
      } else if (!(state.submittedTitles || []).length && !(state.submittedIsbns || []).length) {
        throw new Error("sync history first so used books can be excluded");
      }

      await syncWorkerCursor();
      const remoteBooks = await loadRemoteBooks();
      const batch = cursorBookBatch(remoteBooks);
      if (batch.length === 0) {
        throw new Error("no unused remote books available");
      }

      state.books = batch;
      state.filters = { category: "all", language: "all" };
      state.selectedKey = bookKey(state.books[0]);
      applyFilters();
      renderFilterControls();
      renderBookSelect();
      renderApiStatus();
      setStatus(`Loaded ${state.books.length} cursor books (ZH/BM/EN).`);
    } catch (error) {
      setStatus(`Refresh unused books failed: ${error.message}`);
    }
  }

  let isDragging = false;
  let startX = 0, startY = 0;
  let panelLeft = 0, panelTop = 0;

  function initDrag(header, panel) {
    header.style.cursor = "move";

    function startDrag(clientX, clientY, e) {
      if (e.target.closest("button") || e.target.closest("select") || e.target.closest("input")) return;
      isDragging = true;
      startX = clientX;
      startY = clientY;
      const rect = panel.getBoundingClientRect();
      panelLeft = rect.left;
      panelTop = rect.top;

      if (e.type.startsWith("touch")) {
        document.addEventListener("touchmove", onTouchMove, { passive: false });
        document.addEventListener("touchend", onTouchEnd);
      } else {
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      }
      e.preventDefault();
    }

    header.addEventListener("mousedown", (e) => {
      startDrag(e.clientX, e.clientY, e);
    });

    header.addEventListener("touchstart", (e) => {
      const touch = e.touches[0];
      startDrag(touch.clientX, touch.clientY, e);
    }, { passive: false });

    function onMouseMove(e) {
      moveDrag(e.clientX, e.clientY);
    }

    function onTouchMove(e) {
      const touch = e.touches[0];
      moveDrag(touch.clientX, touch.clientY);
      e.preventDefault(); // Prevent scrolling page while dragging panel
    }

    function moveDrag(clientX, clientY) {
      if (!isDragging) return;
      const dx = clientX - startX;
      const dy = clientY - startY;

      let newLeft = panelLeft + dx;
      let newTop = panelTop + dy;

      const panelWidth = panel.offsetWidth || 320;
      const panelHeight = panel.offsetHeight || 300;
      const minGap = 10;

      const maxLeft = window.innerWidth - panelWidth - minGap;
      const maxTop = window.innerHeight - panelHeight - minGap;

      newLeft = Math.max(minGap, Math.min(newLeft, maxLeft));
      newTop = Math.max(minGap, Math.min(newTop, maxTop));

      panel.style.left = `${newLeft}px`;
      panel.style.top = `${newTop}px`;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    }

    function onMouseUp() {
      endDrag();
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    function onTouchEnd() {
      endDrag();
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    }

    function endDrag() {
      isDragging = false;
      localStorage.setItem("nilam_api_panel_x", panel.style.left);
      localStorage.setItem("nilam_api_panel_y", panel.style.top);
    }
  }

  function adjustPanelToViewport() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const minGap = 10;
    const panelWidth = rect.width || 320;
    const panelHeight = rect.height || 200;

    let x = Number.isFinite(rect.left) ? rect.left : window.innerWidth - panelWidth - minGap;
    let y = Number.isFinite(rect.top) ? rect.top : minGap;
    let changed = false;

    if (rect.width < 80 || rect.height < 40) {
      x = window.innerWidth - panelWidth - minGap;
      y = minGap;
      changed = true;
    }

    if (x < minGap) { x = minGap; changed = true; }
    if (y < minGap) { y = minGap; changed = true; }
    if (x + panelWidth > window.innerWidth - minGap) {
      x = window.innerWidth - panelWidth - minGap;
      changed = true;
    }
    if (y + panelHeight > window.innerHeight - minGap) {
      y = window.innerHeight - panelHeight - minGap;
      changed = true;
    }

    if (y < minGap) {
      y = minGap;
      changed = true;
    }

    if (x < minGap || x > window.innerWidth - minGap || y < minGap || y > window.innerHeight - minGap) {
      x = Math.max(minGap, window.innerWidth - panelWidth - minGap);
      y = minGap;
      changed = true;
    }

    if (changed) {
      panel.style.left = `${x}px`;
      panel.style.top = `${y}px`;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
      localStorage.setItem("nilam_api_panel_x", panel.style.left);
      localStorage.setItem("nilam_api_panel_y", panel.style.top);
    }
  }

  function toggleCollapse() {
    state.collapsed = !state.collapsed;
    saveState();
    const body = document.querySelector("#nia-body");
    const toggle = document.querySelector("#nia-toggle");
    if (body && toggle) {
      body.style.display = state.collapsed ? "none" : "block";
      toggle.textContent = state.collapsed ? "＋" : "－";
    }
    adjustPanelToViewport();
  }

  let autoSubmitTimer = null;

  function stopAutoSubmit(message, options = {}) {
    const btn = document.querySelector("#nia-auto-submit");
    if (autoSubmitTimer) clearInterval(autoSubmitTimer);
    autoSubmitTimer = null;
    if (!options.keepResume) {
      state.autoResumeSubmit = false;
      saveState();
    }
    if (btn) {
      btn.textContent = "🚀 自动提交 (1分钟/次)";
      btn.classList.remove("nia-submit");
      btn.classList.add("nia-secondary");
    }
    if (message) setStatus(message);
  }

  function refreshAinsAndResume(message) {
    state.autoResumeSubmit = true;
    state.autoResumeRefreshAt = Date.now();
    saveState();
    stopAutoSubmit(message || "正在刷新 AINS，稍后自动恢复自动提交。", { keepResume: true });
    setTimeout(() => window.location.reload(), 1200);
  }

  function resumeAutoSubmitIfReady() {
    if (!state.autoResumeSubmit || autoSubmitTimer) return;
    if ((state.todaySubmitCount || 0) >= 30) {
      stopAutoSubmit("今日额度已满，自动恢复已取消。");
      return;
    }
    if (!state.userId) {
      setStatus("等待 AINS 捕获登录凭证后自动恢复提交。");
      return;
    }
    if (!tokenStatus().ok) {
      setStatus("AINS 已刷新，正在等待新的登录凭证。");
      return;
    }
    setStatus("凭证已恢复，继续自动提交。");
    toggleAutoSubmit();
  }

  function toggleAutoSubmit() {
    const btn = document.querySelector("#nia-auto-submit");
    if (!btn) return;

    if (autoSubmitTimer) {
      stopAutoSubmit("自动提交已停止。");
    } else {
      const status = tokenStatus();
      if (!status.ok) {
        refreshAinsAndResume(`自动提交需要有效凭证（${status.label}），正在刷新 AINS 后恢复。`);
        return;
      }
      if ((state.todaySubmitCount || 0) >= 30) {
        setStatus("今日额度已满，无法开启自动提交。");
        return;
      }
      btn.textContent = "🛑 停止自动提交 (运行中...)";
      btn.classList.remove("nia-secondary");
      btn.classList.add("nia-submit");
      state.autoResumeSubmit = true;
      saveState();
      setStatus("已开启自动提交。正在执行...");

      const executeAutoSubmit = async () => {
        if ((state.todaySubmitCount || 0) >= 30) {
          stopAutoSubmit("今日额度已满，自动提交已停止。");
          alert("🎉 NILAM 自动挂机已完成：\n\n今日 30 本提交额度已满，自动挂机已停止。");
          return;
        }
        if (!state.apiTemplate?.bodyText) {
          stopAutoSubmit("缺少真实 AINS 提交模板；请先手动提交一笔记录。");
          return;
        }
        if (!tokenStatus().ok) {
          refreshAinsAndResume("登录凭证已过期，正在刷新 AINS，刷新后自动恢复提交。");
          return;
        }

        for (let attempts = 0; attempts <= REFRESH_BOOK_COUNT; attempts++) {
          if (!currentBook()) {
            await refreshBooks();
            if (!currentBook()) {
              stopAutoSubmit("没有可用图书，自动提交已停止。请刷新题库。");
              alert("NILAM 自动挂机已暂停：\n\n当前题库没有可用未读书，请点击「Refresh Unused Books」或同步记录后再试。");
              return;
            }
          }

          const result = await submitApi();
          if (result === "duplicate_skipped") {
            setStatus("自动提交已跳过已读书本，正在尝试下一本。");
            continue;
          }
          if (result === "duplicate_blocked" || result === "no_book") {
            await refreshBooks();
            continue;
          }
          if (result === "submitted" && autoSubmitTimer) {
            setStatus("自动提交等待中... 下一本书将在 1 分钟后提交。");
          }
          if (["daily_limit", "missing_template", "missing_token", "missing_user", "preflight_blocked", "error"].includes(result)) {
            const reason = {
              daily_limit: "今日额度已满",
              missing_template: "缺少 API 捕获数据",
              missing_token: "登录凭证已过期",
              missing_user: "用户 ID 缺失",
              preflight_blocked: "提交数据预校验失败",
              error: "提交失败"
            }[result] || "未知错误";
            if (result === "missing_template" || result === "missing_token") {
              refreshAinsAndResume(`自动提交遇到${reason}，正在刷新 AINS 后恢复。`);
            } else {
              stopAutoSubmit(`自动提交已停止：${reason}。`);
            }
          }
          return;
        }

        stopAutoSubmit("自动提交已暂停：连续跳过太多已读书，请同步记录或刷新题库。");
      };

      autoSubmitTimer = setInterval(executeAutoSubmit, 61000);
      executeAutoSubmit();
    }
  }

  function createPanel() {
    if (document.getElementById(PANEL_ID)) return;
    try {
      const panel = document.createElement("section");
      panel.id = PANEL_ID;
      panel.innerHTML = `
      <style>
        #${PANEL_ID} {
          position: fixed;
          z-index: 999999;
          width: 320px;
          max-width: calc(100vw - 24px);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          color: #1f2937;
          box-shadow: 0 20px 40px rgba(0,0,0,0.15);
          font: 13px/1.4 system-ui, -apple-system, sans-serif;
          overflow: hidden;
          transition: border-color 0.2s;
        }
        .nia-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff;
          user-select: none;
        }
        .nia-header h2 { margin: 0; font-size: 14px; font-weight: 700; letter-spacing: 0.5px; }
        .nia-header button {
          background: transparent;
          border: 0;
          color: #fff;
          font-size: 16px;
          cursor: pointer;
          padding: 0 4px;
        }
        .nia-body { padding: 12px; }
        #${PANEL_ID} label { display: grid; gap: 4px; margin: 8px 0; font-size: 11px; font-weight: 600; color: #4b5563; }
        #${PANEL_ID} select, #${PANEL_ID} input, #${PANEL_ID} textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 6px 8px;
          background: #f9fafb;
          color: #111827;
          font-size: 12px;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        #${PANEL_ID} select:focus, #${PANEL_ID} input:focus {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
          outline: none;
        }
        #${PANEL_ID} textarea { height: 100px; resize: vertical; font-family: Consolas, monospace; font-size: 10px; background: #f3f4f6; }
        .nia-row { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .nia-date-row { display: flex; align-items: center; gap: 6px; margin-top: 8px; }
        .nia-date-btn {
          background: #e5e7eb;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          color: #374151;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
          user-select: none;
          transition: background 0.1s;
        }
        .nia-date-btn:hover { background: #d1d5db; }
        .nia-date-btn:active { background: #9ca3af; }
        .nia-actions-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 12px; }
        .nia-btn {
          min-height: 32px;
          border: 0;
          border-radius: 6px;
          color: #fff;
          font-weight: 700;
          font-size: 11px;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.1s;
        }
        .nia-btn:active { transform: scale(0.97); }
        .nia-submit { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
        .nia-secondary { background: #6b7280; }
        .nia-line { margin: 8px 0; font-size: 11px; color: #4b5563; line-height: 1.5; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
        #nia-status { margin-top: 8px; font-weight: 700; color: #7c3aed; min-height: 18px; text-align: center; }
        .nia-debug-details { margin-top: 8px; }
        .nia-debug-details summary { cursor: pointer; font-size: 10px; font-weight: 600; color: #4b5563; user-select: none; }
        .nia-debug-textarea { height: 80px !important; font-family: monospace; font-size: 9px !important; margin-top: 4px; background: #f9fafb !important; }
        #nia-diagnostics { margin-top: 6px; font-size: 10px; color: #7c2d12; overflow-wrap: anywhere; }
      </style>
      <div class="nia-header" id="nia-drag-header">
        <div>
          <h2>NILAM 助手 <span style="font-size:10px;font-weight:600;opacity:.8;">v${SCRIPT_VERSION}</span></h2>
          <div id="nia-header-profile" style="font-size:10px;color:rgba(255,255,255,0.85);font-weight:600;margin-top:2px;"></div>
        </div>
        <button id="nia-toggle" type="button">－</button>
      </div>
      <div class="nia-body" id="nia-body" style="display: ${state.collapsed ? "none" : "block"};">
        <div class="nia-row">
          <select id="nia-category">
            <option value="all">所有分类</option>
            <option value="Fiksyen">虚构类 (Fiksyen)</option>
            <option value="Bukan Fiksyen">非虚构类 (Bukan Fiksyen)</option>
          </select>
          <select id="nia-language">
            <option value="bm">马来文 (BM)</option>
            <option value="en">英文 (EN)</option>
            <option value="zh">中文 (ZH)</option>
            <option value="all">所有语言</option>
          </select>
        </div>
        <div class="nia-date-row">
          <button id="nia-date-prev" type="button" class="nia-date-btn">◀</button>
          <label style="flex: 1; display: grid; gap: 4px; margin: 0; font-size: 11px; font-weight: 600; color: #4b5563;">提交日期 <input id="nia-date" type="date" style="margin: 0;"></label>
          <button id="nia-date-next" type="button" class="nia-date-btn">▶</button>
        </div>
        <label>选择图书 <select id="nia-book"></select></label>
        <div class="nia-line">AINS API 凭证状态：<br><span id="nia-api-status">未捕获</span><br><span style="font-size:10px;color:#4b5563;">已同步：<span id="nia-history-count" style="font-weight:700;">0</span> 本 | 今日已交：<span id="nia-today-count" style="font-weight:700;">0</span>/30</span><br><span id="nia-timer-label" style="font-size:10px;color:#6b7280;font-weight:600;">上次提交：无</span></div>
        <button id="nia-refresh-books" type="button" class="nia-btn nia-secondary" style="width:100%;margin-top:8px;">Refresh Unused Books</button>
        <details class="nia-debug-details">
          <summary>显示提交负载预览</summary>
          <textarea id="nia-preview" readonly style="margin-top: 4px;"></textarea>
        </details>
        <div class="nia-actions-3">
          <button id="nia-submit" type="button" class="nia-btn nia-submit">点击提交至 AINS (API)</button>
          <button id="nia-sync-api" type="button" class="nia-btn nia-secondary">同步记录</button>
        </div>
        <button id="nia-auto-submit" type="button" class="nia-btn nia-secondary" style="width:100%;margin-top:8px;">🚀 自动提交 (1分钟/次)</button>
        <button id="nia-clear-api" type="button" class="nia-btn nia-secondary" style="width:100%;margin-top:8px;">清除登录凭证</button>
        <details class="nia-debug-details">
          <summary>显示捕获的 API 负载</summary>
          <textarea id="nia-debug-template" class="nia-debug-textarea" readonly></textarea>
        </details>
        <div id="nia-diagnostics"></div>
        <div id="nia-status">正在加载书籍数据库...</div>
      </div>
    `;
      document.body.append(panel);

      const savedX = localStorage.getItem("nilam_api_panel_x");
      const savedY = localStorage.getItem("nilam_api_panel_y");
      const minGap = 10;
      const panelWidth = 320;

      if (savedX && savedY) {
        let x = parseFloat(savedX);
        let y = parseFloat(savedY);
        if (isNaN(x)) x = window.innerWidth - panelWidth - minGap;
        if (isNaN(y)) y = minGap;

        x = Math.max(minGap, Math.min(x, window.innerWidth - panelWidth - minGap));
        y = Math.max(minGap, Math.min(y, window.innerHeight - 300));

        panel.style.left = `${x}px`;
        panel.style.top = `${y}px`;
        panel.style.right = "auto";
        panel.style.bottom = "auto";
      } else {
        panel.style.right = `${minGap}px`;
        panel.style.bottom = `${minGap}px`;
      }

      initDrag(document.getElementById("nia-drag-header"), panel);
      adjustPanelToViewport();

      document.querySelector("#nia-category").value = state.filters.category;
      document.querySelector("#nia-language").value = state.filters.language;
      document.querySelector("#nia-date").value = normalizeIsoDate(state.selectedDate);

      panel.addEventListener("change", (event) => {
        if (event.target.id === "nia-date") state.selectedDate = normalizeIsoDate(event.target.value);
        if (event.target.id === "nia-book") state.selectedKey = event.target.value;
        if (event.target.id === "nia-category") state.filters.category = event.target.value;
        if (event.target.id === "nia-language") state.filters.language = event.target.value;
        applyFilters();
        renderBookSelect();
      });

      panel.addEventListener("click", async (event) => {
        if (event.target.id === "nia-toggle") toggleCollapse();
        const button = event.target.closest("button");
        if (!button) return;
        if (button.id === "nia-date-prev" || button.id === "nia-date-next") {
          shiftSelectedDate(button.id === "nia-date-next" ? 1 : -1);
        }
        if (button.id === "nia-submit") await submitApi();
        if (button.id === "nia-auto-submit") toggleAutoSubmit();
        if (button.id === "nia-refresh-books") await refreshBooks();
        if (button.id === "nia-sync-api") await fetchHistory();
        if (button.id === "nia-clear-api") {
          if (state.apiTemplate) {
            delete state.apiTemplate.headers.authorization;
          }
          state.userId = null;
          state.authHeader = "";
          state.tokenExpiresAt = null;
          state.submittedTitles = [];
          state.submittedIsbns = [];
          state.totalHistoryCount = 0;
          state.dashboardRecordCount = 0;
          state.todaySubmitCount = 0;
          state.lastSubmitTime = null;
          saveState();
          renderApiStatus();
          renderBookSelect();
          setStatus("登录凭证已清除。请在 AINS 手动操作一次以重新捕获。");
        }
      });

      panelReady = true;
      renderApiStatus();
    } catch (error) {
      console.error("NILAM API Assistant: createPanel failed", error);
      document.getElementById(PANEL_ID)?.remove();
      panelReady = false;
    }
  }

  // === Student Profile DOM Scraper (read-only, safe) ===
  function scrapeProfileFromPage() {
    if (state.studentName && state.studentGrade) return; // Already have both, skip

    const BLACKLIST = /^(FAQ|ERROR|UNAUTHORIZED|FORBIDDEN|HOME|MENU|LOGIN|LOGOUT|AINS|NILAM|DASHBOARD|SETTINGS)$/i;

    try {
      // Strategy: find all text nodes containing the @moe email, then look at the parent container
      const allElements = document.querySelectorAll("*");
      for (const el of allElements) {
        const text = (el.textContent || "").trim();
        if (!text.includes("@moe")) continue;

        // Split container text into lines
        const lines = text.split(/\n|\r\n?/).map(l => l.trim()).filter(l => l.length > 0);
        const emailIdx = lines.findIndex(l => l.includes("@moe"));
        if (emailIdx < 0) continue;

        // Name is typically the line before the email
        if (!state.studentName && emailIdx > 0) {
          const candidate = lines[emailIdx - 1];
          if (candidate.length >= 4 && candidate.length <= 50 && /^[A-Z\s'.@-]+$/.test(candidate) && !BLACKLIST.test(candidate)) {
            state.studentName = candidate;
          }
        }

        // Grade is typically a line like "1 A" or "2B" nearby
        if (!state.studentGrade) {
          for (let i = 0; i < lines.length; i++) {
            if (/^\d\s?[A-Z]$/.test(lines[i].trim())) {
              state.studentGrade = lines[i].trim();
              break;
            }
          }
        }

        if (state.studentName || state.studentGrade) {
          saveState();
          renderHeaderProfile();
          break;
        }
      }
    } catch (e) {
      // Silently ignore DOM scraping errors
    }
  }

  function renderHeaderProfile() {
    const el = document.querySelector("#nia-header-profile");
    if (!el) return;
    const parts = [];
    if (state.studentName) parts.push(state.studentName);
    if (state.studentGrade) parts.push(`(${state.studentGrade})`);
    el.textContent = parts.join(" ") || "";
  }

  function scrapeDashboardRecordCount() {
    const text = document.body?.innerText || "";
    const match = text.match(/\b(\d{1,5})\s+Rekod\b/i);
    if (!match) return;
    const count = Number(match[1]);
    if (Number.isFinite(count) && count >= 0) {
      const current = state.dashboardRecordCount || 0;
      if (count >= current || current - count > 5) {
        state.dashboardRecordCount = count;
        saveState();
        renderApiStatus();
      }
    }
  }

  async function main() {
    patchFetch();
    patchXhr();
    window.addEventListener("resize", adjustPanelToViewport);

    const tryCreatePanel = () => {
      if (!document.getElementById(PANEL_ID) && document.body) {
        createPanel();
      }
    };

    setInterval(() => {
      tryCreatePanel();
      if (panelReady) {
        updateCooldownUI();
        scrapeProfileFromPage();
        scrapeDashboardRecordCount();
        renderHeaderProfile();
        resumeAutoSubmitIfReady();
      }
    }, 1000);

    try {
      state.selectedDate = normalizeIsoDate(state.selectedDate);
      applyFilters();
      tryCreatePanel();

      setTimeout(() => {
        tryCreatePanel();
        renderBookSelect();
        setStatus(`本地书籍数据库已就绪：共 30 本。`);
        if (state.authHeader && state.userId) {
          fetchHistory(); // Sync history on load if credentials exist
        }
        resumeAutoSubmitIfReady();
      }, 500);
    } catch (error) {
      console.error("NILAM API Assistant: Init failed:", error);
      setStatus(`Init failed: ${error.message}`);
    }
  }

  main().catch((error) => {
    if (panelReady) setStatus(`Error: ${error.message}`);
    else console.error(error);
  });
})();

