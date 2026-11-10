/**
 * Remark plugin that converts ```mermaid fenced code blocks into
 * <MermaidBlock chart="..." /> JSX elements in the MDX AST.
 * This runs before Shiki so the mermaid source never gets syntax-highlighted.
 */
import { visit } from 'unist-util-visit';

export function remarkMermaid() {
  return (tree) => {
    visit(tree, 'code', (node, index, parent) => {
      if (node.lang !== 'mermaid') return;

      parent.children.splice(index, 1, {
        type: 'mdxJsxFlowElement',
        name: 'MermaidBlock',
        attributes: [
          {
            type: 'mdxJsxAttribute',
            name: 'chart',
            value: node.value,
          },
        ],
        children: [],
        data: { _mdxExplicitJsx: true },
      });
    });
  };
}
