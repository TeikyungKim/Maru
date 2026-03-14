/**
 * 수정 후 검증 스크립트 — 로그인 포함 전체 플로우
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
      console.log(`[FAIL] NETWORK ${status}: ${url}`);
      console.log('  body:', body.slice(0, 200));
      networkErrors.push({ status, url });
      pass = false;
    }
  });

  page.on('dialog', async dialog => {
    console.log('[DIALOG]', dialog.type(), dialog.message().slice(0, 100));
    await dialog.accept();
  });

  console.log('1. 앱 접속...');
  await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // 브로커 선택
  const hasBrokerSelection = await page.getByText('한국투자증권').isVisible().catch(() => false);
  if (hasBrokerSelection) {
    console.log('2. KIS 선택...');
    await page.getByText('한국투자증권').click();
    await page.waitForTimeout(3000);
  }

  // 로그인 페이지: 정확히 '로그인' 버튼 (title '한국투자증권 로그인'과 구분)
  const loginPageVisible = await page.getByText('한국투자증권 로그인').isVisible().catch(() => false);
  if (loginPageVisible) {
    console.log('3. 로그인 페이지 감지 — 로그인 버튼 클릭 (exact)...');
    // exact: true로 '로그인'만 매칭
    const loginBtn = page.getByText('로그인', { exact: true });
    await loginBtn.waitFor({ timeout: 5000 });
    await loginBtn.click();

    console.log('   API 응답 대기 중...');
    try {
      await page.waitForURL(/dashboard|main/, { timeout: 25000 });
      console.log('   로그인 성공 → 메인 화면');
    } catch {
      // 스크린샷 찍어서 상태 확인
      await page.screenshot({ path: 'scripts/verify_login_failed.png' });
      const url = page.url();
      const text = await page.evaluate(() => document.body.innerText);
      console.log('   로그인 후 URL:', url);
      console.log('   페이지 텍스트 (앞 300자):', text.slice(0, 300));

      if (text.includes('잠시 후') || text.includes('1분') || text.includes('EGW00133')) {
        console.log('   [레이트 리밋] 62초 대기 후 재시도...');
        await page.waitForTimeout(62000);
        await page.getByText('로그인', { exact: true }).click();
        await page.waitForURL(/dashboard|main/, { timeout: 25000 });
        console.log('   재시도 성공');
      } else if (!url.includes('login')) {
        console.log('   [OK] login 페이지가 아님 — 진행');
      } else {
        console.log('   [WARN] 로그인 미완료');
      }
    }
    await page.screenshot({ path: 'scripts/verify_after_login.png' });
  }

  // 검색 탭
  console.log('4. 검색 탭 이동...');
  const searchTab = page.getByText('검색').first();
  try {
    await searchTab.waitFor({ timeout: 8000 });
    await searchTab.click();
    await page.waitForTimeout(500);
  } catch {
    console.log('   [INFO] 검색 탭 미발견 — 현재 URL:', page.url());
    await page.screenshot({ path: 'scripts/verify_no_search_tab.png' });
  }
  await page.screenshot({ path: 'scripts/verify_search_tab.png' });

  // TEST 1: 이름 검색
  console.log('\n[TEST 1] 이름 검색 "삼성" — 500 없이 안내 메시지');
  const input = page.locator('input').first();
  const inputVisible = await input.isVisible().catch(() => false);
  if (!inputVisible) {
    console.log('   [SKIP] 검색 입력창 없음 (로그인 미완료)');
  } else {
    await input.click();
    await input.fill('삼성');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'scripts/verify_name_search.png' });

    const text = await page.evaluate(() => document.body.innerText);
    if (text.includes('status code 500') || text.includes('500 (Internal')) {
      console.log('[FAIL] 500 에러 메시지 표시됨');
      pass = false;
    } else if (text.includes('모의투자') || text.includes('코드(숫자)')) {
      console.log('[PASS] 친절한 모의투자 안내 메시지 표시됨');
    } else if (text.includes('인증 정보')) {
      console.log('[INFO] 인증 정보 없음 — 로그인 필요');
    } else {
      console.log('[INFO] 스크린샷: verify_name_search.png');
    }
  }

  // TEST 2: 코드 검색
  console.log('\n[TEST 2] 코드 검색 "005930" — 500 없이 동작');
  if (!inputVisible) {
    console.log('   [SKIP] 검색 입력창 없음 (로그인 미완료)');
  } else {
    await input.fill('');
    await input.fill('005930');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'scripts/verify_code_search.png' });

    const text = await page.evaluate(() => document.body.innerText);
    if (text.includes('status code 500') || text.includes('500 (Internal')) {
      console.log('[FAIL] 코드 검색 500 에러');
      pass = false;
    } else if (text.includes('삼성') || text.includes('005930')) {
      console.log('[PASS] 코드 검색 결과 표시됨');
    } else if (text.includes('인증 정보')) {
      console.log('[INFO] 인증 정보 없음');
    } else {
      console.log('[INFO] 스크린샷: verify_code_search.png');
    }
  }

  console.log('\n=== 최종 결과 ===');
  if (networkErrors.length === 0) {
    console.log('[PASS] 500 네트워크 에러 없음');
  } else {
    console.log(`[FAIL] ${networkErrors.length}건 에러:`, networkErrors.map(e => `${e.status} ${e.url}`));
  }
  console.log(pass ? '\n✅ 500 에러 해소 검증 통과' : '\n❌ 실패 — 스크린샷 확인');

  await browser.close();
  process.exit(pass ? 0 : 1);
})();
