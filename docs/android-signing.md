# Android signing and tag workflows

**A pushed `v*` tag (including `v0.1.0`) can publish both the APK on GitHub Releases and the website on GitHub Pages.** The workflows deliberately build without running the publication gate. Source permissions and content reviews remain unresolved; review [publishing](publishing.md) and [rights](rights-review.md) before distributing. A debug signature is not a production-release signing policy.

## Stable debug key

The Android workflow follows Satr: it builds a **debug** APK using one fixed key, so builds with the same application ID and certificate can update each other. It expects the repository Actions secret `ANDROID_KEYSTORE_BASE64` to contain a PKCS12 keystore with alias `mafatih` and the store and key password `android`. That public password is the Satr-style debug convention, **not strong protection for a production key**. Keep the keystore itself secret, and do not commit it or its base64 form. The workflow decodes it into the runner's temporary directory and removes it afterward.

The current application ID `com.msadrashakouri.mafatih` is provisional. If an existing app must receive updates, first verify its application ID and existing signing certificate. A newly generated key will not update an app signed by a different key. The fixed debug key must be preserved securely across builds; losing it breaks that update path.

If a new, separate debug key is appropriate, the following commands create one outside the repository without overwriting an existing file. Run them yourself in a Bash terminal with `keytool`, `base64` and an authenticated `gh` CLI; the repository does not execute them:

```bash
mkdir -p "$HOME/.local/share/mafatih-keys"
chmod 700 "$HOME/.local/share/mafatih-keys"
KEYSTORE="$HOME/.local/share/mafatih-keys/mafatih-debug.p12"

if [ -e "$KEYSTORE" ]; then
  echo "Not overwriting existing keystore: $KEYSTORE" >&2
else
  keytool -genkeypair -storetype PKCS12 -keystore "$KEYSTORE" \
    -alias mafatih -storepass android -keypass android \
    -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=Mafatih' &&
    chmod 600 "$KEYSTORE"
fi
```

After checking that this is the key you intend to use, upload it as the repository secret without leaving a base64 file:

```bash
KEYSTORE="$HOME/.local/share/mafatih-keys/mafatih-debug.p12"
base64 < "$KEYSTORE" | tr -d '\r\n' | \
  gh secret set ANDROID_KEYSTORE_BASE64 --repo MSadraShakouri/mafatih
```

Do not upload an unrelated keystore from another project unless it has the required alias/password and is deliberately the intended signing identity. The workflow compares the APK signing certificate with the configured keystore and fails if they differ. A GitHub Actions artifact is not automatically private merely because it is a debug build; its accessibility follows repository and Actions permissions.

For local builds, no signing variables means Android's ordinary debug key. Supplying all four `ANDROID_KEYSTORE_FILE`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD` signs a local debug or release build with the supplied key; partial configuration fails. The tag workflow itself uses only the one base64 secret and builds `assembleDebug`, not `assembleRelease`.

## Triggering builds and Pages

- A push of `v*`, such as `v0.1.0` or `v0.2.0-beta.1`, starts **both** workflows on that tagged commit. Android uploads an Actions artifact and creates/updates a GitHub Release with the APK; Pages deploys separately. The workflows do not run tests or `check:publication`.
- A manual **Build Android APK** run on a branch uploads an Actions artifact without creating a Release. A manual run selecting a `v*` tag also creates/updates that tag's Release. A manual **Deploy GitHub Pages** run deploys the selected ref.
- Android's version name comes from the tag without its `v`; manual branch builds use the latest reachable `v*` tag plus the run number. Its version code is the tagged commit count, as in Satr. Re-runs of the same commit have the same code; tags on older commits can have lower codes. Check compatibility with any installed app before distributing.
- In repository **Settings → Pages**, set **Source** to **GitHub Actions**. The workflow attempts this on a best-effort basis, but its token may not have permission. In **Settings → Environments → github-pages**, allow tag pattern `v*` if deployment rules restrict refs; also allow a branch such as `main` if you want manual branch deployments. Repository policy must allow the workflow's `contents: write` permission for GitHub Release creation.

Pushing a tag does not wait for or depend on the other workflow: the APK Release and Pages deployment can succeed or fail independently. No workflow is triggered on ordinary branch pushes or pull requests. The previous Verify workflow was removed; the existing local test commands are unchanged. See [web and Android architecture](web-android.md) for the build paths.
