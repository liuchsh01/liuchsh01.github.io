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
  if [[ ! -f "$file" ]] || ! rg -q --fixed-strings "$pattern" "$file"; then
    fail "$label"
  fi
}

check_not_contains() {
  local file="$1"
  local pattern="$2"
  local label="$3"
  if [[ -f "$file" ]] && rg -q "$pattern" "$file"; then
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
  check_contains 'index.html' '实用工具集' 'homepage must identify the toolbox'
  check_contains 'index.html' './tools/20260807_multiline-calculator/' 'homepage missing multiline calculator link'
  check_contains 'index.html' './tools/20260311_rsa-encrypt/' 'homepage missing RSA link'
  check_contains 'index.html' './tools/20250127_annual-bonus-tax/' 'homepage missing annual bonus tax link'
  check_contains 'index.html' './tools/20251222_word-filter/' 'homepage missing word filter link'
  check_contains 'index.html' './tools/20260810_multi-timezone-clock/' 'homepage missing multi-timezone clock link'
  check_not_contains 'index.html' 'on(click|input|change|submit)=' 'homepage must not use inline event handlers'
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
  all)
    check_home
    check_calculator_rsa
    check_tax_word
    check_timezone_clock
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
