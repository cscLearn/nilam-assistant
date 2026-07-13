import re

with open("tampermonkey/nilam-api.user.js", "r", encoding="utf-8") as f:
    code = f.read()

# Update version to 0.7.2
code = code.replace("// @version      0.7.0", "// @version      0.7.2")
code = code.replace('const SCRIPT_VERSION = "0.7.0";', 'const SCRIPT_VERSION = "0.7.2";')

# Update endpoint
code = code.replace('const AINS_API_ENDPOINT = "https://ains-api.moe.gov.my/api/nilam-records";', 'const AINS_API_ENDPOINT = "https://ains-api.moe.gov.my/api/nilam-records/submit";')

with open("tampermonkey/nilam-api.user.js", "w", encoding="utf-8") as f:
    f.write(code)
