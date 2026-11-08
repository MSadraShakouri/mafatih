import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';
import { buildData } from './build-data.js';

/**
 * Serve resolved reader content and the search index from memory in dev, and
 * write them once in builds. Search data is generated, never canonical, and
 * there are no pre-dev shell steps or duplicated public staging trees.
 */
export function runtimeData(): Plugin {
  let config: ResolvedConfig;
  let data: Map<string, string> | undefined;
  let searchBuilt = false;
  const sourceRoot = (): string => path.resolve(process.env.MAFATIH_DATA_ROOT ?? path.join(config.root, 'data'));
  const getData = (withSearch = true): Map<string, string> => {
    if (data && (!withSearch || searchBuilt)) return data;
    const generated = new Map<string, string>();
    buildData({
      quiet: true,
      includeSearch: withSearch,
      root: sourceRoot(),
      onWarning: warning => config.logger.warn(`WARNING: ${warning}`),
      write: (name, value) => generated.set(name, value),
    });
    data = generated;
    searchBuilt = withSearch;
    return data;
  };
  return {
    name: 'mafatih-runtime-data',
    configResolved(value) { config = value; },
    configureServer(server) {
      const root = sourceRoot();
      server.watcher.add(root);
      const invalidate = (file: string): void => {
        const relative = path.relative(root, path.resolve(file));
        if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return;
        data = undefined; searchBuilt = false;
        server.ws.send({ type: 'full-reload', path: '*' });
      };
      server.watcher.on('add', invalidate).on('change', invalidate).on('unlink', invalidate);
      server.middlewares.use((request, response, next) => {
        const url = new URL(request.url ?? '/', 'http://localhost');
        let pathname = url.pathname;
        const base = server.config.base;
        if (base !== '/' && pathname.startsWith(base)) pathname = `/${pathname.slice(base.length)}`;
        if (!pathname.startsWith('/data/')) return next();
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          response.statusCode = 405; response.end(); return;
        }
        try {
          const relative = pathname.slice('/data/'.length);
          const value = getData(relative === 'search-index.json' || relative.startsWith('search/')).get(relative);
          if (value === undefined) { response.statusCode = 404; response.end(); return; }
          response.setHeader('Content-Type', pathname.endsWith('.json') ? 'application/json; charset=utf-8' : 'text/markdown; charset=utf-8');
          response.setHeader('Cache-Control', 'no-cache');
          response.end(request.method === 'HEAD' ? undefined : value);
        } catch (error) { next(error); }
      });
    },
    // Validate before emitting output; runtime data matches build:data byte for byte.
    buildStart() { if (config.command === 'build') getData(); },
    writeBundle() {
      const targetRoot = path.resolve(config.root, config.build.outDir, 'data');
      for (const [name, value] of getData()) {
        const target = path.resolve(targetRoot, name);
        if (!target.startsWith(targetRoot + path.sep)) throw new Error(`Invalid runtime data path: ${name}`);
        mkdirSync(path.dirname(target), { recursive: true });
        writeFileSync(target, value, 'utf8');
      }
    },
  };
}
