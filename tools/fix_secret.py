import re

with open("tampermonkey/nilam-api.user.js", "r", encoding="utf-8") as f:
    code = f.read()

# Update version to 0.7.2
code = code.replace("// @version      0.7.2", "// @version      0.7.2") # already replaced in last run
code = code.replace('const SCRIPT_VERSION = "0.7.2";', 'const SCRIPT_VERSION = "0.7.2";')

# Update endpoint
code = code.replace('const AINS_API_ENDPOINT = "https://ains-api.moe.gov.my/api/nilam-records";', 'const AINS_API_ENDPOINT = "https://ains-api.moe.gov.my/api/nilam-records/submit";')
code = code.replace('const AINS_API_ENDPOINT = "https://ains-api.moe.gov.my/api/nilam-records/submit";', 'const AINS_API_ENDPOINT = "https://ains-api.moe.gov.my/api/nilam-records/submit";')

# Update PROVIDER_SECRET
code = code.replace('const PROVIDER_SECRET = "OypAJ9vA==,OJEpNYuu2h";', 'const PROVIDER_SECRET = "51240360a373ff255b719468926955a127f8a37912a20dc3e32e5da25cbeaa2b";')

with open("tampermonkey/nilam-api.user.js", "w", encoding="utf-8") as f:
    f.write(code)
