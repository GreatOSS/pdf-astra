import { useCallback, useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ArrowDown, ArrowUp, ArrowUpRight, BookOpen, Check, ChevronLeft, ChevronRight, Download, FilePlus2, FileText, Highlighter, Leaf, LockKeyhole, Maximize, Minus, MousePointer2, PanelLeftClose, PanelLeftOpen, Plus, Redo2, RotateCw, Search, ShieldCheck, Trash2, Type, Undo2, Upload, X } from 'lucide-react';
import { applyEdit, demoPdf, extractPage, loadEditable, MAX_FILE_BYTES, mergePdf, type Edit } from './pdf';
import { Thumbnail, Viewer } from './Viewer';

GlobalWorkerOptions.workerSrc = workerUrl;
type Version = { bytes: Uint8Array; label: string };
const HISTORY_LIMIT = 128 * 1024 * 1024;

function download(bytes: Uint8Array, name: string) {
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export default function App() {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [cursor, setCursor] = useState(0);
  const [saved, setSaved] = useState<Uint8Array | null>(null);
  const [name, setName] = useState('');
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(0);
  const [tool, setTool] = useState<'read' | 'text' | 'highlight'>('read');
  const [text, setText] = useState('');
  const [size, setSize] = useState(16);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sidebar, setSidebar] = useState(() => window.innerWidth > 560);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ page: number; snippet: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [help, setHelp] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const mergeInput = useRef<HTMLInputElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const guideOpener = useRef<HTMLElement | null>(null);
  const activeDoc = useRef<PDFDocumentProxy | null>(null);
  const operation = useRef(false);
  const bytes = versions[cursor]?.bytes;
  const dirty = !!bytes && bytes !== saved;
  const reportError = useCallback((message: string) => setError(message), []);

  useEffect(() => {
    if (!help) return;
    return () => guideOpener.current?.focus();
  }, [help]);

  function showGuide() {
    guideOpener.current = document.activeElement as HTMLElement | null;
    setHelp(true);
  }

  function goHome() {
    if (operation.current) return;
    if (dirty && !window.confirm('Close this PDF? Changes since your last download will be lost.')) return;
    const previous = activeDoc.current;
    activeDoc.current = null;
    setDoc(null); setVersions([]); setCursor(0); setSaved(null); setError(''); setNotice('');
    if (previous) setTimeout(() => { void previous.loadingTask.destroy(); }, 100);
  }

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function run(label: string, action: () => Promise<void>) {
    if (operation.current) return;
    operation.current = true; setBusy(label); setError('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.'); }
    finally { operation.current = false; setBusy(''); }
  }

  async function display(data: Uint8Array, target: number) {
    const loading = getDocument({ data: data.slice(), cMapUrl: '/pdfjs/cmaps/', cMapPacked: true,
      standardFontDataUrl: '/pdfjs/standard_fonts/', wasmUrl: '/pdfjs/wasm/' });
    let next: PDFDocumentProxy;
    try { next = await loading.promise; } catch (e) { await loading.destroy(); throw e; }
    const previous = activeDoc.current;
    activeDoc.current = next;
    setDoc(next);
    setPage(Math.max(0, Math.min(target, next.numPages - 1)));
    // Allow React to cancel old render tasks before disposing their worker.
    if (previous) setTimeout(() => { void previous.loadingTask.destroy(); }, 100);
  }

  async function open(data: Uint8Array, filename: string) {
    const parsed = await loadEditable(data);
    if (!parsed.getPageCount()) throw new Error('This PDF has no pages to display.');
    await display(data, 0);
    const hasForms = parsed.getForm().getFields().length > 0;
    setReadOnly(hasForms);
    setVersions([{ bytes: data, label: 'Original' }]); setCursor(0); setSaved(data);
    setName(filename); setTool('read'); setZoom(0); setQuery(''); setShowSearch(false);
    setNotice(hasForms ? 'Opened in read-only mode. Interactive form editing is not supported yet.' : 'Opened locally. Your file stays on this device.');
  }

  async function readFile(file: File) {
    if (file.size > MAX_FILE_BYTES) throw new Error('This file is larger than 100 MB. Try a smaller PDF for this preview.');
    const data = new Uint8Array(await file.arrayBuffer());
    if (!new TextDecoder().decode(data.subarray(0, 1024)).includes('%PDF-')) throw new Error('Choose a PDF file. This file does not look like a PDF.');
    return data;
  }

  function chooseFile(file?: File, merge = false) {
    if (!file || operation.current) return;
    if (!merge && dirty && !window.confirm('Open another PDF? Changes since your last download will be lost.')) return;
    void run(merge ? 'Adding pages…' : 'Opening PDF…', async () => {
      const incoming = await readFile(file);
      if (merge && bytes && doc) {
        const next = await mergePdf(bytes, incoming);
        await commit(next, 'Add pages', doc.numPages);
      } else await open(incoming, file.name);
    });
  }

  async function commit(next: Uint8Array, label: string, target = page) {
    await display(next, target);
    let history = [...versions.slice(0, cursor + 1), { bytes: next, label }];
    let total = history.reduce((sum, entry) => sum + entry.bytes.byteLength, 0);
    while (history.length > 2 && (history.length > 21 || total > HISTORY_LIMIT)) total -= history.shift()!.bytes.byteLength;
    setVersions(history); setCursor(history.length - 1); setNotice(`${label} · You can undo this change.`);
  }

  function edit(change: Edit) {
    if (!bytes || readOnly) return;
    const labels = { rotate: 'Rotate page', delete: 'Delete page', move: 'Move page', text: 'Add text', highlight: 'Highlight area' };
    void run('Applying change…', async () => {
      await commit(await applyEdit(bytes, change), labels[change.type], change.type === 'move' ? change.to : page);
      if (change.type === 'text') setTool('read');
    });
  }

  function history(direction: number) {
    const next = cursor + direction;
    if (next < 0 || next >= versions.length) return;
    void run(direction < 0 ? 'Undoing…' : 'Redoing…', async () => {
      await display(versions[next].bytes, page); setCursor(next);
      setNotice(direction < 0 ? 'Change undone.' : 'Change restored.');
    });
  }

  function save() {
    if (!bytes || busy) return;
    download(bytes, name.replace(/\.pdf$/i, '') + '-leafrune.pdf');
    setSaved(bytes); setNotice('Download started. Your original file is unchanged.');
  }

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const editing = /INPUT|TEXTAREA|SELECT/.test((event.target as HTMLElement).tagName);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's' && bytes) { event.preventDefault(); save(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f' && doc) { event.preventDefault(); setShowSearch(true); setTimeout(() => searchInput.current?.focus(), 0); }
      if (!editing && !busy && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); history(event.shiftKey ? 1 : -1); }
      if (event.key === 'Escape') { setTool('read'); setHelp(false); }
      if (!editing && !busy && doc && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (event.key === 'ArrowRight') setPage(p => Math.min(doc.numPages - 1, p + 1));
        if (event.key === 'ArrowLeft') setPage(p => Math.max(0, p - 1));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  useEffect(() => {
    let cancelled = false;
    setResults([]);
    if (!doc || !query.trim()) { setSearching(false); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      const found: { page: number; snippet: string }[] = [];
      try {
        for (let i = 0; i < doc.numPages; i++) {
          if (cancelled) return;
          const content = await (await doc.getPage(i + 1)).getTextContent();
          const value = content.items.map(item => 'str' in item ? item.str : '').join(' ');
          const at = value.toLocaleLowerCase().indexOf(query.trim().toLocaleLowerCase());
          if (at >= 0) found.push({ page: i, snippet: value.slice(Math.max(0, at - 30), at + query.length + 75) });
        }
        if (!cancelled) setResults(found);
      } catch { if (!cancelled) setError('Search could not finish. Try another page or reopen the file.'); }
      finally { if (!cancelled) setSearching(false); }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, doc]);

  const disabled = !!busy;
  const noEdit = disabled || readOnly;
  return <div className={`app ${doc ? 'has-document' : ''}`}
    onDragOver={event => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); setDragging(true); } }}
    onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
    onDrop={event => { event.preventDefault(); setDragging(false); if (event.dataTransfer.files.length > 1) setError('Drop one PDF at a time. Use Add pages to combine documents.'); else chooseFile(event.dataTransfer.files[0]); }}>
    <input ref={fileInput} data-testid="open-file" type="file" accept=".pdf,application/pdf" hidden onChange={event => { chooseFile(event.target.files?.[0]); event.target.value = ''; }} />
    <input ref={mergeInput} data-testid="merge-file" type="file" accept=".pdf,application/pdf" hidden onChange={event => { chooseFile(event.target.files?.[0], true); event.target.value = ''; }} />
    <header className="header">
      <a className="brand" href="#" onClick={event => { event.preventDefault(); goHome(); }} aria-label="Leafrune home"><img src="/leafrune.svg" alt="" /><span>Leafrune<span className="preview-tag">PREVIEW</span></span></a>
      {doc ? <div className="document-title"><strong title={name}>{name}</strong><span>{readOnly ? 'Read-only · interactive form' : dirty ? 'Changes not downloaded' : 'Local document'} <span className={dirty ? 'unsaved-dot' : 'saved-dot'} /></span></div> : <span className="header-note">A little less friction. A little more focus.</span>}
      <div className="header-actions"><button aria-label="Quick guide" className="quiet" onClick={showGuide}><BookOpen size={17} /><span>Quick guide</span></button>{doc && <><button aria-label="Open" disabled={disabled} onClick={() => fileInput.current?.click()}><Upload size={16} /><span>Open</span></button><button aria-label="Download PDF" className="primary" onClick={save} disabled={disabled}><Download size={16} /><span>Download PDF</span></button></>}</div>
    </header>

    {error && <div className="message error" role="alert"><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError('')}><X size={17} /></button></div>}
    {notice && <div className="toast" role="status"><Check size={17} />{notice}</div>}
    {busy && <div className="busy" role="status"><span className="spinner" />{busy}</div>}

    {!doc ? <main className="welcome">
      <div className="welcome-copy"><div className="eyebrow"><span /> YOUR DOCUMENTS. YOUR SPACE.</div><h1>Your PDF,<br /><em>thoughtfully handled.</em></h1><p>A calm place to read, annotate, and organize.<br />No accounts. No uploads. Just you and your document.</p></div>
      <section className="open-card" aria-label="Open a PDF">
        <div className="file-illustration"><FileText size={37} strokeWidth={1.4} /><span><Plus size={15} /></span></div>
        <h2>Bring a document.</h2><p>Drop your PDF here, or choose a file to get started.</p>
        <button className="primary large" disabled={disabled} onClick={() => fileInput.current?.click()}><Upload size={18} />Open a PDF<ArrowUpRight size={17} /></button>
        <span className="file-limit">PDF files up to 100 MB · Processed on your device</span>
        <div className="sample-line">Just looking around? <button className="text-button" disabled={disabled} onClick={() => void run('Preparing sample…', async () => open(await demoPdf(), 'Leafrune field notes.pdf'))}>Try a sample <ChevronRight size={15} /></button></div>
      </section>
      <div className="features"><article><BookOpen /><h3>Room to read</h3><p>Sharp pages, selectable text, and a quieter place to focus.</p></article><article><Highlighter /><h3>Make your mark</h3><p>Add text and highlights. Undo a change whenever you need.</p></article><article><FilePlus2 /><h3>Put it all together</h3><p>Rotate, reorder, remove, and combine pages in one workspace.</p></article></div>
      <footer><span><LockKeyhole size={14} /> Files stay on your device</span><span>Leafrune 0.1 · Built for a gentler workflow</span><button className="text-button" onClick={showGuide}>About this preview</button></footer>
    </main> : <>
      <nav className="toolbar" aria-label="PDF tools">
        <div className="tool-group"><button title="Toggle pages sidebar" aria-label="Toggle pages sidebar" aria-expanded={sidebar} onClick={() => setSidebar(!sidebar)}>{sidebar ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}</button><button title="Search document (Ctrl/⌘ F)" aria-label="Search document" aria-pressed={showSearch} onClick={() => { setShowSearch(!showSearch); setTimeout(() => searchInput.current?.focus(), 0); }}><Search size={19} /></button></div>
        <div className="tool-group"><button aria-pressed={tool === 'read'} onClick={() => setTool('read')}><MousePointer2 size={17} />Read</button><button disabled={noEdit} aria-pressed={tool === 'text'} onClick={() => setTool('text')}><Type size={17} />Add text</button><button disabled={noEdit} aria-pressed={tool === 'highlight'} onClick={() => setTool('highlight')}><Highlighter size={17} />Highlight</button></div>
        <div className="tool-group"><button aria-label="Undo" title="Undo (Ctrl/⌘ Z)" disabled={disabled || cursor === 0} onClick={() => history(-1)}><Undo2 size={18} /></button><button aria-label="Redo" title="Redo (Ctrl/⌘ Shift Z)" disabled={disabled || cursor === versions.length - 1} onClick={() => history(1)}><Redo2 size={18} /></button></div>
        <div className="tool-group zoom-tools"><button aria-label="Zoom out" disabled={zoom !== 0 && zoom <= 0.25} onClick={() => setZoom(z => Math.max(0.25, (z || 1) - 0.25))}><Minus size={17} /></button><select aria-label="Zoom level" value={zoom} onChange={event => setZoom(Number(event.target.value))}><option value="0">Fit width</option>{[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3].map(z => <option key={z} value={z}>{z * 100}%</option>)}</select><button aria-label="Zoom in" disabled={zoom >= 3} onClick={() => setZoom(z => Math.min(3, (z || 1) + 0.25))}><Plus size={17} /></button><button aria-label="Fit width" onClick={() => setZoom(0)}><Maximize size={17} /></button></div>
      </nav>
      {tool === 'text' && <div className="tool-options"><label>Text to add <input aria-label="Text to add" autoFocus placeholder="Write a note, then click on the page" value={text} maxLength={300} onChange={e => setText(e.target.value)} /></label><label>Size <select aria-label="Text size" value={size} onChange={e => setSize(Number(e.target.value))}>{[10, 12, 16, 20, 24, 32].map(n => <option key={n}>{n}</option>)}</select></label><span>Click on the page to place your text. Esc to cancel.</span></div>}
      {tool === 'highlight' && <div className="tool-options"><span className="yellow-swatch" /><span>Drag across an area to highlight it. This adds a permanent mark to your download; it does not redact content.</span></div>}
      {showSearch && <section className="search-panel" aria-label="Search results"><div className="search-field"><Search size={17} /><input ref={searchInput} aria-label="Find in document" placeholder="Find in document…" value={query} onChange={event => setQuery(event.target.value)} /><button aria-label="Close search" onClick={() => setShowSearch(false)}><X size={17} /></button></div>{query.trim() && <><span role="status">{searching ? 'Searching…' : `${results.length} matching ${results.length === 1 ? 'page' : 'pages'}${results.length === 0 ? ' · Scanned pages need OCR, which is not available yet.' : ''}`}</span><div className="search-results">{results.map(result => <button key={result.page} onClick={() => setPage(result.page)}><strong>Page {result.page + 1}</strong>{result.snippet}</button>)}</div></>}</section>}
      <div className={`workspace ${sidebar ? '' : 'sidebar-hidden'}`}>
        {sidebar && <aside className="sidebar" aria-label="Pages"><div className="sidebar-heading"><strong>Pages</strong><span>{doc.numPages}</span></div><div className="thumbnails">{Array.from({ length: doc.numPages }, (_, i) => <button className={`thumbnail ${i === page ? 'selected' : ''}`} key={i} aria-label={`Go to page ${i + 1}`} aria-current={i === page ? 'page' : undefined} disabled={disabled} onClick={() => setPage(i)}><div className="thumbnail-paper"><Thumbnail doc={doc} page={i} /></div><span>{i + 1}</span></button>)}</div><button className="add-pages" disabled={noEdit} onClick={() => mergeInput.current?.click()}><FilePlus2 size={17} />Add pages</button></aside>}
        <main className="document-main"><div className="page-actions"><span>PAGE {page + 1} OF {doc.numPages}</span><div><button aria-label="Move page earlier" title="Move page earlier" disabled={noEdit || page === 0} onClick={() => edit({ type: 'move', page, to: page - 1 })}><ArrowUp size={16} /></button><button aria-label="Move page later" title="Move page later" disabled={noEdit || page === doc.numPages - 1} onClick={() => edit({ type: 'move', page, to: page + 1 })}><ArrowDown size={16} /></button><button aria-label="Rotate page clockwise" title="Rotate page clockwise" disabled={noEdit} onClick={() => edit({ type: 'rotate', page })}><RotateCw size={16} /></button><button aria-label="Download this page" title="Download this page" disabled={noEdit} onClick={() => void run('Extracting page…', async () => { download(await extractPage(bytes!, page), `${name.replace(/\.pdf$/i, '')}-page-${page + 1}.pdf`); setNotice('Page download started.'); })}><Download size={16} /></button><button aria-label="Delete page" title="Delete page (can be undone)" disabled={noEdit || doc.numPages === 1} onClick={() => edit({ type: 'delete', page })}><Trash2 size={16} /></button></div></div>
          <Viewer doc={doc} page={page} zoom={zoom} tool={tool} text={text} size={size} busy={disabled} onEdit={edit} onError={reportError} />
          <div className="page-navigation"><button aria-label="Previous page" disabled={disabled || page === 0} onClick={() => setPage(page - 1)}><ChevronLeft size={18} /></button><label>Page <input key={`${page}-${doc.numPages}`} aria-label="Page number" type="number" min="1" max={doc.numPages} defaultValue={page + 1} onBlur={event => { const n = Number(event.target.value); if (Number.isInteger(n) && n >= 1 && n <= doc.numPages) setPage(n - 1); else event.target.value = String(page + 1); }} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} /> of {doc.numPages}</label><button aria-label="Next page" disabled={disabled || page === doc.numPages - 1} onClick={() => setPage(page + 1)}><ChevronRight size={18} /></button></div>
        </main>
      </div><div className="statusbar"><span><ShieldCheck size={14} />Processed on your device</span><span>{readOnly ? 'Read-only form' : 'Original file unchanged'} · {Math.max(1, Math.round((bytes?.length || 0) / 1024)).toLocaleString()} KB</span></div>
    </>}
    {dragging && <div className="drop-overlay"><Upload size={40} /><h2>Drop your PDF to open it</h2><p>Your file stays on this device.</p></div>}
    {help && <div className="modal-backdrop" onClick={() => setHelp(false)}><section className="guide" role="dialog" aria-modal="true" aria-labelledby="guide-title" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Tab') { e.preventDefault(); (e.currentTarget.querySelector('button') as HTMLButtonElement)?.focus(); } }}><button autoFocus className="close-guide" aria-label="Close guide" onClick={() => setHelp(false)}><X size={20} /></button><Leaf size={30} /><h2 id="guide-title">A little guide to Leafrune</h2><p>Open a PDF or try the sample. Everything is processed in this browser—no account, analytics, or document uploads.</p><dl><dt>Read & find</dt><dd>Select text to copy it. Use ← / → for pages and Ctrl/⌘ F to find text.</dd><dt>Make changes</dt><dd>Add text or drag an area highlight. Use the page tools to rotate, move, remove, or extract a page. Add pages combines another PDF.</dd><dt>Keep your work</dt><dd>Download saves a new PDF. Ctrl/⌘ Z undoes edits; Shift adds redo. History is kept in memory, up to 20 changes and a soft 128 MB cap. Closing or reloading clears the workspace.</dd></dl><div className="preview-note"><strong>An honest preview</strong><p>Text additions currently support Latin characters. Existing-text editing, OCR, form filling, signatures, redaction, and encrypted PDFs are not supported. Forms open read-only. Editing digitally signed documents invalidates signatures. Structural edits may affect bookmarks and document tags.</p></div><small>Leafrune 0.1.0 · MIT · PDF.js + pdf-lib</small></section></div>}
  </div>;
}
