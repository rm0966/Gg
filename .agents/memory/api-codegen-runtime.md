---
name: API codegen runtime
description: Node.js version requirement and output behavior for the workspace's OpenAPI generator.
---

Run OpenAPI code generation with Node.js 24. The imported Replit configuration used Node.js 20, which does not provide `Map.groupBy`; Orval's Zod generator failed after cleaning its generated output directory.

**Why:** The import's default Node.js runtime was older than the workspace's code-generation dependency.

**How to apply:** Before running `pnpm --filter @workspace/api-spec run codegen`, check `node --version`. If generation fails with `Map.groupBy is not a function`, use Node.js 24 and rerun codegen to restore all generated files.
