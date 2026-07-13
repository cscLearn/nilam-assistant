import re
import sys

with open("tampermonkey/nilam-api.user.js", "r", encoding="utf-8") as f:
    code = f.read()

# Replace all occurrences of state.apiTemplate.url with AINS_API_ENDPOINT in fetch
code = code.replace("await fetch(state.apiTemplate.url, {", "await fetch(AINS_API_ENDPOINT, {")

# And any remaining checks on state.apiTemplate
code = code.replace("if (!state.apiTemplate) return;", "if (!state.authHeader) return;")

# In fetchHistory, there's a check for apiTemplate:
old_history_check = """    if (!state.apiTemplate) {
      if (!renderAfter) return;
      setStatus("同步失败：未捕获 API 凭证。请先在 AINS 网页上手动提交一笔记录。");
      return;
    }"""
new_history_check = """    if (!state.authHeader) {
      if (!renderAfter) return;
      setStatus("同步失败：未捕获 API 凭证。请正常登录即可自动捕获。");
      return;
    }"""
code = code.replace(old_history_check, new_history_check)

# In clear api credentials:
code = code.replace("""          if (state.apiTemplate) {
            delete state.apiTemplate.headers.authorization;
            delete state.apiTemplate.headers.Authorization;
          }""", "")

with open("tampermonkey/nilam-api.user.js", "w", encoding="utf-8") as f:
    f.write(code)

print("URL Fix completed.")
