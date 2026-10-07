/**
 * Styles for the document "paper". One source of truth: used on screen inside the editor and inside the print/PDF window.
 * The paper is always white with dark text, like Word, regardless of the app theme.
 */
export const DOC_CSS = `
.doc-body{font-family:Calibri,Carlito,"Segoe UI",Arial,sans-serif;font-size:11pt;line-height:1.15;color:#111;word-wrap:break-word;overflow-wrap:anywhere}
.doc-body .ProseMirror{outline:none;min-height:100%}
.doc-body p{margin:0 0 8pt}
.doc-body h1{font-family:"Calibri Light",Calibri,Carlito,Arial,sans-serif;font-size:20pt;font-weight:400;line-height:1.15;color:#2f5496;margin:18pt 0 6pt}
.doc-body h2{font-family:"Calibri Light",Calibri,Carlito,Arial,sans-serif;font-size:16pt;font-weight:400;line-height:1.15;color:#2f5496;margin:14pt 0 4pt}
.doc-body h3{font-size:13pt;font-weight:400;line-height:1.15;color:#1f3763;margin:12pt 0 4pt}
.doc-body > :first-child{margin-top:0}
.doc-body strong{font-weight:700}
.doc-body a{color:#0563c1;text-decoration:underline;cursor:pointer}
.doc-body ul,.doc-body ol{margin:0 0 8pt;padding-left:36px}
.doc-body ul{list-style:disc}
.doc-body ol{list-style:decimal}
.doc-body ul ul{list-style:circle}
.doc-body ul ul ul{list-style:square}
.doc-body li{margin:0}
.doc-body li > p{margin:0 0 3pt}
.doc-body ul[data-type="taskList"]{list-style:none;padding-left:4px}
.doc-body ul[data-type="taskList"] > li{display:flex;gap:8px;align-items:flex-start}
.doc-body ul[data-type="taskList"] > li > label{flex:none;margin-top:3px;user-select:none}
.doc-body ul[data-type="taskList"] > li > div{flex:1}
.doc-body ul[data-type="taskList"] input[type="checkbox"]{width:15px;height:15px;accent-color:#2b44ff;cursor:pointer}
.doc-body ul[data-type="taskList"] li[data-checked="true"] > div{color:#6b7280;text-decoration:line-through}
.doc-body blockquote{margin:0 0 8pt 24px;padding:2px 0 2px 14px;border-left:3px solid #b9c0d4;color:#444;font-style:italic}
.doc-body code{font-family:Consolas,"Courier New",monospace;font-size:10pt;background:#f1f3f9;padding:1px 4px;border-radius:3px}
.doc-body pre{font-family:Consolas,"Courier New",monospace;font-size:10pt;background:#f4f5f9;border:1px solid #dde1ee;border-radius:4px;padding:10px 12px;margin:0 0 8pt;white-space:pre-wrap}
.doc-body pre code{background:none;padding:0}
.doc-body mark{background:#ffe45c;color:inherit;padding:0 1px;border-radius:2px}
.doc-body hr{border:0;border-top:1px solid #999;margin:12pt 0}
.doc-body sub,.doc-body sup{font-size:75%}
.doc-body .tableWrapper{overflow-x:auto;margin:0 0 8pt}
.doc-body table{border-collapse:collapse;width:100%;table-layout:fixed;margin:0}
.doc-body td,.doc-body th{border:1px solid #8a8fa3;padding:4px 7px;vertical-align:top;position:relative;min-width:30px;box-sizing:border-box}
.doc-body td > p,.doc-body th > p{margin:0 0 2pt}
.doc-body th{background:#f0f2f8;font-weight:700;text-align:left}
.doc-body .selectedCell:after{content:"";position:absolute;inset:0;background:rgba(43,68,255,.16);pointer-events:none}
.doc-body .column-resize-handle{position:absolute;right:-2px;top:0;bottom:-2px;width:4px;background:#2b44ff;pointer-events:none}
.doc-body.resize-cursor,.doc-body .resize-cursor{cursor:col-resize}
.doc-body div[data-page-break]{position:relative;height:0;margin:22px 0;border-top:2px dashed #b9c0d4;page-break-after:always;break-after:page}
.doc-body div[data-page-break]::after{content:"Page break";position:absolute;left:50%;top:-9px;transform:translateX(-50%);background:#fff;color:#8a8fa3;font:600 10px/1 system-ui,sans-serif;padding:0 8px}
.doc-body p.is-editor-empty:first-child::before{content:attr(data-placeholder);color:#a0a6b8;float:left;height:0;pointer-events:none}
.doc-body ::selection{background:#bcd0ff}
.doc-body .tuon-caret{position:relative;margin-left:-1px;margin-right:-1px;border-left:2px solid var(--caret,#2b44ff);word-break:normal;pointer-events:none}
.doc-body .tuon-caret-label{position:absolute;top:-1.5em;left:-2px;z-index:5;background:var(--caret,#2b44ff);color:#fff;font:600 10px/1 system-ui,sans-serif;letter-spacing:.01em;padding:3px 5px;border-radius:4px 4px 4px 0;white-space:nowrap;user-select:none;pointer-events:none}
.doc-body .tuon-selection{border-radius:2px}
`;
