# Notes for Claude

**Start every session by reading `memory.md`, sections 1–6.** It holds the project memory: what's built, the working rules, decisions, setup and open items. Section 7 is the full conversation log; search it when you need the history behind something.

## Rules (from the owner)

- **Branches:** work on a feature branch only. Never push to or merge into `main` until the owner says to publish or "make it live". Then open a pull request into `main`. Don't open pull requests otherwise.
- **Design:** match the Figma design exactly. Read real values from Figma; see `memory.md` §1 for file and node ids.
- **Public repo:** never write secrets, tokens, personal emails or private matters into the repo, commits or `memory.md`.

## Keeping memory.md current (the owner asked for this)

- **The log (§7):** at the end of every reply, as the last step, run `node scripts/memory/update-memory.mjs`.
  - It adds the latest messages to the conversation log in `memory.md`, then commits and pushes that file on the feature branch. It never does this on `main`.
  - It finds the current session's transcript by itself.
  - Don't edit or regenerate old log entries.
- **Hand-written sections:** whenever decisions, status, setup or open items change, update `memory.md` §3–6 in the same commit as the change.
- **Private messages:** if the owner shares something private (accounts, credentials, personal matters), run `node scripts/memory/update-memory.mjs --hide-last` before updating the log. Add `--message-only` to hide just their message and any token talk while keeping the rest of your reply.
