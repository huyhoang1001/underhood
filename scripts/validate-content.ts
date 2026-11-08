#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from '../src/lib/content/parseFrontmatter';
import { ArticleFrontmatterSchema, ExperimentFrontmatterSchema } from '../src/lib/content/schema';

console.log('--- Underhood Content Validation ---');

const articlesDir = path.resolve(process.cwd(), 'content/articles');
const experimentsDir = path.resolve(process.cwd(), 'content/experiments');

let hasError = false;
const articleSlugs = new Set<string>();
const experimentSlugs = new Set<string>();

// 1. Validate Articles
if (fs.existsSync(articlesDir)) {
  const articleFiles = fs.readdirSync(articlesDir).filter((f) => f.endsWith('.mdx') && !f.startsWith('TEMPLATE'));
  console.log(`Found ${articleFiles.length} article(s) in content/articles:`);

  for (const file of articleFiles) {
    const filePath = path.join(articlesDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data } = parseFrontmatter(content);

    const parsed = ArticleFrontmatterSchema.safeParse(data);
    if (!parsed.success) {
      console.error(`❌ Validation failed in ${file}:`);
      parsed.error.issues.forEach((e) => console.error(`   - ${e.path.join('.')}: ${e.message}`));
      hasError = true;
    } else {
      if (articleSlugs.has(parsed.data.slug)) {
        console.error(`❌ Duplicate slug '${parsed.data.slug}' found in ${file}`);
        hasError = true;
      }
      articleSlugs.add(parsed.data.slug);
      console.log(`  ✓ ${file} -> slug: '${parsed.data.slug}' [status: ${parsed.data.status}]`);
    }
  }
} else {
  console.log('No content/articles directory found.');
}

// 2. Validate Experiments
if (fs.existsSync(experimentsDir)) {
  const experimentFiles = fs.readdirSync(experimentsDir).filter((f) => f.endsWith('.mdx'));
  console.log(`\nFound ${experimentFiles.length} experiment(s) in content/experiments:`);

  for (const file of experimentFiles) {
    const filePath = path.join(experimentsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data } = parseFrontmatter(content);

    const parsed = ExperimentFrontmatterSchema.safeParse(data);
    if (!parsed.success) {
      console.error(`❌ Validation failed in ${file}:`);
      parsed.error.issues.forEach((e) => console.error(`   - ${e.path.join('.')}: ${e.message}`));
      hasError = true;
    } else {
      if (experimentSlugs.has(parsed.data.slug)) {
        console.error(`❌ Duplicate slug '${parsed.data.slug}' found in ${file}`);
        hasError = true;
      }
      experimentSlugs.add(parsed.data.slug);
      console.log(`  ✓ ${file} -> slug: '${parsed.data.slug}' [status: ${parsed.data.status}]`);
    }
  }
} else {
  console.log('No content/experiments directory found.');
}

if (hasError) {
  console.error('\n❌ Content validation failed. Fix the errors above.');
  process.exit(1);
} else {
  console.log('\n✅ All content files validated successfully against schema.');
  process.exit(0);
}
