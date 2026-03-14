/**
 * inquire-price 응답의 전체 필드 확인
 */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let priceOutputAll = null;

  page.on('response', async response => {
    const url = response.url();
    if (url.includes('inquire-price') && url.includes('000660')) {
      try {
        const json = await response.json();
        priceOutputAll = json.output;
        console.log('\n=== inquire-price output 전체 필드 ===');
        if (json.output) {
          const nameFields = {};
          for (const [k, v] of Object.entries(json.output)) {
            // 이름 관련 필드만 필터 (문자열이고 한글이나 알파벳 포함)
            if (typeof v === 'string' && v && /[가-힣a-zA-Z]/.test(v)) {
              nameFields[k] = v;
            }
          }
          console.log('문자(이름) 포함 필드들:', JSON.stringify(nameFields, null, 2));
          console.log('\n전체 키 목록:', Object.keys(json.output).join(', '));
        } else {
          console.log('output 없음, 전체 응답:', JSON.stringify(json).slice(0, 300));
        }
      } catch {}
    }
  });

  page.on('dialog', async d => { await d.accept(); });

  await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  if (await page.getByText('한국투자증권').isVisible().catch(() => false)) {
    await page.getByText('한국투자증권').click();
    await page.waitForTimeout(3000);
  }

  if (await page.getByText('한국투자증권 로그인').isVisible().catch(() => false)) {
    await page.getByText('로그인', { exact: true }).click();
    try {
      await page.waitForURL(/dashboard|main/, { timeout: 20000 });
    } catch {
      const t = await page.evaluate(() => document.body.innerText);
      if (t.includes('잠시 후')) {
        await page.waitForTimeout(62000);
        await page.getByText('로그인', { exact: true }).click();
        await page.waitForURL(/dashboard|main/, { timeout: 20000 });
      }
    }
    await page.waitForTimeout(1000);
  }

  await page.getByText('검색').first().waitFor({ timeout: 8000 });
  await page.getByText('검색').first().click();
  await page.waitForTimeout(500);

  const input = page.locator('input').first();
  await input.fill('000660');
  await page.waitForTimeout(3000);

  await browser.close();
})();
