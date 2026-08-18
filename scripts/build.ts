// `bun build` (CLI) has no --plugin flag, and bunfig's [serve.static] plugins
// only apply to the dev server, so the production bundle is built here where
// the Tailwind plugin can be passed explicitly.
import tailwind from "bun-plugin-tailwind"

const result = await Bun.build({
  entrypoints: ["src/index.html"],
  outdir: "dist",
  target: "browser",
  minify: true,
  sourcemap: "linked",
  plugins: [tailwind],
})

if (!result.success) {
  for (const log of result.logs) console.error(log)
  process.exit(1)
}

for (const output of result.outputs) {
  console.log(`${output.path.replace(`${process.cwd()}/`, "")}  ${(output.size / 1024).toFixed(1)} KB`)
}
