import { config, fields, collection } from '@keystatic/core';
import { block } from '@keystatic/core/content-components';

const NodeProcessDiagramBlock = block({
  label: 'Node.js Process Diagram',
  schema: {}
});

const NodeThreadpoolVisualizerBlock = block({
  label: 'Node.js Threadpool Visualizer',
  schema: {}
});

const ThreadPoolVisualizerBlock = block({
  label: 'Thread Pool Visualizer',
  schema: {}
});

const TokioArchitectureDiagramBlock = block({
  label: 'Tokio Architecture Diagram',
  schema: {}
});

export default config({
  storage: {
    kind: 'github',
    repo: 'huyhoang1001/underhood',
  },
  collections: {
    articles: collection({
      label: 'Articles',
      slugField: 'title',
      path: 'src/content/articles/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: 'Title' }),
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
        relatedArticles: fields.array(fields.text({ label: 'Related Article Slug' }), {
          label: 'Related Articles',
          itemLabel: (props) => props.value
        }),
        relatedExperiments: fields.array(fields.text({ label: 'Related Experiment Slug' }), {
          label: 'Related Experiments',
          itemLabel: (props) => props.value
        }),
        content: fields.mdx({
          label: 'Content',
          components: {
            NodeProcessDiagram: NodeProcessDiagramBlock,
            NodeThreadpoolVisualizer: NodeThreadpoolVisualizerBlock,
            ThreadPoolVisualizer: ThreadPoolVisualizerBlock,
            TokioArchitectureDiagram: TokioArchitectureDiagramBlock
          }
        })
      }
    }),
    experiments: collection({
      label: 'Experiments',
      slugField: 'title',
      path: 'src/content/experiments/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: 'Title' }),
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
          label: 'Content',
          components: {
            NodeProcessDiagram: NodeProcessDiagramBlock,
            NodeThreadpoolVisualizer: NodeThreadpoolVisualizerBlock,
            ThreadPoolVisualizer: ThreadPoolVisualizerBlock,
            TokioArchitectureDiagram: TokioArchitectureDiagramBlock
          }
        })
      }
    })
  }
});
