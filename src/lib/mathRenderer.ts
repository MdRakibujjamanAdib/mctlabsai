import katex from 'katex';
import 'katex/dist/katex.min.css';

export interface MathRenderOptions {
  displayMode?: boolean;
  throwOnError?: boolean;
  errorColor?: string;
  macros?: Record<string, string>;
}

export const renderMath = (
  expression: string, 
  options: MathRenderOptions = {}
): string => {
  const defaultOptions: MathRenderOptions = {
    displayMode: false,
    throwOnError: false,
    errorColor: '#cc0000',
    macros: {
      '\\det': '\\operatorname{det}',
      '\\boxed': '\\fbox{$1}',
      '\\pmatrix': '\\begin{pmatrix}#1\\end{pmatrix}',
    },
    ...options
  };

  try {
    return katex.renderToString(expression, defaultOptions);
  } catch (error) {
    console.warn('KaTeX rendering error:', error);
    return `<span class="math-error" style="color: ${defaultOptions.errorColor};">${expression}</span>`;
  }
};

export const processLatexInText = (text: string): string => {
  // Handle display math (block equations) \[ ... \]
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (match, equation) => {
    const rendered = renderMath(equation.trim(), { displayMode: true });
    return `<div class="math-display-wrapper">${rendered}</div>`;
  });

  // Handle inline math \( ... \)
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (match, equation) => {
    const rendered = renderMath(equation.trim(), { displayMode: false });
    return `<span class="math-inline-wrapper">${rendered}</span>`;
  });

  // Handle $$ display math $$
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, equation) => {
    const rendered = renderMath(equation.trim(), { displayMode: true });
    return `<div class="math-display-wrapper">${rendered}</div>`;
  });

  // Handle $ inline math $
  text = text.replace(/\$([^$\n]+)\$/g, (match, equation) => {
    const rendered = renderMath(equation.trim(), { displayMode: false });
    return `<span class="math-inline-wrapper">${rendered}</span>`;
  });

  // Handle boxed expressions
  text = text.replace(/\\boxed\{([^}]+)\}/g, (match, content) => {
    const rendered = renderMath(content.trim(), { displayMode: false });
    return `<div class="math-answer-box"><div class="math-answer-content">${rendered}</div></div>`;
  });
  return text;
};

export const createMathEnvironment = (content: string, type: 'matrix' | 'equation' | 'align' = 'equation'): string => {
  const environments = {
    matrix: `\\begin{pmatrix}${content}\\end{pmatrix}`,
    equation: content,
    align: `\\begin{align}${content}\\end{align}`
  };

  return environments[type];
};

export const formatMatrixFromArray = (matrix: number[][]): string => {
  const matrixContent = matrix
    .map(row => row.join(' & '))
    .join(' \\\\ ');
  
  return createMathEnvironment(matrixContent, 'matrix');
};

export const createStepByStepSolution = (steps: Array<{title: string, content: string, math?: string}>): string => {
  return steps.map((step, index) => {
    const stepNumber = index + 1;
    const mathContent = step.math ? processLatexInText(step.math) : '';
    
    return `
      <div class="solution-step">
        <div class="step-header">
          <span class="step-number">${stepNumber}.</span>
          <span class="step-title">${step.title}</span>
        </div>
        <div class="step-content">
          ${step.content}
          ${mathContent}
        </div>
      </div>
    `;
  }).join('');
};