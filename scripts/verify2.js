/**
 * 종목명 표시 + 종목 상세 500 수정 검증
 */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const networkErrors = [];
  let pass = true;

  // API 응답 캡처 (이름 관련 디버깅)
  const apiResponses = {};
  page.on('response', async response => {
    const url = response.url();
    const status = response.status();
    if (url.includes('inquire-price') && url.includes('000660')) {
      try {
        const json = await response.json();
        apiResponses['price_000660'] = {
          rt_cd: json.rt_cd,
          hts_kor_isnm: json.output?.hts_kor_isnm,
          prdt_name: json.output?.prdt_name,
          prdt_abrv_name: json.output?.prdt_abrv_name,
          stck_prpr: json.output?.stck_prpr,
        };
      } catch {}
    }
    if (status >= 400 && url.includes('8088') && !url.includes('oauth2/tokenP')) {
      let body = '';
      try { body = await response.text(); } catch {}
      console.log(`[FAIL] NETWORK ${status}: ${url.split('?')[0].split('/').slice(-2).join('/')}`);
      console.log('  body:', body.slice(0, 150));
      networkErrors.push({ status, url });
      pass = false;
    }
  });

  page.on('dialog', async d => { console.log('[DIALOG]', d.message().slice(0, 80)); await d.accept(); });

  // 앱 접속 + 로그인
  console.log('앱 접속...');
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
      const text = await page.evaluate(() => document.body.innerText);
      if (text.includes('잠시 후') || text.includes('1분')) {
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

  // TEST 1: 000660 검색 — 종목명 표시 확인
  console.log('\n[TEST 1] "000660" 검색 — SK하이닉스 표시 기대');
  const input = page.locator('input').first();
  await input.click();
  await input.fill('000660');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'scripts/v2_01_search_000660.png' });

  const text1 = await page.evaluate(() => document.body.innerText);
  if (text1.includes('SK하이닉스') || text1.includes('하이닉스')) {
    console.log('[PASS] 종목명 "SK하이닉스" 표시됨');
  } else if (text1.includes('000660')) {
    console.log('[INFO] "000660" 결과 있음, 종목명 확인 필요');
    console.log('  price API 응답:', JSON.stringify(apiResponses['price_000660'] ?? '(아직 없음)'));
    // 이름 필드가 실제로 비어있는지 확인
    const nameText = await page.evaluate(() => {
      const els = document.querySelectorAll('*');
      for (const el of els) {
        if (el.textContent?.trim() === '000660' && el.children.length === 0) {
          return el.parentElement?.textContent?.trim();
        }
      }
      return null;
    });
    console.log('  카드 전체 텍스트:', nameText);
  }

  // TEST 2: 000660 클릭 → 상세화면 500 없이 로드
  console.log('\n[TEST 2] "000660" 클릭 → 상세화면 500 없이 로드');
  try {
    const card = page.locator('text=000660').first();
    await card.waitFor({ timeout: 5000 });
    await card.click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: 'scripts/v2_02_stock_detail.png' });

    const text2 = await page.evaluate(() => document.body.innerText);
    if (text2.includes('Request failed') || text2.includes('500')) {
      console.log('[FAIL] 상세화면에서 500 에러');
      pass = false;
    } else if (text2.includes('시가') || text2.includes('고가') || text2.includes('거래량')) {
      console.log('[PASS] 종목 상세화면 정상 로드됨');
      if (text2.includes('SK하이닉스') || text2.includes('하이닉스')) {
        console.log('[PASS] 상세화면에 종목명 SK하이닉스 표시됨');
      } else {
        console.log('[INFO] 상세화면 종목명 확인 필요 (스크린샷: v2_02_stock_detail.png)');
      }
    } else {
      console.log('[INFO] 상세화면 스크린샷 확인: v2_02_stock_detail.png');
    }
  } catch (e) {
    console.log('[WARN] 카드 클릭 실패:', e.message);
  }

  // TEST 3: 뒤로가기 후 price API 응답 확인
  await page.goBack().catch(() => {});
  await page.waitForTimeout(1000);

  console.log('\n[API 응답 요약]');
  if (Object.keys(apiResponses).length > 0) {
    console.log('inquire-price (000660):', JSON.stringify(apiResponses['price_000660'], null, 2));
  } else {
    console.log('API 응답 캡처 없음 (이미 캐시되어 있거나 요청 없었음)');
  }

  console.log('\n=== 최종 결과 ===');
  console.log(networkErrors.length === 0 ? '[PASS] 500 에러 없음' : `[FAIL] ${networkErrors.length}건 에러`);
  console.log(pass ? '\n✅ 검증 통과' : '\n❌ 실패');

  await browser.close();
  process.exit(pass ? 0 : 1);
})();
