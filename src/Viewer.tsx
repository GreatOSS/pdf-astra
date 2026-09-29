import { useEffect, useRef, useState } from 'react';
import { TextLayer, type PDFDocumentProxy, type PageViewport } from 'pdfjs-dist';
import type { Edit } from './pdf';

type Props = {
  doc: PDFDocumentProxy; page: number; zoom: number; tool: 'read' | 'text' | 'highlight';
  text: string; size: number; busy: boolean;
  onEdit: (edit: Edit) => void; onError: (message: string) => void;
};

export function Viewer({ doc, page, zoom, tool, text, size, busy, onEdit, onError }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const viewport = useRef<PageViewport | null>(null);
  const [width, setWidth] = useState(800);
  const [ready, setReady] = useState(false);
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    host.current?.scrollTo(0, 0);
  }, [page]);

  useEffect(() => {
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    observer.observe(host.current!);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let render: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | undefined;
    let layer: TextLayer | undefined;
    setReady(false);
    setBox(null);
    start.current = null;
    const element = paper.current!;
    element.replaceChildren();
    (async () => {
      const pdfPage = await doc.getPage(page + 1);
      if (cancelled) return;
      const base = pdfPage.getViewport({ scale: 1 });
      const scale = zoom === 0 ? Math.min((width - 48) / base.width, 1.5) : zoom;
      const view = pdfPage.getViewport({ scale: Math.max(0.15, scale) });
      viewport.current = view;
      element.style.width = `${view.width}px`;
      element.style.height = `${view.height}px`;
      element.style.setProperty('--scale-factor', String(view.scale));
      element.style.setProperty('--total-scale-factor', String(view.scale * pdfPage.userUnit));
      const canvas = document.createElement('canvas');
      // Bound GPU memory even for unusually large page dimensions.
      const ratio = Math.min(window.devicePixelRatio || 1, 2, 8192 / Math.max(view.width, view.height), Math.sqrt(16_000_000 / (view.width * view.height)));
      canvas.width = Math.floor(view.width * ratio);
      canvas.height = Math.floor(view.height * ratio);
      canvas.style.width = `${view.width}px`;
      canvas.style.height = `${view.height}px`;
      element.append(canvas);
      render = pdfPage.render({ canvas, viewport: view, transform: [ratio, 0, 0, ratio, 0, 0] });
      await render.promise;
      if (cancelled) return;
      const textDiv = document.createElement('div');
      textDiv.className = 'textLayer';
      element.append(textDiv);
      layer = new TextLayer({ textContentSource: await pdfPage.getTextContent(), container: textDiv, viewport: view });
      await layer.render();
      if (!cancelled) setReady(true);
    })().catch(error => { if (!cancelled) onError(`Could not display this page: ${error.message}`); });
    return () => { cancelled = true; render?.cancel(); layer?.cancel(); };
  }, [doc, page, zoom, width, onError]);

  function position(event: React.PointerEvent) {
    const rect = paper.current!.getBoundingClientRect();
    return { x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)), y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)) };
  }

  return <div className="viewer" ref={host} aria-label="Document viewer" tabIndex={0}>
    {!ready && <div className="rendering" role="status">Rendering page…</div>}
    <div className={`paper-wrap tool-${tool}`}>
      <div ref={paper} className="paper" aria-label={`PDF page ${page + 1}`} />
      {ready && tool !== 'read' && <div className="drawing-layer" aria-label={tool === 'text' ? 'Click to place text' : 'Drag to highlight an area'}
        onPointerDown={event => {
          if (busy || event.button !== 0) return;
          const p = position(event);
          const v = viewport.current!;
          if (tool === 'text') {
            if (!text.trim()) { onError('Write your note in the text field first, then click on the page.'); return; }
            const [x, y] = v.convertToPdfPoint(p.x, p.y);
            onEdit({ type: 'text', page, x, y, text, size, rotation: v.rotation });
          } else {
            start.current = p;
            event.currentTarget.setPointerCapture(event.pointerId);
            setBox({ x: p.x, y: p.y, w: 0, h: 0 });
          }
        }}
        onPointerMove={event => {
          if (!start.current) return;
          const p = position(event), s = start.current;
          setBox({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(s.x - p.x), h: Math.abs(s.y - p.y) });
        }}
        onPointerCancel={() => { start.current = null; setBox(null); }}
        onPointerUp={event => {
          if (!start.current) return;
          const p = position(event), s = start.current, v = viewport.current!;
          start.current = null;
          setBox(null);
          if (Math.abs(s.x - p.x) < 3 || Math.abs(s.y - p.y) < 3) return;
          const a = v.convertToPdfPoint(s.x, s.y), b = v.convertToPdfPoint(p.x, p.y);
          onEdit({ type: 'highlight', page, x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), width: Math.abs(a[0] - b[0]), height: Math.abs(a[1] - b[1]) });
        }} />}
      {box && <div className="highlight-preview" style={{ left: box.x, top: box.y, width: box.w, height: box.h }} />}
    </div>
  </div>;
}

export function Thumbnail({ doc, page }: { doc: PDFDocumentProxy; page: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    let task: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | undefined;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      doc.getPage(page + 1).then(pdfPage => {
        if (cancelled) return;
        const base = pdfPage.getViewport({ scale: 1 });
        const viewport = pdfPage.getViewport({ scale: 130 / Math.max(base.width, base.height) });
        const el = canvas.current!;
        el.width = Math.ceil(viewport.width * 1.5);
        el.height = Math.ceil(viewport.height * 1.5);
        el.style.width = `${viewport.width}px`;
        el.style.height = `${viewport.height}px`;
        task = pdfPage.render({ canvas: el, viewport, transform: [1.5, 0, 0, 1.5, 0, 0] });
        return task.promise;
      }).catch(() => { /* Main viewer reports actionable rendering errors. */ });
    }, { rootMargin: '150px' });
    observer.observe(canvas.current!);
    return () => { cancelled = true; observer.disconnect(); task?.cancel(); };
  }, [doc, page]);
  return <canvas ref={canvas} aria-hidden="true" />;
}
