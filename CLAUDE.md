# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A pure frontend Chinese classical poetry quiz web app (古诗词储备量量化测试) that quantifies a user's poetry knowledge through adaptive difficulty testing. No backend — open `index.html` directly in a browser to run.

## Architecture

- **index.html** — Single-page app with three views (home, test, result), toggled via `.page.active` CSS class
- **app.js** — Core logic: adaptive difficulty engine, result calculation, page state management. All state lives in `testState` object
- **questions.js** — Question bank (`QUESTION_BANK` array, ~190 items) and `DIFFICULTY_CONFIG` (6 levels). Each question has a `distractors` pool of 7 pre-written wrong answers. Difficulty 1 = elementary school poems, difficulty 2 = middle school poems, difficulty 3 = college/Chinese Poetry Conference level
- **styles.css** — Chinese-style minimal design with CSS custom properties

## Key Algorithms (app.js)

- **Adaptive difficulty**: 3 consecutive correct → level up; 2 consecutive wrong → level down (min level 1, max level 6)
- **Result calculation** (`calculateResult`): Uses "stable mastery" — a level is mastered when ≥60% accuracy with ≥2 questions at that level, checked sequentially from level 1. Base reserve = mastered level's min value. Bonus from higher-level correct answers (+30 each). Fine-tune within mastered level by accuracy × 80% of interval width. Capped at 1200
- **Option generation** (`generateOptions`): Picks 3 unused distractors from the question's pool, shuffles with the correct answer. Global `usedOptionsTexts` Set prevents option text reuse across questions

## Difficulty Levels

| Level | Name | Reserve Range |
|-------|------|---------------|
| 1 | 入门 | 0-200 |
| 2 | 基础 | 200-400 |
| 3 | 进阶 | 400-600 |
| 4 | 提高 | 600-800 |
| 5 | 精通 | 800-1000 |
| 6 | 大神 | 1000-1200 |

## Question Data Format

Each question in `QUESTION_BANK`: `{ id, difficulty, question, fullContent, answer, distractors[7], parse }`. Distractors must match the answer's character count for visual consistency.

## Development

No build tools, package manager, or test framework. Edit files directly and refresh `index.html` in browser. Cache-busting query params (e.g. `?v=5`) are used on script tags in `index.html` — increment when changing JS files.

## Known Issues

See `analysis_and_plan.md` for a detailed audit. Key items: some duplicate distractors in the question bank (e.g. id 68, 100), and distractor quality varies (some overly obvious substitutions).

## Language

UI and content are entirely in Chinese (zh-CN). All user-facing strings, comments, and question content are in Chinese.
