// Use the same Vite/Vinext build stages as the CLI, then let Node close its
// native workers naturally. The CLI's immediate process.exit races libuv on Windows.
process.env.NODE_ENV = 'production';
const { createBuilder } = await import('vite');
const { runPrerender } = await import('vinext/internal/build/run-prerender');
const builder = await createBuilder({ mode: 'production' });
await builder.buildApp();
const rendered = await runPrerender({ root: process.cwd() });
if (!rendered?.routes.some((route) => route.status === 'rendered')) {
  throw new Error('Static build produced no rendered routes');
}
console.log('Local static build complete.');
