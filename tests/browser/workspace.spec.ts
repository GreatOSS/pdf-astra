import { expect, test } from '@playwright/test';
import { PDFDocument, PDFName, PDFNumber, degrees } from 'pdf-lib';
import { readFile } from 'node:fs/promises';
import { demoPdf } from '../../src/pdf';

test('edit, undo, merge and reopen an exported document without external requests', async ({ page }) => {
  const external: string[] = [];
  const errors: string[] = [];
  page.on('request', request => { if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:5173')) external.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Try a sample' }).click();
  await expect(page.getByLabel('PDF page 1')).toContainText('A little room');
  await expect(page.getByRole('button', { name: 'Download PDF', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Rotate page clockwise' }).click();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.getByLabel('Text to add', { exact: true }).fill('Export survives rotation');
  await page.getByLabel('Click to place text').click({ position: { x: 150, y: 180 } });
  await expect(page.getByLabel('PDF page 1')).toContainText('Export survives rotation');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByLabel('PDF page 1')).not.toContainText('Export survives rotation');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(page.getByLabel('PDF page 1')).toContainText('Export survives rotation');
  await page.getByRole('button', { name: 'Move page later' }).click();
  await expect(page.getByLabel('Page number', { exact: true })).toHaveValue('2');
  await expect(page.getByLabel('PDF page 2')).toContainText('Export survives rotation');
  await page.getByRole('button', { name: 'Delete page', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Go to page 3', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Go to page 3', exact: true })).toBeVisible();
  await page.getByTestId('merge-file').setInputFiles({ name: 'extra.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await demoPdf()) });
  await expect(page.getByRole('button', { name: 'Go to page 6', exact: true })).toBeVisible();
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const downloaded = await event;
  const file = (await downloaded.path())!;
  const output = await PDFDocument.load(await readFile(file));
  expect(output.getPageCount()).toBe(6);
  expect(output.getPage(1).getRotation().angle).toBe(90);
  await page.getByTestId('open-file').setInputFiles(file);
  await page.getByRole('button', { name: 'Go to page 2', exact: true }).click();
  await expect(page.getByLabel('PDF page 2')).toContainText('Export survives rotation');
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test('invalid replacement preserves the open document and mobile controls remain reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Try a sample' }).click();
  await expect(page.getByLabel('PDF page 1')).toContainText('A little room');
  await page.getByTestId('open-file').setInputFiles({ name: 'wrong.pdf', mimeType: 'application/pdf', buffer: Buffer.from('Not a PDF') });
  await expect(page.getByRole('alert')).toContainText('does not look like a PDF');
  await expect(page.getByLabel('PDF page 1')).toContainText('A little room');
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(page.getByLabel('PDF page 2')).toContainText('Make it');
  await page.getByRole('button', { name: 'Search document', exact: true }).click();
  await page.getByLabel('Find in document').fill('perspective');
  await page.getByRole('button', { name: /Page 3.*perspective/ }).click();
  await expect(page.getByLabel('Page number', { exact: true })).toHaveValue('3');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test('text and highlights align on all crop-box rotations and non-default user units', async ({ page }) => {
  const doc = await PDFDocument.create();
  for (const rotation of [0, 90, 180, 270]) {
    const pdfPage = doc.addPage([600, 800]);
    pdfPage.setCropBox(30, 40, 500, 650);
    pdfPage.setRotation(degrees(rotation));
    pdfPage.drawText(`Rotation ${rotation}`, { x: 80, y: 500 });
    pdfPage.node.set(PDFName.of('UserUnit'), PDFNumber.of(2));
  }
  await page.goto('/');
  await page.getByTestId('open-file').setInputFiles({ name: 'cropped.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await doc.save()) });
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: `Go to page ${i + 1}`, exact: true }).click();
    await page.getByRole('button', { name: 'Add text', exact: true }).click();
    await page.getByLabel('Text to add', { exact: true }).fill(`Mark ${i}`);
    const layer = page.getByLabel('Click to place text');
    await expect(layer).toBeVisible();
    await layer.click({ position: { x: 120, y: 150 } });
    const text = page.getByLabel(`PDF page ${i + 1}`, { exact: true }).getByText(`Mark ${i}`, { exact: true });
    await expect(text).toBeVisible();
    const box = (await page.getByLabel(`PDF page ${i + 1}`, { exact: true }).boundingBox())!;
    const placed = (await text.boundingBox())!;
    expect(Math.abs(placed.x - box.x - 120)).toBeLessThan(2);
    // Text origin is its baseline, so the top is above the clicked point.
    expect(placed.y).toBeLessThan(box.y + 150);
    expect(placed.y).toBeGreaterThan(box.y + 100);
    await page.getByRole('button', { name: 'Highlight', exact: true }).click();
    const highlight = page.getByLabel('Drag to highlight an area');
    const area = (await highlight.boundingBox())!;
    await page.mouse.move(area.x + 115, area.y + 125);
    await page.mouse.down();
    await page.mouse.move(area.x + 210, area.y + 155);
    await page.mouse.up();
    await expect(page.getByRole('status').filter({ hasText: 'Highlight area' })).toBeVisible();
    await page.getByRole('button', { name: 'Read', exact: true }).click();
  }
});

test('scanned pages render and forms are safely read-only', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try a sample' }).click();
  await expect(page.getByLabel('PDF page 1')).toContainText('A little room');
  const image = await page.locator('.paper > canvas').screenshot();
  const scan = await PDFDocument.create();
  const embedded = await scan.embedPng(image);
  scan.addPage([612, 792]).drawImage(embedded, { x: 0, y: 0, width: 612, height: 792 });
  await page.getByTestId('open-file').setInputFiles({ name: 'scan.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await scan.save()) });
  await expect(page.getByLabel('PDF page 1').locator('.textLayer')).toBeVisible();
  await expect(page.getByLabel('PDF page 1')).toHaveText('');
  await page.getByRole('button', { name: 'Search document', exact: true }).click();
  await page.getByLabel('Find in document').fill('think');
  await expect(page.getByText(/0 matching pages.*Scanned pages need OCR/)).toBeVisible();
  const form = await PDFDocument.create();
  const formPage = form.addPage();
  form.getForm().createTextField('Name').addToPage(formPage);
  await page.getByTestId('open-file').setInputFiles({ name: 'form.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await form.save()) });
  await expect(page.getByRole('button', { name: 'Add text', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Rotate page clockwise' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Download PDF', exact: true })).toBeEnabled();
});
