import { expect, test, type Page } from '@playwright/test';

async function dimensions(page: Page) {
  return page.locator('.viewer').evaluate(el => {
    const paper = el.querySelector('.paper')!.getBoundingClientRect();
    const style = getComputedStyle(el);
    return {
      pageWidth: paper.width, pageHeight: paper.height,
      width: el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
      height: el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom),
      overflowX: el.scrollWidth - el.clientWidth,
      overflowY: el.scrollHeight - el.clientHeight,
    };
  });
}

async function expectContained(page: Page) {
  await expect.poll(async () => {
    const d = await dimensions(page);
    return d.pageWidth <= d.width + 1 && d.pageHeight <= d.height + 1 && d.overflowX <= 1 && d.overflowY <= 1;
  }).toBe(true);
}

test('fit-page follows orientation, sidebar, search panel and window resizing', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Try a sample' }).click();
  await expect(page.getByLabel('PDF page 1')).toContainText('A little room');
  await page.getByRole('button', { name: 'Fit page', exact: true }).click();
  await expectContained(page);
  await page.getByRole('button', { name: 'Go to page 3', exact: true }).click();
  await expect(page.getByLabel('PDF page 3')).toContainText('A wider perspective');
  await expectContained(page);
  await page.getByRole('button', { name: 'Rotate page clockwise' }).click();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled();
  await expectContained(page);
  await page.getByRole('button', { name: 'Search document' }).click();
  await page.getByLabel('Find in document').fill('perspective');
  await expect(page.getByRole('button', { name: /Page 3.*perspective/ })).toBeVisible();
  await expectContained(page);
  await page.getByRole('button', { name: 'Toggle pages sidebar' }).click();
  await page.setViewportSize({ width: 390, height: 650 });
  await expectContained(page);
  await expect(page.getByRole('combobox', { name: 'Zoom level' })).toHaveValue('page');
});

test('fit-width uses available space and zoom buttons step from the actual fit', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Try a sample' }).click();
  await expect(page.getByLabel('PDF page 1')).toContainText('A little room');
  await expect.poll(async () => { const d = await dimensions(page); return Math.abs(d.pageWidth - d.width); }).toBeLessThan(2);
  const initial = await dimensions(page);
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect.poll(async () => Math.abs((await dimensions(page)).pageWidth / initial.pageWidth - 1.25)).toBeLessThan(0.01);
  await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
  await expect.poll(async () => Math.abs((await dimensions(page)).pageWidth - initial.pageWidth)).toBeLessThan(1);
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.getByRole('combobox', { name: 'Zoom level' }).selectOption('width');
  await expect.poll(async () => { const d = await dimensions(page); return Math.abs(d.pageWidth - d.width); }).toBeLessThan(2);
  const large = await dimensions(page);
  expect(large.pageWidth).toBeGreaterThan(612 * 1.5);
  await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
  await expect.poll(async () => Math.abs((await dimensions(page)).pageWidth / large.pageWidth - 0.8)).toBeLessThan(0.01);
});
