# Iglobals-CAuth
Next Application for Cenral Identities for Iglobals users

## SDK Publishing via GitHub Actions

This repository includes a GitHub Action (`.github/workflows/publish-sdks.yml`) that automatically publishes the JS and Python SDKs whenever you create a new **Release** on GitHub, or when you trigger it manually.

### How to set up publishing (One-time setup):

To allow GitHub to publish on your behalf, you need to create access tokens and save them as "Secrets" in your GitHub repository.

#### 1. Get your NPM Token (for JS SDK)
1. Go to [npmjs.com](https://www.npmjs.com/) and create an account if you don't have one.
2. Click your profile picture (top right) -> **Access Tokens**.
3. Click **Generate New Token** -> Choose **Classic Token** (or Granular).
4. Give it a name (e.g., "GitHub Actions iGlobals"), select **Publish** permissions, and generate it.
5. Copy the token (it starts with `npm_...`).

#### 2. Get your PyPI Token (for Python SDK)
1. Go to [pypi.org](https://pypi.org/) and create an account.
2. Click your profile name (top right) -> **Account settings**.
3. Scroll down to **API tokens** and click **Add API token**.
4. Give it a name, select scope **Entire account** (or specific project if created already), and generate it.
5. Copy the token (it starts with `pypi-...`).

#### 3. Add Tokens to GitHub
1. Go to this repository on GitHub.
2. Click **Settings** (the gear icon at the top).
3. On the left sidebar, scroll down to **Secrets and variables** -> **Actions**.
4. Click **New repository secret**.
5. Name: `NPM_TOKEN`, Secret: paste your npm token. Click Add.
6. Click **New repository secret** again.
7. Name: `PYPI_TOKEN`, Secret: paste your pypi token. Click Add.

### How to publish:
Once the secrets are added, the SDKs will automatically publish every time you publish a **Release** on GitHub. 
You can also trigger it manually by going to the **Actions** tab in GitHub, clicking **Publish SDKs**, and clicking **Run workflow**.