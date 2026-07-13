import re

with open("tampermonkey/nilam-api.user.js", "r", encoding="utf-8") as f:
    code = f.read()

# Remove state.apiTemplate from state initialization
code = code.replace("    apiTemplate: null,\n", "")

# Remove legacy state migration
code = re.sub(r'  if \(state\.apiTemplate && !state\.apiTemplate\.bodyText\) \{.*?\n  \}\n', '', code, flags=re.DOTALL)
code = code.replace("      apiTemplate: state.apiTemplate,\n", "")

# Remove updateCapturedToken assigning to apiTemplate
old_update_token = """    if (authHeader && authHeader.startsWith("Bearer ")) {
      state.authHeader = authHeader;
      if (state.apiTemplate) {
        state.apiTemplate.headers["authorization"] = authHeader;
      }"""
new_update_token = """    if (authHeader && authHeader.startsWith("Bearer ")) {
      state.authHeader = authHeader;"""
code = code.replace(old_update_token, new_update_token)

# In requestHeaders, remove apiTemplate.headers
old_request_headers = """  function requestHeaders(extra = {}) {
    const headers = {
      ...(state.apiTemplate?.headers || {}),
      ...extra
    };
    const auth = state.authHeader || headers.authorization || headers.Authorization;
    delete headers.Authorization;
    if (auth) headers.authorization = auth;
    return headers;
  }"""
new_request_headers = """  function requestHeaders(extra = {}) {
    const headers = { ...extra };
    if (state.authHeader) headers.authorization = state.authHeader;
    return headers;
  }"""
code = code.replace(old_request_headers, new_request_headers)

# Remove the replayCapturedApi completely if it still exists (it might have been missed by previous regex)
code = re.sub(r'  async function replayCapturedApi\(\) \{.*?\n  \}\n\n', '', code, flags=re.DOTALL)

# In fetch call inside submitApi, replace state.apiTemplate.url with AINS_API_ENDPOINT
code = code.replace('console.log("NILAM API Assistant: Request URL ->", state.apiTemplate.url);', 'console.log("NILAM API Assistant: Request URL ->", AINS_API_ENDPOINT);')

# In renderPreview, remove apiTemplate bodyText check
old_render_preview = """  function renderPreview() {
    const debugEl = document.querySelector("#nia-debug-template");
    if (debugEl) {
      debugEl.value = state.apiTemplate
        ? (typeof state.apiTemplate.bodyText === "string" ? state.apiTemplate.bodyText : JSON.stringify(state.apiTemplate, null, 2))
        : "等待捕获 API...";
    }
  }"""
new_render_preview = """  function renderPreview() {
    const debugEl = document.querySelector("#nia-debug-template");
    if (debugEl) {
      debugEl.value = "已切换至原生构建模式 (v0.7.0+)";
    }
  }"""
code = code.replace(old_render_preview, new_render_preview)

# Remove apiTemplate checks from resumeAutoSubmitIfReady and toggleAutoSubmit
code = code.replace("if (state.apiTemplate?.bodyText && state.userId && typeof CryptoJS !== \"undefined\")", "if (state.userId && typeof CryptoJS !== \"undefined\")")
code = code.replace("if (!state.apiTemplate?.bodyText || !state.userId)", "if (!state.userId)")
code = code.replace("        if (!state.apiTemplate?.bodyText) {\n          stopAutoSubmit(\"未捕获提交凭证\");\n          return;\n        }\n", "")

# Remove apiTemplate cleanup in nia-clear-api
old_clear_api = """        if (button.id === "nia-clear-api") {
          if (state.apiTemplate) {
            delete state.apiTemplate.headers.authorization;
            delete state.apiTemplate.headers.Authorization;
          }
          delete state.authHeader;"""
new_clear_api = """        if (button.id === "nia-clear-api") {
          delete state.authHeader;"""
code = code.replace(old_clear_api, new_clear_api)

with open("tampermonkey/nilam-api.user.js", "w", encoding="utf-8") as f:
    f.write(code)

print("Remaining apiTemplate usages replaced.")
