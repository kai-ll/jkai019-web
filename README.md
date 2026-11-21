# JKAI GLB Viewer — GitHub Pages

Deployment copy of [jkai019-gpt](https://github.com/kai-ll/jkai019-gpt).

## GitHub Pages activation

In this repository, go to **Settings → Pages → Build and deployment → Source: GitHub Actions**. The workflow at `.github/workflows/deploy.yml` builds the Vite app and deploys `dist/` whenever `main` changes.

Expected URL: https://kai-ll.github.io/jkai019-web/

## Google Drive OAuth

1. Enable the Google Drive API in a Google Cloud project.
2. Create an OAuth Web application client and add `https://kai-ll.github.io` to **Authorized JavaScript origins**.
3. Add the Google account to OAuth test users where required.
4. Optionally add repository **Settings → Secrets and variables → Actions → Variables → GOOGLE_CLIENT_ID**. Alternatively, paste the OAuth Client ID into the viewer (it is saved locally in your browser).
5. Open `https://kai-ll.github.io/jkai019-web/?fileId=1cWWxG5y5RXwgzHHjzCaQAZdHmD2XHOqT`, connect Google Drive, and click **Drive에서 열기**.

The Drive file remains private and is accessed with the signed-in user's Google authorization. Google OAuth Client ID is public configuration, not a secret.

## Source synchronization

This repository currently contains a snapshot of the source from `jkai019-gpt`. Updates to `jkai019-gpt` do **not** yet automatically synchronize here. Future changes must be copied or an authenticated cross-repository synchronization workflow added.
