/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
/**
 * Tiny hand-written syntax tokenizer for the CodeDemo snippets (Python, TypeScript, Bash).
 * Deliberately small: it only needs to color the code we ship, not arbitrary programs.
 */

export type HighlightLanguage = 'python' | 'typescript' | 'bash'

export type TokenType =
  | 'plain'
  | 'keyword'
  | 'string'
  | 'comment'
  | 'number'
  | 'function'
  | 'property'
  | 'variable'
  | 'punctuation'

export type Token = { type: TokenType; text: string }

/**
 * Muted palette, primary strings. The colors are the --home-code-* variables in
 * styles/home.css (derived from theme tokens, one value per theme).
 */
export const TOKEN_CLASS: Record<TokenType, string> = {
  plain: 'text-(--home-code-plain)',
  keyword: 'text-(--home-code-keyword)',
  string: 'text-primary',
  comment: 'text-muted-foreground italic',
  number: 'text-(--home-code-number)',
  function: 'text-foreground',
  property: 'text-(--home-code-property)',
  variable: 'text-(--home-code-property)',
  punctuation: 'text-(--home-code-punct)',
}

const KEYWORDS: Record<HighlightLanguage, ReadonlySet<string>> = {
  python: new Set([
    'import',
    'from',
    'as',
    'def',
    'return',
    'if',
    'elif',
    'else',
    'for',
    'in',
    'while',
    'with',
    'class',
    'async',
    'await',
    'lambda',
    'not',
    'and',
    'or',
    'is',
    'True',
    'False',
    'None',
  ]),
  typescript: new Set([
    'import',
    'from',
    'export',
    'default',
    'const',
    'let',
    'var',
    'new',
    'await',
    'async',
    'return',
    'if',
    'else',
    'for',
    'of',
    'in',
    'function',
    'type',
    'interface',
    'true',
    'false',
    'null',
    'undefined',
  ]),
  bash: new Set(['export', 'if', 'then', 'fi', 'for', 'do', 'done']),
}

type Rule = { type: TokenType | 'ident' | 'dq-bash'; re: RegExp }

const STRING_DQ = /"(?:[^"\\\n]|\\.)*"/y
const STRING_SQ = /'(?:[^'\\\n]|\\.)*'/y
const STRING_BT = /`(?:[^`\\]|\\.)*`/y
const NUMBER = /\d+(?:\.\d+)?(?![\w$])/y
const IDENT = /[A-Za-z_$][\w$]*/y
const WHITESPACE = /\s+/y

const RULES: Record<HighlightLanguage, Rule[]> = {
  python: [
    { type: 'comment', re: /#[^\n]*/y },
    { type: 'string', re: STRING_DQ },
    { type: 'string', re: STRING_SQ },
    { type: 'number', re: NUMBER },
    { type: 'ident', re: IDENT },
  ],
  typescript: [
    { type: 'comment', re: /\/\/[^\n]*/y },
    { type: 'string', re: STRING_DQ },
    { type: 'string', re: STRING_SQ },
    { type: 'string', re: STRING_BT },
    { type: 'number', re: NUMBER },
    { type: 'ident', re: IDENT },
  ],
  // In Bash the single quotes wrap a JSON body; they are treated as punctuation so the JSON
  // inside still gets string/number coloring.
  bash: [
    { type: 'comment', re: /(?<![^\s])#[^\n]*/y },
    { type: 'dq-bash', re: STRING_DQ },
    { type: 'variable', re: /\$\{?\w+\}?/y },
    { type: 'keyword', re: /(?<![^\s])--?[A-Za-z][\w-]*/y },
    { type: 'number', re: NUMBER },
    { type: 'ident', re: /[A-Za-z_][\w./:-]*/y },
  ],
}

function classifyIdent(
  lang: HighlightLanguage,
  src: string,
  start: number,
  word: string
): TokenType {
  // Member access (`block.type`) is never a keyword.
  if (KEYWORDS[lang].has(word) && src[start - 1] !== '.') return 'keyword'
  const rest = src.slice(start + word.length, start + word.length + 3)
  if (lang === 'bash') {
    return start === 0 || src[start - 1] === '\n' ? 'function' : 'plain'
  }
  if (/^\s*\(/.test(rest)) return 'function'
  // Python keyword arguments (`base_url=`) and TS object keys (`baseURL:`).
  if (lang === 'python' && /^=(?!=)/.test(rest)) return 'property'
  if (lang === 'typescript' && /^\s*:/.test(rest)) return 'property'
  return 'plain'
}

/** Push a token, merging with the previous one when the type matches. */
function push(out: Token[], type: TokenType, text: string) {
  const last = out.at(-1)
  if (last && last.type === type) last.text += text
  else out.push({ type, text })
}

/** Try each rule at `i`; on a match push the token(s) and return the consumed length (0 = none). */
function matchRule(
  out: Token[],
  rules: Rule[],
  lang: HighlightLanguage,
  src: string,
  i: number
): number {
  for (const rule of rules) {
    rule.re.lastIndex = i
    const m = rule.re.exec(src)
    if (!m || m[0].length === 0) continue
    const text = m[0]
    const isString = rule.type === 'string' || rule.type === 'dq-bash'

    if (rule.type === 'ident') {
      push(out, classifyIdent(lang, src, i, text), text)
    } else if (
      isString &&
      /^\s*:/.test(src.slice(i + text.length, i + text.length + 2))
    ) {
      // Dict / JSON keys: `"role": ...`
      push(out, 'property', text)
    } else if (rule.type === 'dq-bash') {
      // Highlight $VARS inside double-quoted Bash strings.
      for (const part of text.split(/(\$\{?\w+\}?)/)) {
        if (part) push(out, part.startsWith('$') ? 'variable' : 'string', part)
      }
    } else {
      push(out, rule.type, text)
    }
    return text.length
  }
  return 0
}

/** Tokenize a whole source string (multi-line strings and comments are handled correctly). */
export function tokenize(src: string, lang: HighlightLanguage): Token[] {
  const out: Token[] = []
  const rules = RULES[lang]
  let i = 0

  while (i < src.length) {
    WHITESPACE.lastIndex = i
    const ws = WHITESPACE.exec(src)
    if (ws) {
      push(out, 'plain', ws[0])
      i += ws[0].length
      continue
    }
    const consumed = matchRule(out, rules, lang, src, i)
    if (consumed > 0) {
      i += consumed
    } else {
      push(out, 'punctuation', src.charAt(i))
      i += 1
    }
  }
  return out
}

/** Split a token stream into lines, so multi-line tokens render correctly per line. */
export function splitLines(tokens: Token[]): Token[][] {
  const lines: Token[][] = [[]]
  for (const token of tokens) {
    const parts = token.text.split('\n')
    parts.forEach((part, idx) => {
      if (idx > 0) lines.push([])
      if (part) lines.at(-1)?.push({ type: token.type, text: part })
    })
  }
  return lines
}

/** Convenience: tokenize and split into lines. */
export function highlight(src: string, lang: HighlightLanguage): Token[][] {
  return splitLines(tokenize(src, lang))
}
