import { test, expect, mockNetwork, markers, PLACES, SCANNED_NAME } from './fixtures';

test.describe('Demo FarmaSearch', () => {
  test('la pantalla de inicio carga sin errores', async ({ page, errors }) => {
    await mockNetwork(page);
    await page.goto('/');

    await expect(page.getByRole('heading', { name: '¿Qué medicamento buscas?' })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Nombre del medicamento' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ibuprofeno' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Farmacias de Guardia/ })).toBeVisible();
    await expect(page.locator('.leaflet-container')).toBeVisible();
    // Icons come from the bundled Font Awesome, not a CDN
    const iconFont = await page.locator('.fa-search').evaluate(el => getComputedStyle(el, '::before').fontFamily);
    expect(iconFont).toContain('Font Awesome');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
    expect(errors).toEqual([]);
  });

  test('buscar un medicamento muestra farmacias y sus detalles', async ({ page, context, errors }) => {
    await mockNetwork(page);
    await page.goto('/');

    await page.getByRole('searchbox', { name: 'Nombre del medicamento' }).fill('Ibuprofeno');
    await page.keyboard.press('Enter');

    await expect(page.getByText('3 farmacias · toca un marcador')).toBeVisible();
    await expect(markers(page)).toHaveCount(3);
    await expect(page.getByText('Ejemplo', { exact: true })).toHaveCount(0);

    await page.locator(`.leaflet-marker-icon[title="${PLACES.default[0].title}"]`).click();
    const sheet = page.getByRole('heading', { name: PLACES.default[0].title });
    await expect(sheet).toBeVisible();
    await expect(page.getByText(/STOCK ESTIMADO/)).toBeVisible();

    const whatsapp = page.getByRole('link', { name: /RESERVAR POR WHATSAPP/ });
    await expect(whatsapp).toHaveAttribute('href', /^https:\/\/wa\.me\/\d+\?text=Hola%2C/);
    await expect(whatsapp).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(page.getByRole('link', { name: /LLAMAR AHORA/ })).toHaveAttribute('href', /^tel:\+\d+$/);

    const popupPromise = context.waitForEvent('page');
    await page.getByRole('button', { name: /CÓMO LLEGAR/ }).click();
    const popup = await popupPromise;
    expect(popup.url()).toContain('https://www.google.com/maps/place/');
    await popup.close();

    await page.getByRole('button', { name: 'Cerrar detalles' }).click();
    await expect(sheet).toHaveCount(0);

    await page.getByRole('button', { name: 'Volver' }).click();
    await expect(page.getByRole('heading', { name: '¿Qué medicamento buscas?' })).toBeVisible();
    await expect(markers(page)).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('una segunda búsqueda muestra los datos nuevos al tocar el marcador', async ({ page, errors }) => {
    await mockNetwork(page);
    await page.goto('/');

    await page.getByRole('button', { name: 'Ibuprofeno' }).click();
    await expect(markers(page)).toHaveCount(3);
    await page.getByRole('button', { name: 'Volver' }).click();

    await page.getByRole('button', { name: 'Insulina' }).click();
    await expect(page.getByText('1 farmacia · toca un marcador')).toBeVisible();
    await expect(markers(page)).toHaveCount(1);
    await markers(page).first().click();
    await expect(page.getByRole('heading', { name: PLACES.insulina[0].title })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('si Gemini falla se muestran farmacias de ejemplo marcadas como tal', async ({ page, errors }) => {
    await mockNetwork(page, 'error');
    await page.goto('/');

    await page.getByRole('button', { name: 'Paracetamol' }).click();
    await expect(page.getByText('Ejemplo', { exact: true })).toBeVisible();
    await expect(markers(page)).toHaveCount(2);
    await markers(page).first().click();
    await expect(page.getByRole('heading', { name: /Farmacia (Central|del Sol)/ })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('las búsquedas recientes se guardan y el botón de guardia no las ensucia', async ({ page }) => {
    await mockNetwork(page);
    await page.goto('/');

    await page.getByRole('searchbox', { name: 'Nombre del medicamento' }).fill('Amoxicilina');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(page.getByText(/farmacias · toca un marcador/)).toBeVisible();
    await page.getByRole('button', { name: 'Volver' }).click();

    await page.getByRole('button', { name: /Farmacias de Guardia/ }).click();
    await expect(page.getByText(/farmacias · toca un marcador/)).toBeVisible();

    await page.reload();
    const chips = page.locator('button', { hasText: '●' });
    await expect(chips.first()).toHaveText(/Amoxicilina/);
    await expect(chips.filter({ hasText: /guardia/i })).toHaveCount(0);
    await expect(chips).toHaveCount(5);
  });

  test('funciona aunque el usuario deniegue la ubicación', async ({ browser, errors }) => {
    const context = await browser.newContext({ permissions: [], locale: 'es-ES' });
    const page = await context.newPage();
    page.on('pageerror', err => errors.push(err.message));
    await mockNetwork(page);
    await page.goto('/');

    await page.getByRole('button', { name: 'Ibuprofeno' }).click();
    await expect(markers(page)).toHaveCount(3);
    expect(errors).toEqual([]);
    await context.close();
  });

  test('escanear una caja busca el medicamento detectado y apaga la cámara', async ({ page, errors }) => {
    await page.addInitScript(() => {
      const w = window as any;
      w.__streams = [];
      const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        const stream = await original(constraints);
        w.__streams.push(stream);
        return stream;
      };
    });
    await mockNetwork(page);
    await page.goto('/');

    await page.getByRole('button', { name: /ESCANEAR CAJA/ }).click();
    const shutter = page.getByRole('button', { name: 'Hacer foto' });
    await expect(shutter).toBeEnabled();
    await shutter.click();

    await expect(page.getByText(SCANNED_NAME)).toBeVisible();
    await expect(markers(page)).toHaveCount(3);
    const liveTracks = await page.evaluate(() =>
      (window as any).__streams.flatMap((s: MediaStream) => s.getTracks()).filter((t: MediaStreamTrack) => t.readyState === 'live').length,
    );
    expect(liveTracks).toBe(0);

    // Closing without taking a photo also releases the camera
    await page.getByRole('button', { name: 'Volver' }).click();
    await page.getByRole('button', { name: /ESCANEAR CAJA/ }).click();
    await expect(page.getByRole('button', { name: 'Hacer foto' })).toBeEnabled();
    await page.getByRole('button', { name: 'Cerrar escáner' }).click();
    await expect.poll(() => page.evaluate(() =>
      (window as any).__streams.flatMap((s: MediaStream) => s.getTracks()).filter((t: MediaStreamTrack) => t.readyState === 'live').length,
    )).toBe(0);
    expect(errors).toEqual([]);
  });

  test('la búsqueda por voz avisa si el navegador no la soporta', async ({ page, errors }) => {
    await page.addInitScript(() => {
      delete (window as any).webkitSpeechRecognition;
      delete (window as any).SpeechRecognition;
    });
    await mockNetwork(page);
    await page.goto('/');

    await page.getByRole('button', { name: /Búsqueda Voz/i }).click();
    await expect(page.getByRole('alert')).toContainText('no soporta búsqueda por voz');
    expect(errors).toEqual([]);
  });

  test('FarmaVoz muestra un aviso si no puede conectar', async ({ page }) => {
    await page.routeWebSocket(/generativelanguage\.googleapis\.com/, ws => ws.close({ code: 1011, reason: 'test' }));
    await mockNetwork(page);
    await page.goto('/');

    const assistant = page.getByRole('button', { name: /Asistente de voz/ });
    await assistant.click();
    await expect(page.getByRole('alert')).toContainText(/FarmaVoz/, { timeout: 15_000 });
    await expect(assistant.locator('.animate-spin')).toHaveCount(0);
  });
});
