import { Fragment } from "react";

function renderInlineMarkdown(text) {
  const segments = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^\)]+\))/g;
  let cursor = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      segments.push(text.slice(cursor, match.index));
    }

    const token = match[0];

    if (token.startsWith("**") && token.endsWith("**")) {
      segments.push(
        <strong key={`${match.index}-strong`}>{token.slice(2, -2)}</strong>,
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      segments.push(<code key={`${match.index}-code`}>{token.slice(1, -1)}</code>);
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^\)]+)\)$/);
      if (linkMatch) {
        segments.push(
          <a
            key={`${match.index}-link`}
            href={linkMatch[2]}
            rel="noreferrer"
            target="_blank"
          >
            {linkMatch[1]}
          </a>,
        );
      } else {
        segments.push(token);
      }
    }

    cursor = pattern.lastIndex;
  }

  if (cursor < text.length) {
    segments.push(text.slice(cursor));
  }

  return segments;
}

function renderLine(line, index) {
  if (!line.trim()) {
    return null;
  }

  if (line.startsWith("### ")) {
    return <h3 key={index}>{renderInlineMarkdown(line.slice(4))}</h3>;
  }

  if (line.startsWith("## ")) {
    return <h2 key={index}>{renderInlineMarkdown(line.slice(3))}</h2>;
  }

  if (line.startsWith("# ")) {
    return <h1 key={index}>{renderInlineMarkdown(line.slice(2))}</h1>;
  }

  if (line.startsWith("- ")) {
    return <li key={index}>{renderInlineMarkdown(line.slice(2))}</li>;
  }

  return <p key={index}>{renderInlineMarkdown(line)}</p>;
}

export default function MarkdownPreview({
  content = "",
  emptyMessage = "Nothing to preview yet.",
}) {
  const lines = String(content).split("\n");

  if (!content.trim()) {
    return (
      <section className="markdown-preview panel" aria-live="polite">
        <p className="muted">{emptyMessage}</p>
      </section>
    );
  }

  const blocks = [];
  let listItems = [];

  lines.forEach((line, index) => {
    if (line.startsWith("- ")) {
      listItems.push(line);
      return;
    }

    if (listItems.length > 0) {
      blocks.push(
        <ul key={`list-${index}`}>
          {listItems.map((item, itemIndex) => (
            <Fragment key={`${index}-item-${itemIndex}`}>
              {renderLine(item, `${index}-${itemIndex}`)}
            </Fragment>
          ))}
        </ul>,
      );
      listItems = [];
    }

    const block = renderLine(line, index);
    if (block) {
      blocks.push(block);
    }
  });

  if (listItems.length > 0) {
    blocks.push(
      <ul key="list-last">
        {listItems.map((item, itemIndex) => (
          <Fragment key={`last-item-${itemIndex}`}>
            {renderLine(item, `last-${itemIndex}`)}
          </Fragment>
        ))}
      </ul>,
    );
  }

  return <section className="markdown-preview panel">{blocks}</section>;
}
