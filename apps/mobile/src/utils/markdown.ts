function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function markdownToHtml(source: string) {
  if (!source) return '';
  let text = escapeHtml(source).replace(/\r\n/g, '\n');

  text = text.replace(/```([\s\S]*?)```/g, (_m, code) => `<pre><code>${code.trim()}</code></pre>`);
  text = text.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  text = text.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  text = text.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  text = text.replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>');
  text = text.replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>');
  text = text.replace(/(?:<li>[\s\S]*?<\/li>\n?)+/g, (block) => `<ul>${block}</ul>`);
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/\n\n/g, '<br/><br/>');
  text = text.replace(/\n/g, '<br/>');
  // Keep list spacing compact: remove line breaks injected around list tags/items.
  text = text.replace(/<ul>\s*(?:<br\/>)+/g, '<ul>');
  text = text.replace(/(?:<br\/>)+\s*<\/ul>/g, '</ul>');
  text = text.replace(/<\/li>(?:<br\/>)+<li>/g, '</li><li>');
  text = text.replace(/(?:<br\/>)+<li>/g, '<li>');
  text = text.replace(/<\/li>(?:<br\/>)+/g, '</li>');
  return text;
}
