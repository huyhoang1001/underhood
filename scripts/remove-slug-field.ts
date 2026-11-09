#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { load, dump } from 'js-yaml';
import { parseFrontmatter } from '../src/lib/content/parseFrontmatter';
import { ArticleFrontmatterSchema, ExperimentFrontmatterSchema } from '../src/lib/content/schema';

console.log('--- Removing Slug Field & Validating Frontmatter ---');

const contentDirs = [
  { dir: path.resolve(process.cwd(), 'src/content/articles'), schema: ArticleFrontmatterSchema, label: 'articles' },
  { dir: path.resolve(process.cwd(), 'src/content/experiments'), schema: ExperimentFrontmatterSchema, label: 'experiments' }
];

let updatedCount = 0;
let errorCount = 0;

for (const { dir, schema, label } of contentDirs) {
  if (!fs.existsSync(dir)) {
    console.log(`Directory not found: ${dir}`);
    continue;
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.mdx'));
  console.log(`\nProcessing ${files.length} ${label} file(s) in ${dir}:`);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const raw = fs.readFileSync(filePath, 'utf-8');

    try {
      const { data, content } = parseFrontmatter<Record<string, any>>(raw);

      let modified = false;
      if (data && 'slug' in data) {
        delete data.slug;
        modified = true;
        console.log(`  - Removed 'slug' from ${file}`);
      }

      // Validate against Zod schema
      const parsed = schema.safeParse(data);
      if (!parsed.success) {
        console.error(`❌ Validation failed for ${file}:`);
        parsed.error.issues.forEach((e) => console.error(`   - ${e.path.join('.')}: ${e.message}`));
        errorCount++;
        continue;
      }

      // Rebuild markdown file with updated frontmatter
      const newYaml = dump(parsed.data, { indent: 2, lineWidth: -1, sortKeys: false });
      const newFileContent = `---\n${newYaml}---\n\n${content.trimStart()}`;
      fs.writeFileSync(filePath, newFileContent, 'utf-8');
      updatedCount++;
      console.log(`  ✓ Updated & validated ${file}`);
    } catch (err) {
      console.error(`❌ Error processing ${file}:`, err);
      errorCount++;
    }
  }
}

console.log(`\nDone. Updated/validated ${updatedCount} file(s) with ${errorCount} error(s).`);
if (errorCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
