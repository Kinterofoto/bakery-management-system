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

    # Use the exact formcontrolname values from CEN Carvajal
    user_field = page.locator("input[formcontrolname='textUsuario']").first
    if not await user_field.count():
        # Fallback: first visible text input
        user_field = page.locator("input[type='text']:visible").first
    await user_field.wait_for(state="visible", timeout=10000)
    await user_field.fill(settings.cen_username)
    logger.info("Username filled")

    pwd_field = page.locator("input[formcontrolname='textClave']").first
    if not await pwd_field.count():
        pwd_field = page.locator("input[type='password']:visible").first
    await pwd_field.wait_for(state="visible", timeout=10000)
    await pwd_field.fill(settings.cen_password)
    logger.info("Password filled")

    # Wait a moment for form validation
    await page.wait_for_timeout(1000)

    # Click Sign in / Ingresar
    submit_btn = page.locator(
        "button:has-text('Sign in'), button:has-text('Ingresar'), "
        "button[type='submit']"
    ).first
    await submit_btn.click()
    logger.info("Login button clicked, waiting for navigation...")

    # Handle "active session" modal - click Continue to close previous session
    await page.wait_for_timeout(3000)
    continue_btn = page.locator("button:has-text('Continue'), button:has-text('Continuar')").first
    if await continue_btn.is_visible():
        logger.info("Active session detected - clicking Continue to close it")
        await continue_btn.click()
        await page.wait_for_timeout(2000)

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
    """Navigate to Check Purchase Order page via the Your services menu."""
    logger.info("Navigating to Check Purchase Order")

    # Open "Your services" / "Tus servicios" dropdown
    your_services = page.locator("text=Your services, text=Tus servicios").first
    await your_services.wait_for(state="visible", timeout=15000)
    await your_services.click()
    await page.wait_for_timeout(2000)

    # Click "Check Purchase Order" / "Consulta de la Orden de Compra" in favorites
    check_po = page.locator(
        "text=Check Purchase Order, text=Consulta de la Orden"
    ).first
    await check_po.wait_for(state="visible", timeout=10000)
    await check_po.click()

    # Wait for the search form to load (ES/EN)
    await page.locator("text=Search Filters, text=Filtros de búsqueda").first.wait_for(
        state="visible", timeout=30000
    )
    await page.wait_for_timeout(3000)
    logger.info("Purchase order search page loaded")


async def _set_date_range(page: Page, start_date: date, end_date: date) -> None:
    """Set the date range in the search filters."""
    logger.info(f"Setting date range: {start_date} to {end_date}")

    # Clear and set Start Date via the input field
    start_input = page.locator("input[placeholder='Start Date*'], input[formcontrolname='startDate']").first
    if not await start_input.count():
        # Fallback: find by label proximity
        start_input = page.get_by_label("Start Date").first

    await start_input.click()
    await start_input.fill("")
    # Type the date in DD/MM/YYYY HH:mm format
    start_str = start_date.strftime("%d/%m/%Y") + " 00:00"
    await start_input.fill(start_str)
    await page.keyboard.press("Escape")
    await page.wait_for_timeout(500)

    # Clear and set End Date
    end_input = page.locator("input[placeholder='End Date*'], input[formcontrolname='endDate']").first
    if not await end_input.count():
        end_input = page.get_by_label("End Date").first

    await end_input.click()
    await end_input.fill("")
    end_str = end_date.strftime("%d/%m/%Y") + " 23:59"
    await end_input.fill(end_str)
    await page.keyboard.press("Escape")
    await page.wait_for_timeout(500)


async def _search_and_collect_orders(page: Page) -> list[dict]:
    """Click search and collect all order rows from the results table."""
    logger.info("Searching for purchase orders")

    await page.locator("button:has-text('Search'), button:has-text('Buscar')").first.click()
    await page.wait_for_timeout(5000)

    # Check if "We did not find information" / "No encontramos información" message appears
    no_results = page.locator("text=We did not find information, text=No encontramos información")
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
    """Download the PDF for a specific document number by clicking its download icon."""
    logger.info(f"Downloading PDF for document {doc_number}")

    try:
        # Find the row containing this document number
        row = page.locator(f"text={doc_number}").first
        if not await row.count():
            logger.warning(f"Could not find row for document {doc_number}")
            return None

        # Find the download icon in the same row/container
        # Navigate up to the row container, then find the download button
        row_container = row.locator("xpath=ancestor::*[contains(@class, 'row') or contains(@class, 'item') or self::tr]").first
        if not await row_container.count():
            # Fallback: find download icon near the doc number
            row_container = row.locator("xpath=ancestor::*[3]")

        download_btn = row_container.locator("[class*='download'], [mattooltip*='ownload'], mat-icon:has-text('download'), button:has(mat-icon)").first

        if not await download_btn.count():
            # Broader fallback: find any download-like icon in the row
            download_btn = row_container.locator("mat-icon, .material-icons, button, a").first

        # Set up download handler
        async with page.expect_download(timeout=30000) as download_info:
            await download_btn.click()
            await page.wait_for_timeout(1000)

            # Check if a modal appeared (Download Document modal)
            modal_download = page.get_by_role("button", name="Download").first
            if await modal_download.is_visible():
                # Click the Download button in the modal
                async with page.expect_download(timeout=30000) as download_info2:
                    await modal_download.click()
                download = await download_info2.value
            else:
                download = await download_info.value

        # Read the downloaded file
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
