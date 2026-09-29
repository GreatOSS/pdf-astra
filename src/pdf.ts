import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';

export const MAX_FILE_BYTES = 100 * 1024 * 1024;
export type Edit =
  | { type: 'rotate'; page: number }
  | { type: 'delete'; page: number }
  | { type: 'move'; page: number; to: number }
  | { type: 'text'; page: number; x: number; y: number; text: string; size: number; rotation: number }
  | { type: 'highlight'; page: number; x: number; y: number; width: number; height: number };

export async function loadEditable(bytes: Uint8Array) {
  let document: PDFDocument;
  try {
    document = await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (error) {
    if (error instanceof Error && /encrypt/i.test(error.message)) {
      throw new Error('Password-protected PDFs are not supported yet. Open an unencrypted copy.');
    }
    throw new Error('This file could not be read as a PDF. Try opening a fresh copy.');
  }
  if (document.getForm().hasXFA()) throw new Error('XFA forms are not supported yet. Open a standard PDF copy instead.');
  return document;
}

export async function applyEdit(bytes: Uint8Array, edit: Edit) {
  const doc = await loadEditable(bytes);
  const page = doc.getPage(edit.page);
  if (edit.type === 'rotate') page.setRotation(degrees((page.getRotation().angle + 90) % 360));
  if (edit.type === 'delete') {
    if (doc.getPageCount() === 1) throw new Error('Keep at least one page in your PDF.');
    doc.removePage(edit.page);
  }
  if (edit.type === 'move') {
    if (edit.to < 0 || edit.to >= doc.getPageCount()) throw new Error('That page position does not exist.');
    doc.removePage(edit.page);
    doc.insertPage(edit.to, page);
  }
  if (edit.type === 'text') {
    const font = await doc.embedFont(StandardFonts.Helvetica);
    try { font.encodeText(edit.text); } catch {
      throw new Error('This text contains characters not supported by the current font. Use Latin text for now.');
    }
    page.drawText(edit.text, { x: edit.x, y: edit.y, size: edit.size, font,
      color: rgb(0.08, 0.16, 0.2), rotate: degrees(edit.rotation) });
  }
  if (edit.type === 'highlight') {
    page.drawRectangle({ x: edit.x, y: edit.y, width: edit.width, height: edit.height,
      color: rgb(1, 0.81, 0.15), opacity: 0.32 });
  }
  doc.setProducer('Leafrune');
  return doc.save();
}

export async function mergePdf(bytes: Uint8Array, incoming: Uint8Array) {
  const doc = await loadEditable(bytes);
  const other = await loadEditable(incoming);
  // Copying AcroForm pages without merging the field tree loses interactivity.
  if (other.getForm().getFields().length) {
    throw new Error('This PDF has interactive form fields. Merging forms is not supported yet; your current document is unchanged.');
  }
  const pages = await doc.copyPages(other, other.getPageIndices());
  pages.forEach(page => doc.addPage(page));
  doc.setProducer('Leafrune');
  return doc.save();
}

export async function extractPage(bytes: Uint8Array, page: number) {
  const source = await loadEditable(bytes);
  if (source.getForm().getFields().length) throw new Error('Extracting interactive forms is not supported yet.');
  const doc = await PDFDocument.create();
  const [copy] = await doc.copyPages(source, [page]);
  doc.addPage(copy);
  doc.setProducer('Leafrune');
  return doc.save();
}

export async function demoPdf() {
  const doc = await PDFDocument.create();
  doc.setTitle('A little room to think');
  doc.setAuthor('Leafrune');
  doc.setCreator('Leafrune');
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const green = rgb(0.09, 0.31, 0.26);
  for (let i = 0; i < 3; i++) {
    const page = doc.addPage(i === 2 ? [792, 612] : [612, 792]);
    const h = page.getHeight();
    page.drawRectangle({ x: 0, y: h - 14, width: page.getWidth(), height: 14, color: green });
    page.drawText('LEAFRUNE  /  FIELD NOTES', { x: 54, y: h - 70, size: 10, font: bold, color: green });
    page.drawText(['A little room\nto think.', 'Make it\nyour own.', 'A wider perspective.'][i],
      { x: 54, y: h - 145, size: 40, lineHeight: 48, font: bold, color: green });
    const lines = [
      ['Good ideas deserve a clear page.', 'This is your space to read, mark up, and bring things together.', '', 'Try highlighting a line, adding a note, or rotating a page.', 'Every change can be undone. Your original stays untouched.'],
      ['A few small things to try', '', '1. Add a text note in the space below.', '2. Move this page earlier in the document.', '3. Download your copy and open it again.', '', 'Less friction. More focus.'],
      ['Not every idea fits the same format.', '', 'This landscape page is here to help you try different layouts.', 'Zoom in, fit the page, and keep your perspective.']
    ][i];
    lines.forEach((text, n) => page.drawText(text, { x: 54, y: h - 270 - n * 26,
      size: 13, font: regular, color: rgb(0.24, 0.29, 0.31) }));
    page.drawLine({ start: { x: 54, y: 70 }, end: { x: page.getWidth() - 54, y: 70 }, color: rgb(0.8, 0.84, 0.8) });
    page.drawText(`A local-first PDF workspace                                     ${i + 1} / 3`, { x: 54, y: 48, size: 10, font: regular, color: green });
  }
  return doc.save();
}
