import { config, fields, collection } from '@keystatic/core';

export default config({
  storage: {
    kind: 'local'
  },
  collections: {
    articles: collection({
      label: 'Articles',
      slugField: 'title',
      path: 'src/content/articles/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        description: fields.text({ label: 'Description', multiline: true }),
        date: fields.date({ label: 'Publication Date' }),
        status: fields.select({
          label: 'Status',
          options: [
            { label: 'Draft', value: 'draft' },
            { label: 'Published', value: 'published' }
          ],
          defaultValue: 'draft'
        }),
        topic: fields.select({
          label: 'Topic',
          options: [
            { label: 'Distributed Systems', value: 'distributed-systems' },
            { label: 'Backend Engineering', value: 'backend-engineering' },
            { label: 'Performance', value: 'performance' },
            { label: 'System Design', value: 'system-design' },
            { label: 'Cloud Infrastructure', value: 'cloud-infrastructure' },
            { label: 'Engineering Experiments', value: 'engineering-experiments' },
            { label: 'Lessons Learned', value: 'lessons-learned' }
          ],
          defaultValue: 'backend-engineering'
        }),
        tags: fields.array(fields.text({ label: 'Tag' }), {
          label: 'Tags',
          itemLabel: (props) => props.value
        }),
        featured: fields.checkbox({ label: 'Featured Article', defaultValue: false }),
        githubUrl: fields.text({ label: 'GitHub Repository URL' }),
        content: fields.mdx({
          label: 'Content'
        })
      }
    }),
    experiments: collection({
      label: 'Experiments',
      slugField: 'title',
      path: 'src/content/experiments/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        tagline: fields.text({ label: 'Tagline', multiline: true }),
        date: fields.date({ label: 'Date' }),
        status: fields.select({
          label: 'Status',
          options: [
            { label: 'Draft', value: 'draft' },
            { label: 'Published', value: 'published' }
          ],
          defaultValue: 'draft'
        }),
        topic: fields.select({
          label: 'Topic',
          options: [
            { label: 'Distributed Systems', value: 'distributed-systems' },
            { label: 'Backend Engineering', value: 'backend-engineering' },
            { label: 'Performance', value: 'performance' },
            { label: 'System Design', value: 'system-design' },
            { label: 'Cloud Infrastructure', value: 'cloud-infrastructure' },
            { label: 'Engineering Experiments', value: 'engineering-experiments' },
            { label: 'Lessons Learned', value: 'lessons-learned' }
          ],
          defaultValue: 'backend-engineering'
        }),
        hypothesis: fields.text({ label: 'Hypothesis', multiline: true }),
        setup: fields.text({ label: 'Test Setup', multiline: true }),
        implementation: fields.text({ label: 'Implementation Details', multiline: true }),
        keyFindings: fields.array(fields.text({ label: 'Key Finding' }), {
          label: 'Key Findings',
          itemLabel: (props) => props.value
        }),
        limitations: fields.array(fields.text({ label: 'Limitation' }), {
          label: 'Limitations',
          itemLabel: (props) => props.value
        }),
        githubRepo: fields.text({ label: 'GitHub Repo' }),
        relatedArticleSlug: fields.text({ label: 'Related Article Slug' }),
        interactiveType: fields.select({
          label: 'Interactive Visualizer Type',
          options: [
            { label: 'Node Threadpool', value: 'node-threadpool' },
            { label: 'Queue Backpressure', value: 'queue-backpressure' },
            { label: 'gRPC Multiplex', value: 'grpc-multiplex' },
            { label: 'Cache Invalidation', value: 'cache-invalidation' }
          ],
          defaultValue: 'node-threadpool'
        }),
        content: fields.mdx({
          label: 'Content'
        })
      }
    })
  }
});
