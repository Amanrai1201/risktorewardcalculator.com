/**
 * Minimal markdown-to-HTML renderer for article body content.
 *
 * Handles: headings, bold, tables, blockquotes, ordered/unordered lists,
 * inline code, and paragraph breaks. Not a full CommonMark implementation —
 * it only needs to cover the subset used in src/data/articles.ts.
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineMarkdown(text: string): string {
  return (
    text
      // Escape HTML first
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Bold **text**
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Inline code `code`
      .replace(/`([^`]+)`/g, '<code class="font-mono text-sm bg-surface-2 px-1 py-0.5 rounded-xs">$1</code>')
      // Emoji passthrough (already text)
      // Links [text](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="underline decoration-hairline-strong underline-offset-2 hover:text-ink">$1</a>')
  );
}

function parseTable(lines: string[]): string {
  const rows = lines.map((line) =>
    line
      .split('|')
      .filter((_, i, arr) => i > 0 && i < arr.length - 1)
      .map((cell) => cell.trim()),
  );

  const [header, , ...body] = rows;

  const ths = header.map((h) => `<th class="px-4 py-2 text-left text-caption font-semibold text-ink-subtle uppercase tracking-wider">${inlineMarkdown(h)}</th>`).join('');
  const trs = body
    .map(
      (row) =>
        `<tr class="border-t border-hairline">${row.map((cell) => `<td class="px-4 py-2 text-body-sm text-ink-muted figures">${inlineMarkdown(cell)}</td>`).join('')}</tr>`,
    )
    .join('');

  return `<div class="overflow-x-auto -mx-1"><table class="w-full text-left border-collapse"><thead><tr class="border-b border-hairline">${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
}

export function renderMarkdown(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Empty line — paragraph break
    if (line.trim() === '') {
      i++;
      continue;
    }

    // ATX headings
    const h3 = line.match(/^### (.+)/);
    if (h3) {
      out.push(`<h3 class="text-heading-md text-ink font-semibold mt-8 mb-3">${inlineMarkdown(h3[1])}</h3>`);
      i++;
      continue;
    }
    const h2 = line.match(/^## (.+)/);
    if (h2) {
      out.push(`<h2 class="text-headline text-ink font-semibold mt-10 mb-4">${inlineMarkdown(h2[1])}</h2>`);
      i++;
      continue;
    }
    const h4 = line.match(/^#### (.+)/);
    if (h4) {
      out.push(`<h4 class="text-card-title text-ink font-semibold mt-6 mb-2">${inlineMarkdown(h4[1])}</h4>`);
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const bqLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        bqLines.push(lines[i].slice(2));
        i++;
      }
      out.push(
        `<blockquote class="my-4 border-l-2 border-primary pl-4 text-body-sm text-ink-muted font-mono">${bqLines.map(inlineMarkdown).join('<br>')}</blockquote>`,
      );
      continue;
    }

    // Table (starts with |)
    if (line.startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        // skip separator lines like |---|---|
        if (!lines[i].match(/^\|[\s\-|]+\|$/)) {
          tableLines.push(lines[i]);
        } else {
          // keep separator as marker — include it
          tableLines.push(lines[i]);
        }
        i++;
      }
      out.push(`<div class="my-4">${parseTable(tableLines)}</div>`);
      continue;
    }

    // Ordered list
    if (/^\d+\. /.test(line)) {
      const listLines: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        listLines.push(lines[i].replace(/^\d+\. /, ''));
        i++;
      }
      const items = listLines.map((l) => `<li class="flex gap-2"><span class="shrink-0 mt-0.5 size-5 flex items-center justify-center rounded-full bg-surface-2 text-caption font-semibold text-ink figures">${listLines.indexOf(l) + 1}</span><span>${inlineMarkdown(l)}</span></li>`).join('');
      out.push(`<ol class="space-y-2 my-4">${items}</ol>`);
      continue;
    }

    // Unordered list (- or *)
    if (/^[-*] /.test(line)) {
      const listLines: string[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        listLines.push(lines[i].replace(/^[-*] /, ''));
        i++;
      }
      const items = listLines.map((l) => `<li class="flex gap-2"><span class="shrink-0 mt-2 size-1.5 rounded-full bg-ink-subtle"></span><span>${inlineMarkdown(l)}</span></li>`).join('');
      out.push(`<ul class="space-y-1.5 my-4">${items}</ul>`);
      continue;
    }

    // Bold standalone heading pattern (line is all **text**)
    if (/^\*\*[^*]+\*\*$/.test(line.trim())) {
      out.push(`<p class="mt-6 mb-2 text-card-title font-semibold text-ink">${inlineMarkdown(line.trim())}</p>`);
      i++;
      continue;
    }

    // Regular paragraph
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('>') &&
      !lines[i].startsWith('|') &&
      !/^\d+\. /.test(lines[i]) &&
      !/^[-*] /.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      out.push(`<p class="text-body text-ink-muted leading-relaxed">${inlineMarkdown(paraLines.join(' '))}</p>`);
    }
  }

  return out.join('\n');
}
