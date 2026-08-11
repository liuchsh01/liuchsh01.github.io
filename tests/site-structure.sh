#!/usr/bin/env bash

set -u

group="${1:-all}"
failures=0

fail() {
  printf 'FAIL: %s\n' "$1"
  failures=$((failures + 1))
}

check_file() {
  if [[ ! -f "$1" ]]; then
    fail "missing file $1"
  fi
}

check_contains() {
  local file="$1"
  local pattern="$2"
  local label="$3"
  if [[ ! -f "$file" ]] || ! rg -q --fixed-strings -- "$pattern" "$file"; then
    fail "$label"
  fi
}

check_not_contains() {
  local file="$1"
  local pattern="$2"
  local label="$3"
  if [[ -f "$file" ]] && rg -q -- "$pattern" "$file"; then
    fail "$label"
  fi
}

check_tool_page() {
  local directory="$1"
  check_file "$directory/index.html"
  check_file "$directory/style.css"
  check_file "$directory/script.js"
  check_contains "$directory/index.html" '../../assets/css/theme.css' "$directory must load the shared theme"
  check_contains "$directory/index.html" '../../assets/js/common.js' "$directory must load common.js"
  check_not_contains "$directory/index.html" 'assets/js/common.js" defer' "$directory must initialize the saved theme before first paint"
  check_contains "$directory/index.html" '../../index.html' "$directory must link back to the homepage"
  check_contains "$directory/index.html" 'lang="zh-CN"' "$directory must declare zh-CN"
  check_not_contains "$directory/index.html" 'on(click|input|change|submit)=' "$directory must not use inline event handlers"
}

check_absent() {
  if [[ -e "$1" ]]; then
    fail "legacy root tool file must be removed: $1"
  fi
}

check_home() {
  check_file 'assets/css/theme.css'
  check_file 'assets/js/common.js'
  check_contains 'index.html' './assets/css/theme.css' 'homepage must load the shared theme'
  check_contains 'index.html' 'data-theme-select' 'homepage missing theme selector'
  check_not_contains 'index.html' 'assets/js/common.js" defer' 'homepage must initialize the saved theme before first paint'
  check_contains 'index.html' '实用工具集' 'homepage must identify the toolbox'
  check_contains 'index.html' './tools/20260807_multiline-calculator/' 'homepage missing multiline calculator link'
  check_contains 'index.html' './tools/20260311_rsa-encrypt/' 'homepage missing RSA link'
  check_contains 'index.html' './tools/20250127_annual-bonus-tax/' 'homepage missing annual bonus tax link'
  check_contains 'index.html' './tools/20251222_word-filter/' 'homepage missing word filter link'
  check_contains 'index.html' './tools/20260810_multi-timezone-clock/' 'homepage missing multi-timezone clock link'
  check_contains 'index.html' './tools/20260810_hash-generator/' 'homepage missing hash generator link'
  check_contains 'index.html' './tools/20260810_random-password-generator/' 'homepage missing random password generator link'
  check_contains 'index.html' './tools/20260810_json-formatter/' 'homepage missing JSON formatter link'
  check_contains 'index.html' './tools/20260810_timestamp-converter/' 'homepage missing timestamp converter link'
  check_contains 'index.html' './tools/20260811_token-inspector/' 'homepage missing token inspector link'
  check_contains 'index.html' './tools/20260811_image-converter/' 'homepage missing image converter link'
  check_contains 'index.html' './tools/20260811_encoding-converter/' 'homepage missing encoding converter link'
  check_contains 'index.html' './tools/20260811_uuid-ulid-generator/' 'homepage missing UUID/ULID generator link'
  check_contains 'index.html' './tools/20260811_regex-tester/' 'homepage missing regex tester link'
  check_contains 'index.html' './tools/20260811_text-diff/' 'homepage missing text diff link'
  check_contains 'index.html' './tools/20260811_cron-expression-tool/' 'homepage missing Cron expression tool link'
  check_contains 'index.html' './tools/20260811_json-yaml-converter/' 'homepage missing JSON/YAML converter link'
  check_contains 'index.html' './tools/20260811_qr-code-tool/' 'homepage missing QR code tool link'
  check_contains 'index.html' './tools/20260811_ipv4-subnet-calculator/' 'homepage missing IPv4 subnet calculator link'
  check_contains 'index.html' './tools/20260811_ip-info-lookup/' 'homepage missing IP info lookup link'
  check_contains 'index.html' './tools/20260811_sql-formatter/' 'homepage missing SQL formatter link'
  check_contains 'index.html' './tools/20260811_text-list-organizer/' 'homepage missing text list organizer link'
  check_not_contains 'index.html' 'on(click|input|change|submit)=' 'homepage must not use inline event handlers'
}

check_image_converter() {
  local directory='tools/20260811_image-converter'
  check_tool_page "$directory"
  check_file "$directory/image-core.js"
  check_contains "$directory/index.html" 'id="imageInput"' 'image converter missing file input'
  check_contains "$directory/index.html" 'multiple' 'image converter must support multiple files'
  check_contains "$directory/index.html" 'id="outputFormat"' 'image converter missing output format selector'
  check_contains "$directory/index.html" 'id="widthInput"' 'image converter missing width input'
  check_contains "$directory/index.html" 'id="heightInput"' 'image converter missing height input'
  check_contains "$directory/index.html" 'id="keepAspect"' 'image converter missing aspect-ratio control'
  check_contains "$directory/index.html" 'id="qualityInput"' 'image converter missing quality control'
  check_contains "$directory/index.html" 'id="backgroundColor"' 'image converter missing JPEG background color'
  check_contains "$directory/index.html" 'id="convertImages"' 'image converter missing conversion control'
  check_contains "$directory/index.html" 'id="resultList"' 'image converter missing result list'
  check_contains "$directory/image-core.js" 'calculateOutputDimensions' 'image converter missing dimension calculation core'
  check_contains "$directory/image-core.js" 'shareAspectRatio' 'image converter missing batch aspect-ratio comparison'
  check_contains "$directory/script.js" 'createImageBitmap' 'image converter missing local image decoding'
  check_contains "$directory/script.js" 'canvas.toBlob' 'image converter missing Canvas encoding'
  check_contains "$directory/script.js" 'URL.createObjectURL' 'image converter missing local preview/download URLs'
  check_contains "$directory/script.js" 'syncAspectDimensions' 'image converter missing linked aspect-ratio inputs'
  check_contains "$directory/style.css" 'isolation: isolate' 'image converter preview must not cover result controls'
  check_not_contains "$directory/script.js" 'innerHTML' 'image converter must render file data safely'
}

check_encoding_converter() {
  local directory='tools/20260811_encoding-converter'
  check_tool_page "$directory"
  check_file "$directory/encoding-core.js"
  check_contains "$directory/index.html" 'data-codec="base64"' 'encoding converter missing Base64 mode'
  check_contains "$directory/index.html" 'data-codec="url"' 'encoding converter missing URL mode'
  check_contains "$directory/index.html" 'data-codec="html"' 'encoding converter missing HTML mode'
  check_contains "$directory/index.html" 'id="sourceInput"' 'encoding converter missing input textarea'
  check_contains "$directory/index.html" 'id="resultOutput"' 'encoding converter missing output textarea'
  check_contains "$directory/index.html" 'id="encodeButton"' 'encoding converter missing encode control'
  check_contains "$directory/index.html" 'id="decodeButton"' 'encoding converter missing decode control'
  check_contains "$directory/index.html" 'id="copyOutput"' 'encoding converter missing copy control'
  check_contains "$directory/encoding-core.js" 'TextEncoder' 'encoding converter must encode Base64 as UTF-8'
  check_contains "$directory/encoding-core.js" 'encodeURIComponent' 'encoding converter missing URL component encoding'
  check_contains "$directory/encoding-core.js" 'encodeHtmlEntities' 'encoding converter missing HTML entity encoding'
  check_not_contains "$directory/script.js" 'innerHTML' 'encoding converter must not inject user output as HTML'
}

check_json_yaml_converter() {
  local directory='tools/20260811_json-yaml-converter'
  check_tool_page "$directory"
  check_file "$directory/json-yaml-core.js"
  check_contains "$directory/index.html" 'js-yaml@4.1.0' 'JSON/YAML converter must pin js-yaml 4.1.0'
  check_contains "$directory/index.html" 'id="directionSelect"' 'JSON/YAML converter missing direction selector'
  check_contains "$directory/index.html" 'id="sourceInput"' 'JSON/YAML converter missing source input'
  check_contains "$directory/index.html" 'id="resultOutput"' 'JSON/YAML converter missing result output'
  check_contains "$directory/index.html" 'id="convertButton"' 'JSON/YAML converter missing convert control'
  check_contains "$directory/index.html" 'id="copyButton"' 'JSON/YAML converter missing copy control'
  check_contains "$directory/index.html" 'id="downloadButton"' 'JSON/YAML converter missing download control'
  check_contains "$directory/json-yaml-core.js" 'convertJsonToYaml' 'JSON/YAML converter missing JSON to YAML core'
  check_contains "$directory/json-yaml-core.js" 'convertYamlToJson' 'JSON/YAML converter missing YAML to JSON core'
  check_not_contains "$directory/script.js" 'innerHTML' 'JSON/YAML converter must not inject user content as HTML'
  check_not_contains "$directory/json-yaml-core.js" 'eval\(|new Function' 'JSON/YAML converter must not execute input'
}

check_qr_code_tool() {
  local directory='tools/20260811_qr-code-tool'
  check_tool_page "$directory"
  check_file "$directory/qr-core.js"
  check_contains "$directory/index.html" 'qrcode@1.5.4' 'QR tool must pin qrcode 1.5.4'
  check_contains "$directory/index.html" 'jsqr@1.4.0' 'QR tool must pin jsQR 1.4.0'
  check_contains "$directory/index.html" 'id="qrContent"' 'QR tool missing content input'
  check_contains "$directory/index.html" 'id="qrCanvas"' 'QR tool missing QR canvas'
  check_contains "$directory/index.html" 'id="downloadQr"' 'QR tool missing PNG download control'
  check_contains "$directory/index.html" 'id="qrImageInput"' 'QR tool missing image input'
  check_contains "$directory/index.html" 'id="scanButton"' 'QR tool missing scan control'
  check_contains "$directory/index.html" 'id="scanResult"' 'QR tool missing scan result'
  check_contains "$directory/script.js" 'createImageBitmap' 'QR tool missing local image decoding'
  check_contains "$directory/script.js" 'window.jsQR' 'QR tool missing QR recognition'
  check_not_contains "$directory/script.js" 'innerHTML' 'QR tool must not inject QR content as HTML'
}

check_ipv4_subnet_calculator() {
  local directory='tools/20260811_ipv4-subnet-calculator'
  check_tool_page "$directory"
  check_file "$directory/ipv4-core.js"
  check_contains "$directory/index.html" 'id="addressInput"' 'IPv4 calculator missing address input'
  check_contains "$directory/index.html" 'id="prefixInput"' 'IPv4 calculator missing prefix input'
  check_contains "$directory/index.html" 'id="subnetForm"' 'IPv4 calculator missing calculation form'
  check_contains "$directory/index.html" 'id="copyResults"' 'IPv4 calculator missing copy control'
  check_contains "$directory/ipv4-core.js" 'calculateSubnet' 'IPv4 calculator missing subnet calculation core'
  check_contains "$directory/ipv4-core.js" 'prefixFromMask' 'IPv4 calculator missing dotted-mask support'
  check_not_contains "$directory/script.js" 'innerHTML' 'IPv4 calculator must render results safely'
}

check_ip_info_lookup() {
  local directory='tools/20260811_ip-info-lookup'
  check_tool_page "$directory"
  check_file "$directory/ip-core.js"
  check_contains "$directory/index.html" 'id="ipInput"' 'IP lookup missing IP input'
  check_contains "$directory/index.html" 'id="currentIp"' 'IP lookup missing current-IP control'
  check_contains "$directory/index.html" 'value="ipwhois" checked' 'IP lookup must enable IPWhois by default'
  check_contains "$directory/index.html" 'value="geojs" checked' 'IP lookup must enable GeoJS by default'
  check_contains "$directory/index.html" 'value="dbip" checked' 'IP lookup must enable DB-IP by default'
  check_contains "$directory/index.html" 'value="ripestat" checked' 'IP lookup must enable RIPEstat by default'
  check_contains "$directory/index.html" 'value="ipinfo"' 'IP lookup missing IPinfo source'
  check_contains "$directory/index.html" 'id="ipinfoToken"' 'IP lookup missing optional IPinfo token input'
  check_contains "$directory/index.html" 'id="summaryGrid"' 'IP lookup missing aggregate result grid'
  check_contains "$directory/index.html" 'id="sourceGrid"' 'IP lookup missing provider result grid'
  check_contains "$directory/ip-core.js" 'normalizeProviderResponse' 'IP lookup missing provider normalization core'
  check_contains "$directory/script.js" 'Promise.all' 'IP lookup must query providers concurrently'
  check_contains "$directory/script.js" 'AbortController' 'IP lookup missing request timeout handling'
  check_not_contains "$directory/script.js" 'innerHTML' 'IP lookup must render remote data safely'
}

check_sql_formatter() {
  local directory='tools/20260811_sql-formatter'
  check_tool_page "$directory"
  check_file "$directory/sql-core.js"
  check_contains "$directory/index.html" 'sql-formatter@15.8.2' 'SQL formatter must pin sql-formatter 15.8.2'
  check_contains "$directory/index.html" 'id="languageSelect"' 'SQL formatter missing dialect selector'
  check_contains "$directory/index.html" 'id="sqlInput"' 'SQL formatter missing SQL input'
  check_contains "$directory/index.html" 'id="sqlOutput"' 'SQL formatter missing SQL output'
  check_contains "$directory/index.html" 'id="formatSql"' 'SQL formatter missing format control'
  check_contains "$directory/index.html" 'id="minifySql"' 'SQL formatter missing minify control'
  check_contains "$directory/index.html" 'id="copySql"' 'SQL formatter missing copy control'
  check_contains "$directory/sql-core.js" 'minifySql' 'SQL formatter missing local minify core'
  check_not_contains "$directory/script.js" 'innerHTML' 'SQL formatter must not inject SQL as HTML'
  check_not_contains "$directory/sql-core.js" 'eval\(|new Function' 'SQL formatter must not execute SQL input'
}

check_text_list_organizer() {
  local directory='tools/20260811_text-list-organizer'
  check_tool_page "$directory"
  check_file "$directory/text-list-core.js"
  check_contains "$directory/index.html" 'id="sourceList"' 'text list organizer missing source list'
  check_contains "$directory/index.html" 'id="deduplicate"' 'text list organizer missing deduplication control'
  check_contains "$directory/index.html" 'id="sortMode"' 'text list organizer missing sort selector'
  check_contains "$directory/index.html" 'id="linePrefix"' 'text list organizer missing prefix input'
  check_contains "$directory/index.html" 'id="listA"' 'text list organizer missing list A'
  check_contains "$directory/index.html" 'id="listB"' 'text list organizer missing list B'
  check_contains "$directory/index.html" 'id="setOperation"' 'text list organizer missing set-operation selector'
  check_contains "$directory/index.html" 'id="copyOrganizeResult"' 'text list organizer missing copy control'
  check_contains "$directory/text-list-core.js" 'organizeLines' 'text list organizer missing organizer core'
  check_contains "$directory/text-list-core.js" 'performSetOperation' 'text list organizer missing set-operation core'
  check_not_contains "$directory/script.js" 'innerHTML' 'text list organizer must render results safely'
}

check_identifier_generator() {
  local directory='tools/20260811_uuid-ulid-generator'
  check_tool_page "$directory"
  check_file "$directory/identifier-core.js"
  check_contains "$directory/index.html" 'value="uuid-v4" checked' 'identifier generator must default to UUID v4'
  check_contains "$directory/index.html" 'value="uuid-v7"' 'identifier generator missing UUID v7 option'
  check_contains "$directory/index.html" 'value="ulid"' 'identifier generator missing ULID option'
  check_contains "$directory/index.html" 'id="identifierCount"' 'identifier generator missing count input'
  check_contains "$directory/index.html" 'id="letterCase"' 'identifier generator missing letter-case selector'
  check_contains "$directory/index.html" 'id="includeHyphens"' 'identifier generator missing UUID hyphen option'
  check_contains "$directory/index.html" 'id="copyAll"' 'identifier generator missing copy-all control'
  check_contains "$directory/index.html" 'id="downloadResults"' 'identifier generator missing download control'
  check_contains "$directory/identifier-core.js" 'generateUuidV4' 'identifier generator missing UUID v4 core'
  check_contains "$directory/identifier-core.js" 'generateUuidV7' 'identifier generator missing UUID v7 core'
  check_contains "$directory/identifier-core.js" 'generateUlid' 'identifier generator missing ULID core'
  check_contains "$directory/identifier-core.js" 'getRandomValues' 'identifier generator must use cryptographic randomness'
  check_not_contains "$directory/script.js" 'innerHTML' 'identifier generator must render results safely'
}

check_regex_tester() {
  local directory='tools/20260811_regex-tester'
  check_tool_page "$directory"
  check_file "$directory/regex-core.js"
  check_contains "$directory/index.html" 'id="patternInput"' 'regex tester missing pattern input'
  check_contains "$directory/index.html" 'id="testText"' 'regex tester missing test text input'
  check_contains "$directory/index.html" 'value="g" checked' 'regex tester must enable global matching by default'
  check_contains "$directory/index.html" 'value="i"' 'regex tester missing ignore-case flag'
  check_contains "$directory/index.html" 'value="m"' 'regex tester missing multiline flag'
  check_contains "$directory/index.html" 'value="s"' 'regex tester missing dot-all flag'
  check_contains "$directory/index.html" 'value="u"' 'regex tester missing Unicode flag'
  check_contains "$directory/index.html" 'id="highlightOutput"' 'regex tester missing highlight output'
  check_contains "$directory/index.html" 'id="matchList"' 'regex tester missing capture details'
  check_contains "$directory/index.html" 'id="replacementOutput"' 'regex tester missing replacement preview'
  check_contains "$directory/index.html" 'id="copyReplacement"' 'regex tester missing replacement copy control'
  check_contains "$directory/regex-core.js" 'advanceStringIndex' 'regex tester missing zero-width match protection'
  check_contains "$directory/script.js" 'document.createElement' 'regex tester must render matches safely with DOM APIs'
  check_not_contains "$directory/script.js" 'innerHTML' 'regex tester must not inject user input as HTML'
  check_not_contains "$directory/regex-core.js" 'eval\(|new Function' 'regex tester must not execute user input'
}

check_text_diff() {
  local directory='tools/20260811_text-diff'
  check_tool_page "$directory"
  check_file "$directory/diff-core.js"
  check_contains "$directory/index.html" 'id="leftText"' 'text diff missing original text input'
  check_contains "$directory/index.html" 'id="rightText"' 'text diff missing comparison text input'
  check_contains "$directory/index.html" 'id="ignoreWhitespace"' 'text diff missing whitespace option'
  check_contains "$directory/index.html" 'id="ignoreCase"' 'text diff missing case option'
  check_contains "$directory/index.html" 'id="swapTexts"' 'text diff missing swap control'
  check_contains "$directory/index.html" 'id="copyDiff"' 'text diff missing copy control'
  check_contains "$directory/index.html" 'id="diffBody"' 'text diff missing result table'
  check_contains "$directory/diff-core.js" 'diffSequence' 'text diff missing line comparison algorithm'
  check_contains "$directory/script.js" 'document.createElement' 'text diff must render results safely with DOM APIs'
  check_not_contains "$directory/script.js" 'innerHTML' 'text diff must not inject text as HTML'
}

check_cron_expression_tool() {
  local directory='tools/20260811_cron-expression-tool'
  check_tool_page "$directory"
  check_file "$directory/cron-core.js"
  check_contains "$directory/index.html" 'id="cronExpression"' 'Cron tool missing expression input'
  check_contains "$directory/index.html" 'id="minuteField"' 'Cron tool missing minute field builder'
  check_contains "$directory/index.html" 'id="startTime"' 'Cron tool missing start-time input'
  check_contains "$directory/index.html" 'id="previewCount"' 'Cron tool missing preview-count selector'
  check_contains "$directory/index.html" 'id="scheduleList"' 'Cron tool missing future schedule list'
  check_contains "$directory/index.html" 'id="copyExpression"' 'Cron tool missing expression copy control'
  check_contains "$directory/index.html" 'id="copySchedule"' 'Cron tool missing schedule copy control'
  check_contains "$directory/cron-core.js" 'findNextOccurrences' 'Cron tool missing future occurrence calculation'
  check_contains "$directory/cron-core.js" 'matchesCron' 'Cron tool missing schedule matching logic'
  check_not_contains "$directory/script.js" 'innerHTML' 'Cron tool must render dynamic output safely'
}

check_token_inspector() {
  local directory='tools/20260811_token-inspector'
  check_tool_page "$directory"
  check_file "$directory/token-core.js"
  check_contains "$directory/index.html" 'id="tokenInput"' 'token inspector missing token input'
  check_contains "$directory/index.html" 'id="parseToken"' 'token inspector missing parse control'
  check_contains "$directory/index.html" 'id="keyInput"' 'token inspector missing verification/decryption key input'
  check_contains "$directory/index.html" 'id="verifyToken"' 'token inspector missing cryptographic validation control'
  check_contains "$directory/index.html" 'id="headerOutput"' 'token inspector missing header output'
  check_contains "$directory/index.html" 'id="payloadOutput"' 'token inspector missing payload output'
  check_contains "$directory/index.html" 'id="copyHeader"' 'token inspector missing header copy control'
  check_contains "$directory/index.html" 'id="copyPayload"' 'token inspector missing payload copy control'
  check_contains "$directory/token-core.js" 'crypto.subtle' 'token inspector must use Web Crypto for verification and decryption'
  check_not_contains "$directory/script.js" 'innerHTML' 'token inspector must not inject token content as HTML'
  check_not_contains "$directory/token-core.js" 'eval\(|new Function' 'token inspector must not execute token content'
}

check_timestamp_converter() {
  local directory='tools/20260810_timestamp-converter'
  check_tool_page "$directory"
  check_file "$directory/timestamp-core.js"
  check_contains "$directory/index.html" 'id="currentTimestamp"' 'timestamp converter missing live current timestamp'
  check_contains "$directory/index.html" 'id="timestampInput"' 'timestamp converter missing timestamp input'
  check_contains "$directory/index.html" 'id="timestampUnit"' 'timestamp converter missing timestamp unit selector'
  check_contains "$directory/index.html" 'id="timestampTimeZone"' 'timestamp converter missing timestamp time-zone selector'
  check_contains "$directory/index.html" 'id="dateTimeInput"' 'timestamp converter missing date-time input'
  check_contains "$directory/index.html" 'id="dateTimeTimeZone"' 'timestamp converter missing date-time time-zone selector'
  check_contains "$directory/index.html" 'id="copyDateResult"' 'timestamp converter missing date result copy control'
  check_contains "$directory/index.html" 'id="copyTimestampResult"' 'timestamp converter missing timestamp result copy control'
  check_contains "$directory/timestamp-core.js" 'Intl.DateTimeFormat' 'timestamp converter must use browser time-zone data'
  check_not_contains "$directory/script.js" 'innerHTML' 'timestamp converter must not inject dynamic HTML'
}

check_json_formatter() {
  local directory='tools/20260810_json-formatter'
  check_tool_page "$directory"
  check_file "$directory/json-core.js"
  check_contains "$directory/index.html" 'id="jsonInput"' 'JSON formatter missing input textarea'
  check_contains "$directory/index.html" 'id="repairToggle"' 'JSON formatter missing repair toggle'
  check_contains "$directory/index.html" 'id="expandAll"' 'JSON formatter missing expand-all control'
  check_contains "$directory/index.html" 'id="collapseAll"' 'JSON formatter missing collapse-all control'
  check_contains "$directory/index.html" 'id="copyFormatted"' 'JSON formatter missing copy control'
  check_contains "$directory/script.js" 'document.createElement' 'JSON formatter must render results safely with DOM APIs'
  check_contains "$directory/json-core.js" 'repairJson' 'JSON formatter missing repair pipeline'
  check_not_contains "$directory/json-core.js" 'eval\(|new Function' 'JSON formatter must not execute user input'
  check_not_contains "$directory/script.js" 'innerHTML' 'JSON formatter must not inject user input as HTML'
}

check_password_generator() {
  local directory='tools/20260810_random-password-generator'
  check_tool_page "$directory"
  check_file "$directory/password-core.js"
  check_contains "$directory/index.html" 'value="digits" checked' 'password generator must enable digits by default'
  check_contains "$directory/index.html" 'value="lowercase" checked' 'password generator must enable lowercase by default'
  check_contains "$directory/index.html" 'value="uppercase" checked' 'password generator must enable uppercase by default'
  check_contains "$directory/index.html" 'value="symbols"' 'password generator missing symbol option'
  check_contains "$directory/index.html" 'id="passwordCount"' 'password generator missing count input'
  check_contains "$directory/index.html" 'id="minLength"' 'password generator missing minimum length input'
  check_contains "$directory/index.html" 'id="maxLength"' 'password generator missing maximum length input'
  check_contains "$directory/index.html" 'id="includeCharacters"' 'password generator missing required characters input'
  check_contains "$directory/index.html" 'id="excludeCharacters"' 'password generator missing excluded characters input'
  check_contains "$directory/password-core.js" 'getRandomValues' 'password generator must use cryptographic randomness'
  check_contains "$directory/script.js" 'copyText' 'password generator missing copy behavior'
}

check_theme_contract() {
  check_contains 'assets/css/theme.css' '全站主题入口' 'theme.css must document the global theme entry point'
  check_contains 'assets/css/theme.css' '--ink-soft:' 'theme.css missing semantic text color tokens'
  check_contains 'assets/css/theme.css' '--control-bg:' 'theme.css missing semantic surface tokens'
  check_contains 'assets/css/theme.css' '--shadow-card-hover:' 'theme.css missing semantic shadow tokens'
  check_contains 'assets/css/theme.css' '--radius-section:' 'theme.css missing semantic radius tokens'
  check_contains 'assets/css/theme.css' '.info-card {' 'theme.css missing shared info card component'
  check_contains 'assets/css/theme.css' '.form-message,' 'theme.css missing shared form message component'
  check_contains 'assets/css/theme.css' ':root[data-theme="ocean"]' 'theme.css missing ocean theme'
  check_contains 'assets/css/theme.css' ':root[data-theme="sand"]' 'theme.css missing sand theme'
  check_contains 'assets/css/theme.css' ':root[data-theme="rose"]' 'theme.css missing rose theme'
  check_contains 'assets/css/theme.css' ':root[data-theme="night"]' 'theme.css missing night theme'
  check_contains 'assets/js/common.js' "DEFAULT_THEME = 'jade'" 'common.js missing default jade theme'
  check_contains 'assets/js/common.js' "THEME_STORAGE_KEY = 'toolbox-theme'" 'common.js missing theme persistence key'
  check_contains 'assets/js/common.js' 'document.documentElement.dataset.theme' 'common.js must apply theme on the document root'
  check_contains 'assets/js/common.js' 'window.localStorage.setItem' 'common.js must persist the selected theme'

  local css_file
  while IFS= read -r css_file; do
    if rg -q '#[0-9a-fA-F]{3,8}|rgba?\(' "$css_file"; then
      fail "$css_file must use theme color and shadow variables"
    fi
    if rg -q 'border-radius:[[:space:]]*[0-9]' "$css_file"; then
      fail "$css_file must use theme radius variables"
    fi
    if rg -q 'font-family:[[:space:]]*(ui-monospace|SFMono|"SFMono|Consolas|Georgia)' "$css_file"; then
      fail "$css_file must use theme font variables"
    fi
  done < <(rg --files tools -g 'style.css')
}

check_hash_generator() {
  local directory='tools/20260810_hash-generator'
  check_tool_page "$directory"
  check_file "$directory/hash-core.js"
  check_contains "$directory/index.html" 'multiple' 'hash generator file input must accept multiple files'
  check_contains "$directory/index.html" 'MD5' 'hash generator missing MD5 option'
  check_contains "$directory/index.html" 'SHA-1' 'hash generator missing SHA-1 option'
  check_contains "$directory/index.html" 'SHA-256' 'hash generator missing SHA-256 option'
  check_contains "$directory/index.html" 'SHA-384' 'hash generator missing SHA-384 option'
  check_contains "$directory/index.html" 'SHA-512' 'hash generator missing SHA-512 option'
  check_contains "$directory/index.html" 'JAVA-HASHCODE' 'hash generator missing Java String.hashCode option'
  check_contains "$directory/index.html" 'value="MD5" checked' 'hash generator must select MD5 by default'
  check_contains "$directory/index.html" 'value="SHA-256" checked' 'hash generator must select SHA-256 by default'
  check_not_contains "$directory/index.html" 'value="SHA-1" checked' 'hash generator must not select SHA-1 by default'
  check_contains "$directory/hash-core.js" 'md5Hex' 'hash generator missing local MD5 implementation'
  check_contains "$directory/hash-core.js" 'javaStringHashCode' 'hash generator missing Java String.hashCode implementation'
  check_contains "$directory/script.js" 'crypto.subtle' 'hash generator missing Web Crypto hashing'
  check_contains "$directory/script.js" 'file.arrayBuffer' 'hash generator missing local file reading'
}

check_timezone_clock() {
  local directory='tools/20260810_multi-timezone-clock'
  check_tool_page "$directory"
  check_contains "$directory/script.js" "Asia/Shanghai" 'timezone clock missing China default'
  check_contains "$directory/script.js" "Asia/Singapore" 'timezone clock missing Singapore default'
  check_contains "$directory/script.js" "America/New_York" 'timezone clock missing USA default'
  check_contains "$directory/script.js" "Europe/Berlin" 'timezone clock missing Germany default'
  check_contains "$directory/script.js" "Asia/Ho_Chi_Minh" 'timezone clock missing Vietnam default'
  check_contains "$directory/script.js" 'scheduleSecondTick' 'timezone clock missing second-boundary scheduling'
  check_contains "$directory/script.js" 'scheduleMinuteSync' 'timezone clock missing minute synchronization'
  check_contains "$directory/script.js" 'removeClock' 'timezone clock missing delete behavior'
  check_contains "$directory/index.html" 'role="combobox"' 'timezone input must expose a searchable combobox'
  check_contains "$directory/index.html" 'role="listbox"' 'timezone dropdown must expose a listbox'
  check_contains "$directory/script.js" 'filterTimeZoneOptions' 'timezone dropdown missing filter behavior'
  check_contains "$directory/script.js" 'getTimeZoneLabel' 'timezone clock missing canonical Chinese label lookup'
  check_contains "$directory/script.js" 'canonicalZoneLabels' 'timezone clock missing IANA alias label support'
  check_contains "$directory/script.js" 'beginClockDrag' 'timezone clocks missing pointer drag behavior'
  check_contains "$directory/script.js" 'syncClockOrderFromDom' 'timezone clocks missing order synchronization'
  check_contains "$directory/script.js" "className = 'drag-handle'" 'timezone clocks missing drag handles'
  check_contains "$directory/script.js" 'drag-preview' 'timezone clocks missing pointer-following drag preview'
  check_contains "$directory/script.js" 'animateClockReflow' 'timezone clocks missing reorder animation'
  check_contains "$directory/index.html" 'role="switch"' 'timezone clock missing hide-seconds switch'
  check_contains "$directory/script.js" 'STORAGE_KEY' 'timezone clock missing local storage key'
  check_contains "$directory/script.js" 'loadState' 'timezone clock missing local storage restore'
  check_contains "$directory/script.js" 'saveState' 'timezone clock missing local storage persistence'
  check_contains "$directory/script.js" 'hideSeconds' 'timezone clock missing hide-seconds behavior'
  check_contains "$directory/script.js" "南非（约翰内斯堡）" 'timezone list missing major African countries'
  check_contains "$directory/script.js" "墨西哥（墨西哥城）" 'timezone list missing major North American countries'
  check_contains "$directory/script.js" "巴西（圣保罗）" 'timezone list missing major South American countries'
  check_contains "$directory/script.js" "澳大利亚（悉尼）" 'timezone list missing major Oceanian countries'
  check_contains "$directory/script.js" "印度（加尔各答）" 'timezone list missing major Asian countries'
}

check_calculator_rsa() {
  check_tool_page 'tools/20260807_multiline-calculator'
  check_tool_page 'tools/20260311_rsa-encrypt'
  check_contains 'tools/20260807_multiline-calculator/script.js' 'const evaluate' 'calculator parser must be preserved'
  check_contains 'tools/20260311_rsa-encrypt/index.html' 'jsencrypt/3.3.2/jsencrypt.min.js' 'RSA page must pin JSEncrypt 3.3.2'
  check_contains 'tools/20260311_rsa-encrypt/script.js' 'formatPublicKey' 'RSA key formatting must be preserved'
  check_absent 'multiline-calculator.html'
  check_absent 'RSA_encrypt.html'
}

check_tax_word() {
  check_tool_page 'tools/20250127_annual-bonus-tax'
  check_tool_page 'tools/20251222_word-filter'
  check_contains 'tools/20250127_annual-bonus-tax/script.js' 'calculatePostTax' 'annual bonus post-tax calculation must be preserved'
  check_contains 'tools/20250127_annual-bonus-tax/script.js' 'calculatePreTax' 'annual bonus pre-tax calculation must be preserved'
  check_contains 'tools/20251222_word-filter/script.js' 'getBaseForm' 'word morphology recognition must be preserved'
  check_absent '年终奖计税.html'
  check_absent '智能单词筛选器.html'
}

case "$group" in
  home)
    check_home
    ;;
  calculator-rsa)
    check_calculator_rsa
    ;;
  tax-word)
    check_tax_word
    ;;
  timezone)
    check_timezone_clock
    ;;
  hash)
    check_hash_generator
    ;;
  password)
    check_password_generator
    ;;
  json)
    check_json_formatter
    ;;
  timestamp)
    check_timestamp_converter
    ;;
  token)
    check_token_inspector
    ;;
  image)
    check_image_converter
    ;;
  encoding)
    check_encoding_converter
    ;;
  json-yaml)
    check_json_yaml_converter
    ;;
  qr)
    check_qr_code_tool
    ;;
  ipv4)
    check_ipv4_subnet_calculator
    ;;
  ip-info)
    check_ip_info_lookup
    ;;
  sql)
    check_sql_formatter
    ;;
  text-list)
    check_text_list_organizer
    ;;
  identifier)
    check_identifier_generator
    ;;
  regex)
    check_regex_tester
    ;;
  text-diff)
    check_text_diff
    ;;
  cron)
    check_cron_expression_tool
    ;;
  theme)
    check_home
    check_theme_contract
    ;;
  all)
    check_home
    check_calculator_rsa
    check_tax_word
    check_timezone_clock
    check_hash_generator
    check_password_generator
    check_json_formatter
    check_timestamp_converter
    check_token_inspector
    check_image_converter
    check_encoding_converter
    check_json_yaml_converter
    check_qr_code_tool
    check_ipv4_subnet_calculator
    check_ip_info_lookup
    check_sql_formatter
    check_text_list_organizer
    check_identifier_generator
    check_regex_tester
    check_text_diff
    check_cron_expression_tool
    check_theme_contract
    ;;
  *)
    printf 'Unknown group: %s\n' "$group" >&2
    exit 2
    ;;
esac

if (( failures > 0 )); then
  printf '%s check(s) failed\n' "$failures"
  exit 1
fi

printf 'PASS: %s structure checks\n' "$group"
