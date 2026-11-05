/** Guard common build products from being committed. Source data stays in data/. */
export function isGeneratedRepositoryPath(input:string):boolean {
  const p=input.replaceAll('\\','/').replace(/^\.\//,'');
  if(/^(?:generated|reports|dist|build|coverage|node_modules)(?:\/|$)/i.test(p))return true;
  if(/(?:^|\/)(?:node_modules|\.next|\.cache|__pycache__)(?:\/|$)/i.test(p))return true;
  if(/(?:^|\/)search-index\.json$/i.test(p))return true;
  if(/^android\/(?:\.gradle|build|app\/build|app\/src\/main\/assets\/public|capacitor-cordova-android-plugins)(?:\/|$)/i.test(p))return true;
  if(/\.(?:sqlite3?|db)(?:-wal|-shm)?$/i.test(p))return true;
  if(/\.(?:apk|aab|zip|tar|tar\.gz|tar\.xz|tsbuildinfo|jks|keystore|p12|pfx)$/i.test(p))return true;
  return false;
}
