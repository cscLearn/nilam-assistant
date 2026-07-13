import re
import sys

with open("tampermonkey/nilam-api.user.js", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update Version
code = code.replace("// @version      0.6.2", "// @version      0.7.0")
code = code.replace("const SCRIPT_VERSION = \"0.6.2\";", "const SCRIPT_VERSION = \"0.7.0\";")

# 2. Add Endpoint
code = code.replace("const PROVIDER_ENTRY_ORDER = [", 'const AINS_API_ENDPOINT = "https://ains-api.moe.gov.my/api/nilam-records";\n  const PROVIDER_ENTRY_ORDER = [')

# 3. Update buildAinsPayload to drop capturedDataTemplate
old_build_payload = """  function buildAinsPayload(book) {
    const base = capturedDataTemplate();
    const data = {
      ...base,
      user: Number(state.userId || base.user),
      type: base.type || "book",
      date: book.date,
      title: book.title,
      bookType: base.bookType || "physical",
      category: apiCategory(book.category),
      noOfPage: Number(book.pages),
      isbn: book.isbn,
      author: book.author,
      publisher: book.publisher,
      publishedYear: String(book.year),
      language: apiLanguage(book.language),
      summary: book.rumusan,
      review: book.lesson,
      rating: Number(book.rating || base.rating || 5),
      reviewIsVideo: Boolean(base.reviewIsVideo)
    };"""

new_build_payload = """  function buildAinsPayload(book) {
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
    };"""
code = code.replace(old_build_payload, new_build_payload)

# 4. Update submitApi to drop apiTemplate usage and use AINS_API_ENDPOINT
old_submit_checks = """    if (!state.apiTemplate?.bodyText) {
      setStatus("未捕获凭证：请先在 AINS 网页上手动提交一次 NILAM 以捕获 API 凭证。");
      return "missing_template";
    }
    if (!ensureUsableToken("提交")) return "missing_token";

    if (!state.userId) {
      let auth = state.authHeader || state.apiTemplate.headers["Authorization"] || state.apiTemplate.headers["authorization"];"""

new_submit_checks = """    if (!ensureUsableToken("提交")) return "missing_token";

    if (!state.userId) {
      let auth = state.authHeader;"""
code = code.replace(old_submit_checks, new_submit_checks)

old_submit_fetch = """      const response = await fetch(state.apiTemplate.url, {
        method: "POST",
        credentials: "include",
        headers: requestHeaders({ "content-type": "application/json" }),
        body: JSON.stringify(bodyPayload)
      });"""

new_submit_fetch = """      const response = await fetch(AINS_API_ENDPOINT, {
        method: "POST",
        credentials: "include",
        headers: requestHeaders({ "content-type": "application/json" }),
        body: JSON.stringify(bodyPayload)
      });"""
code = code.replace(old_submit_fetch, new_submit_fetch)

# 5. Remove exportShareableTemplate button and function
code = re.sub(r'\n\s*async function exportShareableTemplate\(\) \{.*?\n\s*\}\n', '\n', code, flags=re.DOTALL)
code = re.sub(r'\n\s*<button id="nia-export-template" type="button" class="nia-btn nia-secondary".*?</button>', '', code)
code = re.sub(r'\n\s*if \(button\.id === "nia-export-template"\) await exportShareableTemplate\(\);', '', code)

# 6. Remove replayCapturedApi button and function
code = re.sub(r'\n\s*async function replayCapturedApi\(\) \{.*?\n\s*\}\n', '\n', code, flags=re.DOTALL)
code = re.sub(r'\n\s*<button id="nia-replay-api" type="button" class="nia-btn nia-secondary">单步测试</button>', '', code)
code = re.sub(r'\n\s*if \(button\.id === "nia-replay-api"\) await replayCapturedApi\(\);', '', code)

# 7. Update renderApiStatus
old_status_1 = """        ? `凭证捕获：<span style="color:#10b981;font-weight:700;">成功</span><br><span style="font-size:10px;color:#6b7280;">User ID: ${state.userId || "等待中"} | ${status.label} | v${SCRIPT_VERSION}</span>`"""
new_status_1 = """        ? `<span style="color:#10b981;font-weight:700;">就绪</span><br><span style="font-size:10px;color:#6b7280;">User ID: ${state.userId || "获取中"} | ${status.label} | v${SCRIPT_VERSION}</span>`"""
code = code.replace(old_status_1, new_status_1)

old_status_2 = """        : state.authHeader
          ? `<span style="color:#d97706;font-weight:700;">登录凭证已捕获</span><br><span style="font-size:10px;color:#6b7280;">仍需 AINS 原生提交模板；请手动提交一笔记录。 | v${SCRIPT_VERSION}</span>`
          : `<span style="color:#ef4444;font-weight:700;">未捕获凭证</span><br><span style="font-size:10px;color:#6b7280;">请在 AINS 手动提交一次以捕获。 | v${SCRIPT_VERSION}</span>`;"""
new_status_2 = """        : `<span style="color:#ef4444;font-weight:700;">未捕获凭证</span><br><span style="font-size:10px;color:#6b7280;">请正常登录 AINS 即可自动捕获。 | v${SCRIPT_VERSION}</span>`;"""
code = code.replace(old_status_2, new_status_2)

old_status_condition = "      el.innerHTML = state.apiTemplate?.bodyText\n"
new_status_condition = "      el.innerHTML = status.ok\n"
code = code.replace(old_status_condition, new_status_condition)

# 8. Remove captureTemplate and related helpers
code = re.sub(r'\n\s*function headersToObject\(headers\) \{.*?\n\s*\}\n', '\n', code, flags=re.DOTALL)
code = re.sub(r'\n\s*function bodyToTemplateBody\(body\) \{.*?\n\s*\}\n', '\n', code, flags=re.DOTALL)
code = re.sub(r'\n\s*function captureTemplate\(url, method, headers, body\) \{.*?\n\s*\}\n', '\n', code, flags=re.DOTALL)
code = re.sub(r'\n\s*function capturedDataTemplate\(\) \{.*?\n\s*\}\n', '\n', code, flags=re.DOTALL)
code = re.sub(r'\n\s*function looksLikeNilamPost\(url, bodyText\) \{.*?\n\s*\}\n', '\n', code, flags=re.DOTALL)
code = re.sub(r'\n\s*function parseJsonOrNull\(text\) \{.*?\n\s*\}\n', '\n', code, flags=re.DOTALL)


# Remove captureTemplate calls from network patchers
code = code.replace("        captureTemplate(url, method, mergedHeaders, body);\n", "")
code = code.replace("          captureTemplate(url, method, this.__nilamApi.headers, body);\n", "")

# 9. Update tokenStatus
old_token_status = """  function tokenStatus() {
    if (!state.authHeader && !state.apiTemplate?.headers?.authorization) {
      return { ok: false, label: "无登录凭证" };
    }"""
new_token_status = """  function tokenStatus() {
    if (!state.authHeader) {
      return { ok: false, label: "无登录凭证" };
    }"""
code = code.replace(old_token_status, new_token_status)

# 10. Update clear api credentials behavior
old_clear = """        if (button.id === "nia-clear-api") {
          if (state.apiTemplate) {
            delete state.apiTemplate.headers.authorization;
            delete state.apiTemplate.headers.Authorization;
          }
          delete state.authHeader;
          delete state.userId;
          delete state.tokenExpiresAt;
          saveState();
          setStatus("登录凭证已清除，请刷新页面重新登录或手动提交。");
          renderApiStatus();
        }"""
new_clear = """        if (button.id === "nia-clear-api") {
          delete state.authHeader;
          delete state.userId;
          delete state.tokenExpiresAt;
          saveState();
          setStatus("登录凭证已清除，请刷新页面自动获取。");
          renderApiStatus();
        }"""
code = code.replace(old_clear, new_clear)

with open("tampermonkey/nilam-api.user.js", "w", encoding="utf-8") as f:
    f.write(code)

print("Migration completed.")
