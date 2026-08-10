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
  check_not_contains 'index.html' 'on(click|input|change|submit)=' 'homepage must not use inline event handlers'
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
  all)
    check_home
    check_calculator_rsa
    check_tax_word
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
