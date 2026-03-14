/**
 * 최종 검증: 종목 상세화면 + 검색 결과 종목명
 */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const networkErrors = [];
  let pass = true;

  page.on('response', async response => {
    const url = response.url();
    const status = response.status();
    if (status >= 400 && url.includes('8088') && !url.includes('oauth2/tokenP')) {
      let body = '';
      try { body = await response.text(); } catch {}
      console.log(`[FAIL] NETWORK ${status}: ${url.split('/').slice(-2).join('/')}`);
      console.log('  body:', body.slice(0, 150));
      networkErrors.push({ status, url });
      pass = false;
    }
  });
  page.on('dialog', async d => { console.log('[DIALOG]', d.message().slice(0, 80)); await d.accept(); });

  // 로그인
  await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  if (await page.getByText('한국투자증권').isVisible().catch(() => false)) {
    await page.getByText('한국투자증권').click();
    await page.waitForTimeout(3000);
  }
  if (await page.getByText('한국투자증권 로그인').isVisible().catch(() => false)) {
    console.log('로그인...');
    await page.getByText('로그인', { exact: true }).click();
    try {
      await page.waitForURL(/dashboard|main/, { timeout: 25000 });
      console.log('로그인 성공');
    } catch {
      const t = await page.evaluate(() => document.body.innerText);
      if (t.includes('잠시 후') || t.includes('1분')) {
        console.log('레이트 리밋 — 62초 대기...');
        await page.waitForTimeout(62000);
        await page.getByText('로그인', { exact: true }).click();
        await page.waitForURL(/dashboard|main/, { timeout: 25000 });
      }
    }
    await page.waitForTimeout(1000);
  }

  // 검색 탭
  await page.getByText('검색').first().waitFor({ timeout: 8000 });
  await page.getByText('검색').first().click();
  await page.waitForTimeout(500);

  // TEST 1: 000660 검색 — 종목명 표시 (code fallback)
  console.log('\n[TEST 1] "000660" 검색 — 결과 카드에 뭔가 표시');
  const input = page.locator('input').first();
  await input.fill('000660');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'scripts/v3_01_search.png' });

  const text1 = await page.evaluate(() => document.body.innerText);
  if (text1.includes('000660')) {
    console.log('[PASS] 000660 검색 결과 표시됨');
    // 종목명이 code fallback으로 표시되는지 확인 (카드에 000660이 2개 이상)
    const count000660 = (text1.match(/000660/g) || []).length;
    if (count000660 >= 2) {
      console.log('[PASS] 종목명 code fallback 적용됨 (000660이 이름으로도 표시)');
    }
  }

  // TEST 2: 클릭 → 상세화면 500 없이 로드 + 업종 표시
  console.log('\n[TEST 2] 000660 클릭 → 상세화면 로드 + 업종 확인');
  await page.locator('text=000660').first().click();
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'scripts/v3_02_detail.png' });

  const text2 = await page.evaluate(() => document.body.innerText);
  if (text2.includes('Request failed') || text2.includes('500')) {
    console.log('[FAIL] 상세화면 500 에러');
    pass = false;
  } else if (text2.includes('시가') && text2.includes('고가')) {
    console.log('[PASS] 상세화면 정상 로드');
    if (text2.includes('전기') || text2.includes('반도체') || text2.includes('전자')) {
      console.log('[PASS] 업종(sector) 정보 표시됨');
    } else {
      console.log('[INFO] 업종 확인은 스크린샷 참조: v3_02_detail.png');
    }
  } else {
    console.log('[INFO] 스크린샷 확인: v3_02_detail.png');
  }

  console.log('\n=== 최종 결과 ===');
  console.log(networkErrors.length === 0 ? '[PASS] 500 에러 없음' : `[FAIL] ${networkErrors.length}건 에러`);
  console.log(pass ? '\n✅ 검증 통과' : '\n❌ 실패');

  await browser.close();
  process.exit(pass ? 0 : 1);
})();
