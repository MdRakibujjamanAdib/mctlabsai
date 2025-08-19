import { ReactNode } from 'react';
import { processLatexInText, createStepByStepSolution } from './mathRenderer';

export const formatMessageText = (text: string): string => {
  // Escape HTML characters in code blocks
  const escapeHtml = (code: string) => {
    return code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // First, process LaTeX math expressions before other formatting
  text = processLatexInText(text);
  // Split text into lines for proper list handling
  const lines = text.split('\n');
  let htmlOutput = '';
  let listStack: string[] = [];
  let inCodeBlock = false;
  let codeBlockContent = '';
  let codeBlockLanguage = '';
  
  lines.forEach(line => {
    // Handle code blocks
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        // Start of code block
        inCodeBlock = true;
        codeBlockLanguage = line.slice(3).trim() || 'plaintext';
        codeBlockContent = '';
      } else {
        // End of code block
        inCodeBlock = false;
        const escapedCode = escapeHtml(codeBlockContent.trim());
        const codeLines = escapedCode.split('\n').map(line => 
          `<span class="line">${line || ' '}</span>`
        ).join('\n');
        
        htmlOutput += `<div class="code-block">
          <div class="code-header">
            <span class="code-language">${codeBlockLanguage}</span>
          </div>
          <pre><code class="language-${codeBlockLanguage.toLowerCase()}">${codeLines}</code></pre>
        </div>`;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockContent += line + '\n';
      return;
    }


    // Match list items with indentation
    const listMatch = line.match(/^(\s*)[-*•]\s+(.*)/);
    
    if (listMatch) {
      const [_, whitespace, content] = listMatch;
      const indentLevel = Math.floor(whitespace.length / 2); // Assuming 2-space indentation
      
      // Close previous lists if needed
      while (indentLevel < listStack.length) {
        htmlOutput += '</ul>';
        listStack.pop();
      }
      
      // Open new lists if needed
      while (indentLevel > listStack.length) {
        htmlOutput += '<ul class="math-list">';
        listStack.push('ul');
      }
      
      // Add list item with proper indentation and formatting
      const formattedContent = formatInlineElements(content);
      htmlOutput += `<li class="math-list-item">${formattedContent}</li>`;
    } else {
      // Close all lists when encountering non-list item
      while (listStack.length > 0) {
        htmlOutput += '</ul>';
        listStack.pop();
      }
      
      // Process headings and regular text
      if (line.trim()) {
        const formattedLine = formatInlineElements(line);
        if (line.startsWith('###')) {
          htmlOutput += `<h3 class="math-heading-3">${formattedLine.replace(/^###\s*/, '')}</h3>`;
        } else if (line.startsWith('##')) {
          htmlOutput += `<h2 class="math-heading-2">${formattedLine.replace(/^##\s*/, '')}</h2>`;
        } else if (line.startsWith('#')) {
          htmlOutput += `<h1 class="math-heading-1">${formattedLine.replace(/^#\s*/, '')}</h1>`;
        } else if (line.match(/^\d+\.\s/)) {
          // Handle numbered steps
          htmlOutput += `<div class="math-step">${formattedLine}</div>`;
        } else {
          htmlOutput += `<p class="math-paragraph">${formattedLine}</p>`;
        }
      } else {
        htmlOutput += '<div class="math-spacer"></div>';
      }
    }
  });

  // Close any remaining lists
  while (listStack.length > 0) {
    htmlOutput += '</ul>';
    listStack.pop();
  }

  return htmlOutput;
};

// Helper function to format inline elements
function formatInlineElements(text: string): string {
  return text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong class="math-bold">$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em class="math-italic">$1</em>')
    // Strikethrough
    .replace(/~~(.*?)~~/g, '<del class="math-strikethrough">$1</del>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="math-code">$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="math-link" target="_blank" rel="noopener noreferrer">$1</a>')
    // Quotes
    .replace(/^>\s*(.*)$/gm, '<blockquote class="math-quote">$1</blockquote>');
}