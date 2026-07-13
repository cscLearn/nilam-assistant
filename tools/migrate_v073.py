import re

with open("tampermonkey/nilam-api.user.js", "r", encoding="utf-8") as f:
    code = f.read()

# Bump version to v0.7.3
code = code.replace("// @version      0.6.2", "// @version      0.7.3")
code = code.replace('const SCRIPT_VERSION = "0.6.2";', 'const SCRIPT_VERSION = "0.7.3";')

# Add updateURL and downloadURL
url_headers = """// @updateURL    https://raw.githubusercontent.com/cscLearn/nilam-assistant/main/tampermonkey/nilam-api.user.js
// @downloadURL  https://raw.githubusercontent.com/cscLearn/nilam-assistant/main/tampermonkey/nilam-api.user.js"""
code = code.replace("// @author       cscLearn", "// @author       cscLearn\n" + url_headers)

# Ensure PROVIDER_SECRET is the latest hex string
old_secret = 'const PROVIDER_SECRET = "OypAJ9vA==,OJEpNYuu2h";'
new_secret = 'const PROVIDER_SECRET = "51240360a373ff255b719468926955a127f8a37912a20dc3e32e5da25cbeaa2b";'
code = code.replace(old_secret, new_secret)

# Remove exportShareableTemplate function and button
code = re.sub(r'\n\s*async function exportShareableTemplate\(\) \{.*?\n\s*\}\n', '\n', code, flags=re.DOTALL)
code = re.sub(r'\n\s*<button id="nia-export-template" type="button" class="nia-btn nia-secondary".*?</button>', '', code)
code = re.sub(r'\n\s*if \(button\.id === "nia-export-template"\) await exportShareableTemplate\(\);', '', code)

with open("tampermonkey/nilam-api.user.js", "w", encoding="utf-8") as f:
    f.write(code)

print("Migration completed.")
