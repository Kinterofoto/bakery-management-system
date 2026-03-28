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


async def _dismiss_modals(page: Page) -> None:
    """Dismiss any blocking modals (reset process, cookie consent, alerts)."""
    # Look for common dismiss buttons in modals/dialogs
    dismiss_selectors = [
        "button:has-text('Accept')",
        "button:has-text('Aceptar')",
        "button:has-text('OK')",
        "button:has-text('Close')",
        "button:has-text('Cerrar')",
        "[class*='modal'] button[class*='close']",
        "[class*='dialog'] button[class*='close']",
        "p-dialog button[class*='close']",
        ".p-dialog-header-close",
    ]
    for selector in dismiss_selectors:
        try:
            btn = page.locator(selector).first
            if await btn.is_visible():
                btn_text = await btn.inner_text()
                logger.info(f"Dismissing modal with button: '{btn_text.strip()}'")
                await btn.click()
                await page.wait_for_timeout(1500)
        except Exception:
            pass


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

    # Debug in case of issues
    logger.info(f"Login page URL: {page.url}")

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

    # Dismiss any modals before login (reset process, cookie consent, etc.)
    await _dismiss_modals(page)

    # First attempt
    await _fill_and_submit()

    # Wait a moment for modals or redirects
    await page.wait_for_timeout(3000)

    # Handle "reset process in progress" modal after login attempt
    await _dismiss_modals(page)

    # Handle "active session" modal - click Continue to close previous session
    continue_btn = page.locator("button:has-text('Continue'), button:has-text('Continuar')").first
    if await continue_btn.is_visible():
        logger.info("Active session detected - clicking Continue to close it")
        await continue_btn.click()
        await page.wait_for_timeout(3000)

        # After dismissing active session, form is cleared - re-fill and re-submit
        logger.info("Re-filling credentials after session dismissal")
        await _dismiss_modals(page)
        await _fill_and_submit()
        await page.wait_for_timeout(3000)
        await _dismiss_modals(page)

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

    # Navigate directly to purchase orders page instead of clicking through menus
    po_url = "https://cencarvajal.com/purchaseordersportal/#/home/purchase-orders"
    await page.goto(po_url, wait_until="domcontentloaded", timeout=60000)
    await page.wait_for_timeout(5000)

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

    # Check if "We did not find information" / "No encontramos información" message appears
    no_results = page.locator("text=We did not find information, text=No encontramos información, text=did not find")
    if await no_results.is_visible():
        logger.info("No orders found in date range")
        return []

    # Collect orders from all pages
    all_orders = []
    seen_docs = set()
    page_num = 1

    while True:
        logger.info(f"Collecting orders from page {page_num}")

        # Extract rows from PrimeNG datatable
        rows = page.locator(".p-datatable-scrollable-body tr.p-selectable-row, .p-datatable tbody tr.p-selectable-row")
        count = await rows.count()
        logger.info(f"Found {count} PrimeNG table rows on page {page_num}")

        if count > 0:
            for i in range(count):
                row = rows.nth(i)
                text = await row.inner_text()
                num_match = re.search(r'\b(\d{8})\b', text)
                date_match = re.search(r'(\d{2}/\d{2}/\d{4})', text)
                if num_match:
                    doc_num = num_match.group(1)
                    if doc_num not in seen_docs:
                        seen_docs.add(doc_num)
                        all_orders.append({
                            "doc_number": doc_num,
                            "doc_date": date_match.group(1) if date_match else "",
                        })
        else:
            # Fallback: extract doc numbers from page HTML
            content = await page.content()
            doc_numbers = list(set(re.findall(r'\b(6\d{7})\b', content)))
            logger.info(f"Fallback: found {len(doc_numbers)} doc numbers via regex")
            for doc_num in doc_numbers:
                if doc_num not in seen_docs:
                    seen_docs.add(doc_num)
                    date_match = re.search(rf'{doc_num}.*?(\d{{2}}/\d{{2}}/\d{{4}})', content, re.DOTALL)
                    all_orders.append({
                        "doc_number": doc_num,
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
    """Download the PDF for a specific document number from PrimeNG datatable."""
    logger.info(f"Downloading PDF for document {doc_number}")

    try:
        # Find the specific <tr> row containing this document number
        table_row = page.locator(f"tr:has-text('{doc_number}')").first
        if not await table_row.count():
            logger.warning(f"Could not find table row for document {doc_number}")
            return None

        # Find the Download button by its id within this row
        download_btn = table_row.locator("#btn_download_types button, #btn_download_types").first

        if not await download_btn.count():
            # Fallback: find button with pi-download icon
            download_btn = table_row.locator(
                "button:has(.pi-download), p-button[icon*='download'] button"
            ).first

        if await download_btn.count():
            logger.info(f"Clicking download button for {doc_number}")
            async with page.expect_download(timeout=30000) as download_info:
                await download_btn.click()
                await page.wait_for_timeout(2000)

                # Handle download modal if it appears
                modal_btn = page.locator(
                    "[class*='modal'] button:has-text('Download'), "
                    "[class*='dialog'] button:has-text('Download'), "
                    "p-dialog button:has-text('Download')"
                ).first
                if await modal_btn.is_visible():
                    logger.info("Download modal detected, clicking modal Download")
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
        else:
            logger.warning(f"No download button found in row for {doc_number}")

    except Exception as e:
        logger.error(f"Failed to download PDF for {doc_number}: {e}")

    # Fallback: try selecting row checkbox + Consolidated PDF, or QR link
    return await _download_pdf_via_qr(page, doc_number)


async def _download_pdf_via_qr(page: Page, doc_number: str) -> bytes | None:
    """Fallback: get the presigned URL via QR code and download with httpx."""
    logger.info(f"Trying QR link fallback for document {doc_number}")

    try:
        import httpx

        # Find the table row
        table_row = page.locator(f"tr:has-text('{doc_number}')").first
        if not await table_row.count():
            logger.warning(f"Could not find row for QR fallback: {doc_number}")
            return None

        # Find QR button in this row by id or icon
        qr_btn = table_row.locator(
            "#btn_qr_code button, #btn_qr_code, "
            "button:has(.pi-qrcode), p-button[icon*='qr'] button"
        ).first

        if not await qr_btn.count():
            # Try the second icon-only button (first is download, second is QR)
            icon_btns = table_row.locator("p-button[styleclass='listEnd'] button")
            if await icon_btns.count() >= 2:
                qr_btn = icon_btns.nth(1)

        if not await qr_btn.count():
            logger.warning(f"No QR button found for {doc_number}")
            return None

        await qr_btn.click()
        await page.wait_for_timeout(3000)

        # Look for presigned URL in the modal or page
        page_html = await page.content()
        url_match = re.search(r'https://downloads\.cencarvajal\.com[^"\'<>\s]+', page_html)

        if url_match:
            presigned_url = url_match.group(0)
            logger.info(f"Found presigned URL for {doc_number}")

            async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                resp = await client.get(presigned_url)
                if resp.status_code == 200 and len(resp.content) > 100:
                    logger.info(f"Downloaded PDF via presigned URL: {len(resp.content)} bytes")
                    await page.keyboard.press("Escape")
                    await page.wait_for_timeout(500)
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
