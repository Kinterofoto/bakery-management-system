"""Playwright browser automation for CEN Carvajal purchase order scraping."""

import asyncio
import base64
import logging
import re
from dataclasses import dataclass
from datetime import date, timedelta

from playwright.async_api import async_playwright, Page, Download

from config import settings

logger = logging.getLogger(__name__)


@dataclass
class ScrapedOrder:
    """A purchase order scraped from CEN Carvajal."""
    doc_number: str
    doc_date: str
    pdf_bytes: bytes
    pdf_filename: str


async def _debug_page(page: Page, label: str) -> None:
    """Log a screenshot (base64) and key HTML snippets for Cloud Run debugging."""
    try:
        screenshot = await page.screenshot(full_page=False)
        b64 = base64.b64encode(screenshot).decode()
        # Log first 500 chars of base64 to confirm screenshot was taken
        logger.info(f"[DEBUG:{label}] Screenshot captured ({len(screenshot)} bytes)")
        logger.info(f"[DEBUG:{label}] URL: {page.url}")

        # Log visible input fields
        inputs = await page.query_selector_all("input")
        for inp in inputs[:10]:
            placeholder = await inp.get_attribute("placeholder") or ""
            input_type = await inp.get_attribute("type") or ""
            formcontrol = await inp.get_attribute("formcontrolname") or ""
            visible = await inp.is_visible()
            logger.info(
                f"[DEBUG:{label}] input: placeholder='{placeholder}' "
                f"type='{input_type}' formcontrolname='{formcontrol}' visible={visible}"
            )

        # Log page title and first 2000 chars of body text
        title = await page.title()
        body_text = await page.inner_text("body")
        logger.info(f"[DEBUG:{label}] Title: {title}")
        logger.info(f"[DEBUG:{label}] Body text (first 1000): {body_text[:1000]}")
    except Exception as e:
        logger.warning(f"[DEBUG:{label}] Failed to capture debug info: {e}")


async def _login(page: Page) -> None:
    """Log in to CEN Carvajal."""
    logger.info("Navigating to CEN Carvajal login page")

    # Use domcontentloaded (faster) then wait for Angular to bootstrap
    await page.goto(settings.cen_login_url, wait_until="domcontentloaded", timeout=60000)

    # Wait for Angular app to bootstrap - check for app-root having content
    logger.info("Waiting for Angular app to bootstrap...")
    try:
        await page.wait_for_function(
            """() => {
                const root = document.querySelector('app-root');
                return root && root.children.length > 0 && root.innerHTML.length > 100;
            }""",
            timeout=30000,
        )
        logger.info("Angular app bootstrapped")
    except Exception as e:
        logger.warning(f"Angular bootstrap wait failed: {e}")

    # Extra wait for form rendering
    await page.wait_for_timeout(5000)

    # Debug: capture page state before looking for fields
    await _debug_page(page, "pre-login")

    async def _fill_and_submit():
        """Fill credentials and click sign in using keyboard input for Angular."""
        user_field = page.locator("input[formcontrolname='textUsuario']").first
        await user_field.wait_for(state="visible", timeout=10000)
        await user_field.click()
        await user_field.fill("")
        await user_field.type(settings.cen_username, delay=50)
        logger.info("Username typed")

        pwd_field = page.locator("input[formcontrolname='textClave']").first
        await pwd_field.wait_for(state="visible", timeout=10000)
        await pwd_field.click()
        await pwd_field.fill("")
        await pwd_field.type(settings.cen_password, delay=50)
        logger.info("Password typed")

        await page.wait_for_timeout(1000)

        # Debug: check button state before clicking
        submit_btn = page.locator(
            "button:has-text('Sign in'), button:has-text('Ingresar'), "
            "button[type='submit']"
        ).first
        is_disabled = await submit_btn.is_disabled()
        btn_text = await submit_btn.inner_text()
        logger.info(f"Submit button: text='{btn_text.strip()}', disabled={is_disabled}")

        if is_disabled:
            logger.warning("Submit button is disabled - form validation may have failed")
            await _debug_page(page, "btn-disabled")

        await submit_btn.click()
        logger.info("Login button clicked")

    # First attempt
    await _fill_and_submit()

    # Handle "active session" modal - click Continue to close previous session
    await page.wait_for_timeout(3000)
    continue_btn = page.locator("button:has-text('Continue'), button:has-text('Continuar')").first
    if await continue_btn.is_visible():
        logger.info("Active session detected - clicking Continue to close it")
        await continue_btn.click()
        await page.wait_for_timeout(3000)

        # After dismissing active session, form is cleared - re-fill and re-submit
        logger.info("Re-filling credentials after session dismissal")
        await _fill_and_submit()

    # Wait for redirect to home
    try:
        await page.wait_for_url("**/home/welcome**", timeout=30000)
        logger.info("Login successful - redirected to home/welcome")
    except Exception:
        await page.wait_for_timeout(5000)
        current_url = page.url
        logger.info(f"Post-login URL: {current_url}")

        if "/portal/login" in current_url:
            await _debug_page(page, "login-failed")
            body = await page.inner_text("body")
            raise Exception(f"Login failed - still on login page. Body: {body[:300]}")
        else:
            logger.info(f"Login successful - redirected to {current_url}")


async def _navigate_to_purchase_orders(page: Page) -> None:
    """Navigate to Check Purchase Order page via direct URL."""
    logger.info("Navigating to Check Purchase Order")

    await _debug_page(page, "home-page")

    # Navigate directly to purchase orders page instead of clicking through menus
    po_url = "https://cencarvajal.com/purchaseordersportal/#/home/purchase-orders"
    await page.goto(po_url, wait_until="domcontentloaded", timeout=60000)
    await page.wait_for_timeout(5000)

    await _debug_page(page, "po-page")

    # Wait for the search form to load - look for the date inputs
    await page.locator("input[placeholder*='Start Date']").first.wait_for(
        state="visible", timeout=30000
    )
    await page.wait_for_timeout(2000)
    logger.info("Purchase order search page loaded")


async def _set_date_range(page: Page, start_date: date, end_date: date) -> None:
    """Set the date range in the search filters."""
    logger.info(f"Setting date range: {start_date} to {end_date}")

    # Use placeholder*= to match with or without leading space
    start_input = page.locator("input[placeholder*='Start Date']").first
    await start_input.click()
    await start_input.fill("")
    start_str = start_date.strftime("%d/%m/%Y") + " 00:00"
    await start_input.type(start_str, delay=30)
    await page.keyboard.press("Escape")
    await page.wait_for_timeout(500)

    end_input = page.locator("input[placeholder*='End Date']").first
    await end_input.click()
    await end_input.fill("")
    end_str = end_date.strftime("%d/%m/%Y") + " 23:59"
    await end_input.type(end_str, delay=30)
    await page.keyboard.press("Escape")
    await page.wait_for_timeout(500)


async def _search_and_collect_orders(page: Page) -> list[dict]:
    """Click search and collect all order rows from the results table."""
    logger.info("Searching for purchase orders")

    search_btn = page.locator("button:has-text('Search'), button:has-text('Buscar')").first
    logger.info("Clicking search button")
    await search_btn.click()
    await page.wait_for_timeout(8000)
    await _debug_page(page, "search-results")

    # Check if "We did not find information" / "No encontramos información" message appears
    no_results = page.locator("text=We did not find information, text=No encontramos información, text=did not find")
    if await no_results.is_visible():
        logger.info("No orders found in date range")
        return []

    # Collect orders from all pages
    all_orders = []
    page_num = 1

    while True:
        logger.info(f"Collecting orders from page {page_num}")

        # Extract rows from current page
        rows = page.locator("table tbody tr, .order-row, [class*='row']").filter(
            has=page.locator("text=Pastry Chef")
        )
        count = await rows.count()

        if count == 0:
            # Try alternative: look for elements containing document numbers
            # The table may not be a standard HTML table
            rows = page.locator("[class*='result'], [class*='item']").filter(
                has=page.locator("text=Pastry Chef")
            )
            count = await rows.count()

        if count == 0:
            # Fallback: extract doc numbers directly from the page text
            content = await page.content()
            import re
            doc_numbers = re.findall(r'\b(5\d{7}|6\d{7})\b', content)
            # Filter to likely document numbers (8 digits starting with 5 or 6)
            doc_numbers = list(set(doc_numbers))
            logger.info(f"Found {len(doc_numbers)} document numbers via regex on page {page_num}")

            for doc_num in doc_numbers:
                # Try to find the date near this doc number
                date_match = re.search(
                    rf'{doc_num}.*?(\d{{2}}/\d{{2}}/\d{{4}})',
                    content,
                    re.DOTALL
                )
                doc_date = date_match.group(1) if date_match else ""
                all_orders.append({
                    "doc_number": doc_num,
                    "doc_date": doc_date,
                })
        else:
            for i in range(count):
                row = rows.nth(i)
                text = await row.inner_text()
                # Extract doc number (8 digit number)
                import re
                num_match = re.search(r'\b(\d{8})\b', text)
                date_match = re.search(r'(\d{2}/\d{2}/\d{4})', text)
                if num_match:
                    all_orders.append({
                        "doc_number": num_match.group(1),
                        "doc_date": date_match.group(1) if date_match else "",
                    })

        # Check for next page
        next_btn = page.locator("button[aria-label='Next page'], [class*='next']").first
        if await next_btn.count() > 0 and await next_btn.is_enabled():
            await next_btn.click()
            await page.wait_for_timeout(3000)
            page_num += 1
        else:
            break

    logger.info(f"Total orders found: {len(all_orders)}")
    return all_orders


async def _download_pdf(page: Page, doc_number: str) -> bytes | None:
    """Download the PDF for a specific document number."""
    logger.info(f"Downloading PDF for document {doc_number}")

    try:
        # Debug: log the HTML structure around this doc number
        doc_element = page.locator(f"text={doc_number}").first
        if not await doc_element.count():
            logger.warning(f"Could not find element for document {doc_number}")
            return None

        # Get ancestor HTML to understand the DOM structure
        ancestor_html = await doc_element.evaluate(
            """el => {
                let p = el;
                for (let i = 0; i < 5; i++) { if (p.parentElement) p = p.parentElement; }
                return p.outerHTML.substring(0, 2000);
            }"""
        )
        logger.info(f"[DEBUG:download] HTML around {doc_number}: {ancestor_html[:1000]}")

        # Try multiple approaches to find/click the download action
        # Approach 1: Look for mat-icon buttons near the doc number (within ancestor)
        row_container = doc_element.locator("xpath=ancestor::*[contains(@class, 'row') or self::tr or contains(@class, 'card')]").first
        if not await row_container.count():
            # Try broader ancestor levels
            for level in [3, 4, 5, 6]:
                row_container = doc_element.locator(f"xpath=ancestor::*[{level}]")
                buttons = row_container.locator("button, mat-icon, a, [role='button']")
                btn_count = await buttons.count()
                if btn_count > 0:
                    logger.info(f"Found {btn_count} clickable elements at ancestor level {level}")
                    break

        # List all buttons/icons in the container
        buttons = row_container.locator("button, mat-icon, [mattooltip], a[href]")
        btn_count = await buttons.count()
        logger.info(f"Found {btn_count} buttons/icons in row container")
        for i in range(min(btn_count, 8)):
            btn = buttons.nth(i)
            btn_text = await btn.inner_text()
            btn_tooltip = await btn.get_attribute("mattooltip") or ""
            btn_class = await btn.get_attribute("class") or ""
            logger.info(f"  Button {i}: text='{btn_text.strip()}' tooltip='{btn_tooltip}' class='{btn_class[:80]}'")

        # Try clicking a download-related button
        download_btn = row_container.locator(
            "[mattooltip*='ownload'], [mattooltip*='escarg'], "
            "mat-icon:has-text('cloud_download'), mat-icon:has-text('file_download'), "
            "mat-icon:has-text('download'), mat-icon:has-text('get_app')"
        ).first

        if await download_btn.count():
            logger.info(f"Found download button for {doc_number}")
            async with page.expect_download(timeout=30000) as download_info:
                await download_btn.click()
                await page.wait_for_timeout(2000)

                # Handle download modal if it appears
                modal_btn = page.locator("button:has-text('Download'), button:has-text('Descargar')").first
                if await modal_btn.is_visible():
                    async with page.expect_download(timeout=30000) as download_info2:
                        await modal_btn.click()
                    download = await download_info2.value
                else:
                    download = await download_info.value

            path = await download.path()
            if path:
                with open(path, "rb") as f:
                    pdf_bytes = f.read()
                logger.info(f"Downloaded PDF for {doc_number}: {len(pdf_bytes)} bytes")
                return pdf_bytes

    except Exception as e:
        logger.error(f"Failed to download PDF for {doc_number}: {e}")

    # Fallback: try QR link approach
    return await _download_pdf_via_qr(page, doc_number)


async def _download_pdf_via_qr(page: Page, doc_number: str) -> bytes | None:
    """Fallback: get the presigned URL via QR code and download with httpx."""
    logger.info(f"Trying QR link fallback for document {doc_number}")

    try:
        import httpx

        # Find the row and QR icon
        row = page.locator(f"text={doc_number}").first
        row_container = row.locator("xpath=ancestor::*[3]")

        # Find QR icon (looks like a grid)
        qr_btn = row_container.locator("[mattooltip*='QR'], [class*='qr'], mat-icon:has-text('qr')").first
        if not await qr_btn.count():
            qr_btn = row_container.locator("mat-icon, button").nth(1)  # QR is typically the second icon

        await qr_btn.click()
        await page.wait_for_timeout(2000)

        # Click "Copy link" button in the QR modal
        copy_btn = page.get_by_role("button", name="Copy link")
        if await copy_btn.is_visible():
            # Get the link by intercepting clipboard or reading the page
            # Try to find the presigned URL in the page
            qr_modal = page.locator("[class*='modal'], [class*='dialog'], mat-dialog-container").first
            modal_html = await qr_modal.inner_html() if await qr_modal.count() else await page.content()

            import re
            url_match = re.search(r'https://downloads\.cencarvajal\.com[^"\'<>\s]+', modal_html)

            if url_match:
                presigned_url = url_match.group(0)
                logger.info(f"Found presigned URL for {doc_number}")

                # Download via httpx
                async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                    resp = await client.get(presigned_url)
                    if resp.status_code == 200 and len(resp.content) > 100:
                        logger.info(f"Downloaded PDF via presigned URL: {len(resp.content)} bytes")
                        # Close modal
                        close_btn = page.locator("[class*='close'], button:has-text('×')").first
                        if await close_btn.count():
                            await close_btn.click()
                        return resp.content

        # Close modal if still open
        await page.keyboard.press("Escape")
        await page.wait_for_timeout(500)

    except Exception as e:
        logger.error(f"QR fallback failed for {doc_number}: {e}")

    return None


async def scrape_cen_carvajal(
    target_date: date | None = None,
) -> list[ScrapedOrder]:
    """
    Main scraper function. Logs into CEN Carvajal, searches for purchase orders,
    and downloads their PDFs.

    Args:
        target_date: Date to search for orders. Defaults to yesterday.

    Returns:
        List of ScrapedOrder objects with PDF bytes.
    """
    if target_date is None:
        target_date = date.today() - timedelta(days=1)

    start_date = target_date
    end_date = date.today()

    scraped_orders: list[ScrapedOrder] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-web-security",
                "--disable-features=VizDisplayCompositor",
            ],
        )

        context = await browser.new_context(
            accept_downloads=True,
            viewport={"width": 1920, "height": 1080},
            locale="en-US",
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        )

        page = await context.new_page()

        try:
            # Step 1: Login
            await _login(page)

            # Step 2: Navigate to purchase orders
            await _navigate_to_purchase_orders(page)

            # Step 3: Set date range and search
            await _set_date_range(page, start_date, end_date)
            orders = await _search_and_collect_orders(page)

            if not orders:
                logger.info("No new orders found")
                return []

            # Step 4: Download PDFs for each order
            for order_info in orders:
                doc_number = order_info["doc_number"]
                doc_date = order_info.get("doc_date", "")

                pdf_bytes = await _download_pdf(page, doc_number)
                if pdf_bytes:
                    filename = f"OC_OXXO_{doc_number}_{doc_date.replace('/', '')}.pdf"
                    scraped_orders.append(ScrapedOrder(
                        doc_number=doc_number,
                        doc_date=doc_date,
                        pdf_bytes=pdf_bytes,
                        pdf_filename=filename,
                    ))
                else:
                    logger.warning(f"Could not download PDF for {doc_number}")

        except Exception as e:
            logger.error(f"Scraping failed: {e}", exc_info=True)
            raise
        finally:
            await browser.close()

    logger.info(f"Scraping complete. Downloaded {len(scraped_orders)} PDFs.")
    return scraped_orders
