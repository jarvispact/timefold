const menuDivStyle: Partial<CSSStyleDeclaration> = {
    position: 'fixed',
    top: '10px',
    left: '10px',
    zIndex: '10',
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
};

const buttonStyle: Partial<CSSStyleDeclaration> = {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    flexShrink: '0',
};

const kebabize = (str: string) => str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, ($, ofs) => (ofs ? '-' : '') + $.toLowerCase());

const toInlineStyle = (style: Partial<CSSStyleDeclaration>) =>
    Object.keys(style)
        .map((key) => `${kebabize(key)}: ${style[key as never]};`)
        .join('');

export const examples = [
    'interleaved-number-array',
    'interleaved-typed-array',
    'interleaved-number-array-indexed',
    'interleaved-typed-array-indexed',
    'non-interleaved-number-array',
    'non-interleaved-typed-array',
    'non-interleaved-number-array-indexed',
    'non-interleaved-typed-array-indexed',
    'merge-by-material',
] as const;

const menuHtml = `
<div style="${toInlineStyle(menuDivStyle)}">
    ${examples.map((example) => `<button id="${example}" style="${toInlineStyle(buttonStyle)}">${example}</button>`).join('\n')}
</div>
`;

const menuNode = document.createElement('div');
menuNode.innerHTML = menuHtml;

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.parentNode?.insertBefore(menuNode, canvas.nextSibling);
