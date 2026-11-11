export const ART_LAB_CSS = `
html,body { overflow: auto; height: auto; min-height:100%; background:#101b28; }
#game-root,#ui-root { display:none; }
.art-lab { --gold:#f5cf59; --muted:#9baebb; max-width:1360px; margin:auto; padding:26px 28px 38px; color:#edf0e9; }
.art-lab * { box-sizing:border-box; }
.art-lab [hidden] { display:none !important; }
.art-lab .contact-controls { display:flex; flex-wrap:wrap; align-items:end; gap:8px; margin:10px 0 14px; }
.art-lab .contact-controls label { min-width:180px; flex:1; }
.art-lab .mode-switch { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:10px; }
.art-lab.recognition .pitch { height:390px; }
.art-lab header { display:flex; align-items:center; justify-content:space-between; gap:20px; margin-bottom:24px; }
.art-lab .eyebrow { color:var(--gold); font:600 12px 'IBM Plex Mono',monospace; letter-spacing:2px; text-transform:uppercase; margin:0 0 7px; }
.art-lab h1 { font:600 42px/1 'Barlow Condensed',sans-serif; margin:0; text-transform:uppercase; letter-spacing:.5px; }
.art-lab .intro { color:var(--muted); font-size:13px; margin:9px 0 0; }
.art-lab a { color:#e5e9e4; text-decoration:none; border-bottom:1px solid #53616c; padding:8px 0; font-size:13px; }
.art-lab button,.art-lab select { font:500 13px 'IBM Plex Sans',sans-serif; min-height:42px; color:#e9eee7; background:#203141; border:1px solid #40515c; border-radius:5px; padding:8px 13px; cursor:pointer; }
.art-lab button:hover,.art-lab select:hover { border-color:var(--gold); }
.art-lab button:focus-visible,.art-lab select:focus-visible,.art-lab input:focus-visible,.art-lab a:focus-visible { outline:2px solid var(--gold); outline-offset:3px; }
.art-lab button[aria-pressed=true],.art-lab button.primary { background:var(--gold); border-color:var(--gold); color:#17212d; }
.art-lab .topline,.art-lab .transport { display:flex; align-items:center; flex-wrap:wrap; gap:8px; }
.art-lab .topline { margin-bottom:12px; justify-content:space-between; }
.art-lab .toggle { display:flex; gap:6px; }
.art-lab .stage { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.art-lab .stage.solo { grid-template-columns:1fr; }
.art-lab .panel { position:relative; background:#203c33; border:1px solid #40554b; border-radius:8px; overflow:hidden; }
.art-lab .panel figcaption { position:absolute; top:13px; left:15px; z-index:1; font:600 12px 'IBM Plex Mono',monospace; letter-spacing:1px; background:#101b28df; border-radius:3px; padding:8px 10px; }
.art-lab .panel.new figcaption { color:var(--gold); }
.art-lab figure { margin:0; }
.art-lab canvas { display:block; width:100%; image-rendering:pixelated; }
.art-lab .pitch { height:310px; }
.art-lab .transport { margin:14px 0 0; padding-bottom:15px; border-bottom:1px solid #2b3d49; }
.art-lab .transport .phase { color:var(--gold); min-width:110px; font:600 15px 'Barlow Condensed',sans-serif; text-transform:uppercase; }
.art-lab input[type=range] { flex:1; min-width:100px; accent-color:var(--gold); }
.art-lab .beats { display:flex; gap:6px; flex-wrap:wrap; margin:12px 0 25px; }
.art-lab .beats button { font-size:12px; padding:5px 11px; min-height:36px; }
.art-lab .workbench { display:grid; grid-template-columns:minmax(250px, .8fr) minmax(300px, 1.2fr); gap:28px; }
.art-lab h2 { font:600 24px 'Barlow Condensed',sans-serif; margin:0 0 5px; text-transform:uppercase; }
.art-lab .note { font-size:12px; line-height:1.6; color:var(--muted); margin:4px 0 14px; }
.art-lab .fields { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.art-lab label { display:flex; flex-direction:column; gap:5px; font-size:12px; color:var(--muted); }
.art-lab select { width:100%; }
.art-lab .transport select { width:auto; }
.art-lab .check { flex-direction:row; align-items:center; min-height:42px; color:#edf0e9; }
.art-lab .check input { accent-color:var(--gold); width:18px; height:18px; }
.art-lab .lineup { height:144px; background:#192b36; border-radius:6px; border:1px solid #304551; }
.art-lab footer { color:var(--muted); margin-top:24px; font-size:12px; border-top:1px solid #2b3d49; padding-top:15px; }
@media (min-width:1100px) { .art-lab .pitch { height:370px; } }
@media (max-width:700px) { .art-lab { padding:16px 12px; } .art-lab h1 { font-size:32px; } .art-lab header { margin-bottom:16px; } .art-lab .stage { grid-template-columns:1fr; } .art-lab .pitch { height:220px; } .art-lab .workbench { grid-template-columns:1fr; gap:22px; } .art-lab .intro { max-width:250px; } }
@media (max-height:500px) and (min-width:701px) { .art-lab { padding:10px 16px 24px; } .art-lab header { margin-bottom:9px; } .art-lab h1 { font-size:28px; } .art-lab .eyebrow,.art-lab .intro { display:none; } .art-lab .topline { margin-bottom:7px; } .art-lab .pitch { height:205px; } .art-lab .transport { margin-top:8px; padding-bottom:7px; } .art-lab .beats { margin-bottom:16px; } }
@media (max-height:500px) and (min-width:701px) { .art-lab.recognition .pitch { height:340px; } }
`;
