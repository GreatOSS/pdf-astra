import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, degrees } from 'pdf-lib';
import { applyEdit, demoPdf, extractPage, loadEditable, mergePdf } from '../src/pdf';

test('page order, rotation, deletion and extraction survive serialization', async () => {
  const original = await demoPdf();
  let bytes = await applyEdit(original, { type: 'rotate', page: 2 });
  bytes = await applyEdit(bytes, { type: 'move', page: 2, to: 0 });
  let doc = await PDFDocument.load(bytes);
  assert.equal(doc.getPage(0).getWidth(), 792);
  assert.equal(doc.getPage(0).getRotation().angle, 90);
  bytes = await applyEdit(bytes, { type: 'delete', page: 1 });
  doc = await PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(), 2);
  const single = await extractPage(bytes, 0);
  const extracted = await PDFDocument.load(single);
  assert.equal(extracted.getPageCount(), 1);
  assert.equal(extracted.getPage(0).getRotation().angle, 90);
  await assert.rejects(applyEdit(single, { type: 'delete', page: 0 }), /at least one/);
  assert.equal((await PDFDocument.load(original)).getPageCount(), 3);
  assert.equal((await PDFDocument.load(original)).getPage(2).getRotation().angle, 0);
});

test('merge preserves page dimensions and rejects form copies without data loss', async () => {
  const original = await demoPdf();
  const merged = await PDFDocument.load(await mergePdf(original, original));
  assert.equal(merged.getPageCount(), 6);
  assert.equal(merged.getPage(5).getWidth(), 792);
  const form = await PDFDocument.create();
  const page = form.addPage();
  form.getForm().createTextField('name').addToPage(page);
  await assert.rejects(mergePdf(original, await form.save()), /interactive form/);
  await assert.rejects(extractPage(await form.save(), 0), /interactive forms/);
});

test('annotations work on rotated and offset crop boxes; unsupported text is explicit', async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 800]);
  page.setCropBox(30, 40, 500, 650);
  page.setRotation(degrees(270));
  let bytes = await doc.save();
  bytes = await applyEdit(bytes, { type: 'text', page: 0, text: 'Café reviewed', size: 16, rotation: 270, x: 100, y: 200 });
  bytes = await applyEdit(bytes, { type: 'highlight', page: 0, x: 100, y: 200, width: 80, height: 20 });
  const result = await PDFDocument.load(bytes);
  assert.deepEqual(result.getPage(0).getCropBox(), { x: 30, y: 40, width: 500, height: 650 });
  assert.equal(result.getPage(0).getRotation().angle, 270);
  await assert.rejects(applyEdit(bytes, { type: 'text', page: 0, text: '你好', size: 16, rotation: 0, x: 10, y: 10 }), /not supported/);
});

test('invalid PDFs fail with an actionable message', async () => {
  await assert.rejects(loadEditable(new TextEncoder().encode('not a PDF')), /could not be read/);
});
