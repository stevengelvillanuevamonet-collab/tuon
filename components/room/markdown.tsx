"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SKIP, visit } from "unist-util-visit";
import type { PhrasingContent, Root, Text } from "mdast";

/** Turns ==text== into <mark>text</mark>, the highlighter motif. */
function remarkMark() {
  return (tree: Root) => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (!parent || index === undefined) return;
      const re = /==([^=\n]+)==/g;
      const value = node.value;
      const out: PhrasingContent[] = [];
      let last = 0;
      let match: RegExpExecArray | null;
      while ((match = re.exec(value))) {
        if (match.index > last) out.push({ type: "text", value: value.slice(last, match.index) });
        out.push({
          type: "emphasis",
          data: { hName: "mark" },
          children: [{ type: "text", value: match[1] }],
        } as PhrasingContent);
        last = match.index + match[0].length;
      }
      if (out.length === 0) return;
      if (last < value.length) out.push({ type: "text", value: value.slice(last) });
      parent.children.splice(index, 1, ...out);
      return [SKIP, index + out.length];
    });
  };
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMark]}
        components={{
          a: ({ node: _n, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer nofollow" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
