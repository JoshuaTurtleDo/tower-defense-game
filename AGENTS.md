# Project collaboration instructions

## Git and GitHub

- The project owner is new to Git and GitHub. Handle routine Git operations for them and explain the outcome in plain language instead of expecting them to know Git commands.
- Use the `main` branch for all work unless the user explicitly requests a different branch. Do not create feature branches by default.
- When the user asks to push or save changes to GitHub, inspect the repository status and diff, stage only the intended project changes, create a concise and descriptive commit message based on the actual work, commit the changes, and push `main` to `origin`.
- Never commit secrets, credentials, dependency folders, generated temporary files, or unrelated changes.
- After substantial changes, or after several cumulative unpushed changes, remind the user that pushing to GitHub would create a safe checkpoint. Do not push automatically unless the user asks.
- After a push, report the commit summary and whether the remote update succeeded.
