# Android signing and manual workflows

Do not distribute an APK until the publication gate and all required reviews have passed. No key or account secret is supplied by this repository. These commands are for a Bash terminal with `keytool`, `base64` and an authenticated `gh` CLI; they are not run by the project.

## 1. Decide whether a new key is appropriate

If an existing Android app should receive updates, first determine its exact application ID and signing certificate. Use the appropriate **existing** key instead of generating a new one; a new ID or incompatible certificate means a different app or a rejected update. The current `com.msadrashakouri.mafatih` ID is provisional and the old ID/key have not been verified.

For a genuinely new app, create a durable key **outside the repository**. This command will not overwrite an existing file:

```bash
mkdir -p "$HOME/.local/share/mafatih-keys"
chmod 700 "$HOME/.local/share/mafatih-keys"
KEYSTORE="$HOME/.local/share/mafatih-keys/mafatih-release.p12"

if [ -e "$KEYSTORE" ]; then
  echo "Not overwriting existing keystore: $KEYSTORE" >&2
else
  keytool -genkeypair -v -storetype PKCS12 -keystore "$KEYSTORE" \
    -alias mafatih -keyalg RSA -keysize 3072 -validity 10000 &&
    chmod 600 "$KEYSTORE"
fi
```

Choose a strong password when prompted. For this new PKCS12 key, use the **same** password for the store and key entry if asked for both; Java PKCS12 tooling may not support different passwords. The certificate identity is public, but the private key and passwords are secret. Make encrypted, recoverable backups in more than one secure place; keep the password separately. Losing the key can prevent normal updates. Never commit the keystore, its base64 form, passwords, or recovery copies.

## 2. Set the four matching Actions secrets

Authenticate separately with `gh auth login` if necessary. The following verifies the password and alias locally, reads the password without echoing it or placing it in command history, and sends the keystore through a pipe rather than leaving a base64 file. It uses the **new PKCS12 key and shared password** described above. Run from a Bash terminal; if using a different shell, an existing key, or different key and store passwords, adapt it carefully.

```bash
KEYSTORE="$HOME/.local/share/mafatih-keys/mafatih-release.p12"
(
  set -euo pipefail
  test -s "$KEYSTORE"
  read -r -s -p 'Keystore password: ' STOREPASS
  printf '\n' >&2
  export STOREPASS
  keytool -list -storetype PKCS12 -keystore "$KEYSTORE" \
    -alias mafatih -storepass:env STOREPASS >/dev/null

  base64 < "$KEYSTORE" | tr -d '\r\n' | \
    gh secret set ANDROID_KEYSTORE_BASE64 --repo MSadraShakouri/mafatih
  printf '%s' "$STOREPASS" | \
    gh secret set ANDROID_KEYSTORE_PASSWORD --repo MSadraShakouri/mafatih
  printf '%s' 'mafatih' | \
    gh secret set ANDROID_KEY_ALIAS --repo MSadraShakouri/mafatih
  printf '%s' "$STOREPASS" | \
    gh secret set ANDROID_KEY_PASSWORD --repo MSadraShakouri/mafatih
  unset STOREPASS
)
```

All four names correspond exactly to `.github/workflows/distribute.yml`. They are repository-level Actions secrets; alternatively, set them for the `android-release` environment and adjust the commands with `gh secret set --env android-release`. Restrict repository/environment access appropriately. A successful CLI operation stores the secret remotely; do not run these commands until you intend to do so. Repository writers who can modify trusted workflow code may be able to expose secrets, so protect `main`, review workflow changes, and consider required reviewers for the release environment.

The workflow decodes the key under the runner's temporary directory with restrictive permissions, uses the other three secrets as environment variables, verifies the APK signature, and removes the file in an `always()` cleanup step. GitHub-hosted runners are ephemeral; cleanup cannot be guaranteed after an abrupt machine failure. Do not use an untrusted self-hosted runner.

## 3. Manual workflow setup, later

1. Document rights, attribution and content/alignment reviews. `npm run check:publication` currently fails; it is a conservative checklist, not legal certification. Do not bypass it merely to obtain an artifact.
2. Decide the permanent application ID, signing key, icon/splash and version policy. Run device/offline tests before distribution. The workflow sets Android `versionCode` from `GITHUB_RUN_NUMBER`: it increases across new runs of this workflow but is unchanged by re-runs, can reset if the workflow is replaced, and may not exceed the code of an older app. Verify and adjust the policy **before** a first release or update.
3. For Pages, select **GitHub Actions** as the Pages source in repository settings and configure the `github-pages` environment as desired. Configure `android-release` environment protection/reviewers if desired; an environment without protection does not itself require approval.
4. From Actions, manually run **Prepare distribution** on `main`. Choose whether to build an APK and whether to deploy Pages; Pages is off by default. The gate precedes artifact upload. The signed APK is an Actions artifact, not an automatically published GitHub Release. No deployment or distribution happens merely from pushing or tagging.

The ordinary **Verify** workflow runs tests/build checks on pushes and pull requests, but signs nothing and uploads or deploys no content. Distribution workflows and secret values have not been run or configured by this project setup.
