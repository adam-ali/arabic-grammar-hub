# Arabic Grammar Hub

Free study notes for classical Arabic grammar, made to sit beside your textbooks while you study:

| Page | What it covers |
| --- | --- |
| [Nahw — Lesson Summaries & Rules](nahw.md) | All 40 lessons of **دُرُوسٌ نَحْوِيَّةٌ مِنَ الْمُقَدِّمَةِ الْآجُرُّومِيَّةِ** (Kalimah Center). Each lesson has the rule in plain English, a worked إِعْرَاب example, edge cases and a self-test. |
| [Sarf Level 2 (Book 1) — Study Plan](sarf-level-2.md) | A 10-week plan for sound three-letter verbs: the past with pronouns, the مُضَارِع, the six أَبْوَاب, the أَمْر, longer verbs and dictionary lookup. |
| [Sarf Level 3 (Book 2) — Study Plan](sarf-level-3.md) | A 21-week plan covering the verb scale, the ten forms, weak and doubled verbs, the passive and using a dictionary. Each lesson has a checkpoint with answers. |

The website turns these notes into a study app: a library of the three books, one page per lesson with questions to test yourself, diagrams and colour-coded grammar terms, a "jump to" sheet, search in Arabic or English, a table of where the books meet, and a progress page with the week-by-week schedules. Progress (revised lessons, checkpoint scores, ticked weeks) is saved in your browser only, and you can export it to a file.

## Read it online

The site is at **https://adam-ali.github.io/arabic-grammar-hub/**. The Markdown files also read fine right here on GitHub.

## Working on the site

The site is built with [Astro](https://astro.build). The three Markdown files are the only source of lesson content: at build time `src/lib/content.ts` splits them into one page per lesson, so to fix a lesson, edit the Markdown.

```bash
npm install
npm run dev      # local server at http://localhost:4321/arabic-grammar-hub/
npm run build    # type-check and build to dist/
```

A few conventions the build relies on:

- Lessons are `###` headings under `## Lessons …` sections: `### 26 — <Arabic title> (p. 126)` for nahw, `### Lesson 6 — <reading> (pp. 77–93) — <topic>` for sarf.
- Labelled paragraphs get their own blocks on the lesson page: `**Rule:**` / `**Goal:**` and `**Edge cases:**` / `**Watch out for:**`. `**Focus drills:**` stays in the Markdown but isn't shown on the site.
- A lesson's questions go under `**Checkpoint:**` as a numbered list, one question per item with its answer after `*Answer:*`:

  ```markdown
  **Checkpoint:**

  1. What case is the فَاعِل?
     *Answer:* مَرْفُوع.
  ```

- Diagrams are fenced code blocks. A `tree` block draws a tree: the first line is the root, `- ` lines are branches and `  - ` lines are leaves. A `parse` block draws a sentence you can tap word by word, one word per line. Both use `label | note`, and an optional `{raf}`, `{nasb}`, `{jarr}`, `{jazm}`, `{verb}` or `{harf}` sets the colour:

  ````markdown
  ```tree
  الْإِعْرَابُ | the four cases
  - الرَّفْعُ | sign: ضَمَّة {raf}
    - اسْم | حَضَرَ مُحَمَّدٌ {raf}
  ```

  ```parse
  الْمَرِيضُ | فَاعِلٌ | raf | فَاعِلٌ مَرْفُوعٌ وَعَلَامَةُ رَفْعِهِ الضَّمَّةُ
  ```
  ````

- In the nahw notes, grammar terms such as فِعْل, فَاعِل, مَفْعُول بِهِ, مَرْفُوع and مَجْرُور are coloured by case automatically. The word list is in `src/lib/markdown.ts`.
- English titles, search keywords and the "where the books meet" table live in `src/lib/meta.ts`.

Pushing to `main` deploys the site with GitHub Actions (`.github/workflows/deploy.yml`).

## How to use the notes

- **Go in order.** Sarf Level 2 comes before Level 3. The nahw notes run alongside both, and each one says where the other book covers the same topic.
- **Keep the book open.** Page numbers are the ones printed in each textbook. The notes summarise and explain the books, but they don't replace their readings or drills.
- **Do the checkpoints without looking.** The answers are in italics underneath each one.

## Textbooks

The textbooks aren't in this repository because they're copyrighted. You'll need your own copies. Everything here is original summary and commentary written for study.

## Corrections and contributions

Found a mistake, a typo in the vowels, or a rule that could be explained better? Please [open an issue](https://github.com/adam-ali/arabic-grammar-hub/issues) or send a pull request. Say which file and lesson it's in, and give the page number in the book if you have it.

## Licence

The notes are licensed under [Creative Commons Attribution 4.0](LICENSE) (CC BY 4.0). You can share, print and adapt them, including for your own classes, as long as you credit this repository.
