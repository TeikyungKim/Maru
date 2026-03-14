/**
 * Maru 검색탭 500 에러 진단 스크립트
 */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  const networkErrors = [];

  // 콘솔 에러 수집
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('[CONSOLE ERROR]', msg.text());
      errors.push(msg.text());
    }
  });

  // 네트워크 응답 감시
  page.on('response', async response => {
    const url = response.url();
    const status = response.status();
    if (status >= 400) {
      let body = '';
      try { body = await response.text(); } catch {}
      console.log(`[NETWORK ${status}] ${url}`);
      console.log('  body:', body.slice(0, 300));
      networkErrors.push({ status, url, body: body.slice(0, 300) });
    }
  });

  // 페이지 요청 감시
  page.on('requestfailed', request => {
    console.log('[REQUEST FAILED]', request.url(), request.failure()?.errorText);
    networkErrors.push({ status: 'failed', url: request.url(), error: request.failure()?.errorText });
  });

  console.log('앱 접속 중...');
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: 'scripts/screenshot_01_initial.png' });
  console.log('스크린샷 저장: screenshot_01_initial.png');

  // 검색 탭 찾기
  await page.waitForTimeout(2000);
  const pageContent = await page.content();
  console.log('\n현재 URL:', page.url());

  // 탭 버튼들 확인
  const tabTexts = await page.evaluate(() => {
    const tabs = document.querySelectorAll('[role="tab"], [aria-label*="검색"], [data-testid*="search"]');
    return Array.from(tabs).map(t => ({ text: t.textContent, tag: t.tagName }));
  });
  console.log('탭 요소들:', JSON.stringify(tabTexts));

  // 검색 탭 클릭 시도 (텍스트로)
  try {
    await page.getByText('종목 검색').first().click();
    await page.waitForTimeout(1000);
    console.log('종목 검색 탭 클릭 성공');
  } catch {
    try {
      await page.getByText('검색').first().click();
      await page.waitForTimeout(1000);
      console.log('검색 탭 클릭 성공');
    } catch (e) {
      console.log('탭 클릭 실패:', e.message);
    }
  }

  await page.screenshot({ path: 'scripts/screenshot_02_search_tab.png' });
  console.log('스크린샷 저장: screenshot_02_search_tab.png');

  // 검색창에 입력
  try {
    const input = page.locator('input[placeholder*="종목"]').first();
    await input.click();
    await input.fill('삼성');
    console.log('검색어 "삼성" 입력');
    await page.waitForTimeout(3000); // 디바운스 + API 응답 대기
  } catch (e) {
    console.log('검색 입력 실패:', e.message);
  }

  await page.screenshot({ path: 'scripts/screenshot_03_after_search.png' });
  console.log('스크린샷 저장: screenshot_03_after_search.png');

  // 에러 텍스트 확인
  const errorText = await page.evaluate(() => {
    const els = document.querySelectorAll('*');
    for (const el of els) {
      if (el.children.length === 0 && el.textContent.includes('에러') ||
          el.textContent.includes('Error') || el.textContent.includes('500') ||
          el.textContent.includes('실패') || el.textContent.includes('없습니다')) {
        return el.textContent.trim();
      }
    }
    return null;
  });
  if (errorText) console.log('\n화면의 에러 텍스트:', errorText);

  console.log('\n=== 진단 결과 ===');
  console.log('콘솔 에러:', errors.length > 0 ? errors : '없음');
  console.log('네트워크 에러:', networkErrors.length > 0 ? JSON.stringify(networkErrors, null, 2) : '없음');

  await browser.close();
})();
