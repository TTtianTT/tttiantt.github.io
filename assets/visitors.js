'use strict';

(() => {
  const status = document.querySelector('#visitor-status');
  const retry = document.querySelector('#visitor-retry');
  const rows = document.querySelector('#visitor-rows');
  const markers = document.querySelector('#visitor-markers');
  const map = markers.closest('svg');
  const surface = map.parentElement;
  let tooltip = document.querySelector('#visitor-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'visitor-tooltip';
    tooltip.className = 'visitor-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.hidden = true;
    surface.append(tooltip);
    surface.style.position = 'relative';
  }
  const format = new Intl.NumberFormat('en');
  const svgNS = 'http://www.w3.org/2000/svg';
  const api = 'https://zailong-tian.grassy-koi-4336.chatgpt.site/api/';
  const productionHosts = new Set(['tttiantt.github.io', 'tianzailong.page']);
  const shouldTrack = window.location.protocol === 'https:' && productionHosts.has(window.location.hostname) && !window.location.pathname.startsWith('/preview/');
  const tracking = (async () => {
    if (!shouldTrack) return;
    const now = Date.now();
    let first = true;
    try {
      const last = Number(localStorage.getItem('zailong:visit:last')) || 0;
      first = !last || last > now || now - last >= 86400000;
    } catch {}
    try {
      let location;
      if (first) {
        try {
          const response = await fetch('https://ipwho.is/?fields=success,country_code,region,city,latitude,longitude', { credentials: 'omit', signal: AbortSignal.timeout(4000) });
          const geo = response.ok ? await response.json() : null;
          if (geo?.success) location = { countryCode: geo.country_code, city: geo.city, region: geo.region, latitude: geo.latitude, longitude: geo.longitude };
        } catch {}
      }
      const response = await fetch(`${api}visit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit',
        body: JSON.stringify({ first, ...(location ? { location } : {}) }), keepalive: true, signal: AbortSignal.timeout(10000),
      });
      if (response.ok && first) {
        try { localStorage.setItem('zailong:visit:last', String(now)); } catch {}
      }
    } catch {}
  })();

  const svg = (tag, attributes) => {
    const element = document.createElementNS(svgNS, tag);
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
    return element;
  };
  const hideTooltip = () => {
    tooltip.hidden = true;
  };
  const showTooltip = (group, label, x, y) => {
    tooltip.textContent = label;
    tooltip.hidden = false;
    const frame = surface.getBoundingClientRect();
    const bounds = map.getBoundingClientRect();
    const half = tooltip.offsetWidth / 2;
    const left = bounds.left - frame.left + x / 720 * bounds.width;
    tooltip.style.left = `${Math.max(half + 8, Math.min(frame.width - half - 8, left))}px`;
    tooltip.style.top = `${bounds.top - frame.top + y / 296 * bounds.height}px`;
  };
  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('.visitor-marker')) hideTooltip();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') hideTooltip(); });
  window.addEventListener('resize', hideTooltip);

  const render = data => {
    if (!Array.isArray(data.locations) || !data.summary || !data.updatedAt) throw new Error('Invalid statistics');
    const locations = data.locations;
    document.querySelector('#visitor-total').textContent = format.format(data.summary.pageviews ?? data.summary.visits);
    document.querySelector('#visitor-countries').textContent = format.format(data.summary.countries);
    document.querySelector('#visitor-locations').textContent = format.format(locations.length);
    const updated = new Date(data.updatedAt);
    document.querySelector('#visitor-updated').textContent = `Updated ${updated.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}`;
    document.querySelector('#visitor-updated').title = updated.toLocaleString();
    rows.replaceChildren();
    markers.replaceChildren();
    hideTooltip();
    const maxVisits = Math.max(1, ...locations.map(location => location.visits));
    locations.forEach(location => {
      const place = location.city || location.region || 'City not specified';
      const row = document.createElement('tr');
      const city = document.createElement('td');
      city.textContent = place;
      if (location.region && location.region !== place) {
        const region = document.createElement('span');
        region.className = 'visitor-region';
        region.textContent = location.region;
        city.append(region);
      }
      const country = document.createElement('td');
      country.textContent = location.country;
      const count = document.createElement('td');
      count.className = 'visitor-count-column';
      const countLayout = document.createElement('span');
      countLayout.className = 'visitor-count';
      const track = document.createElement('span');
      track.className = 'visitor-count-track';
      track.setAttribute('aria-hidden', 'true');
      const fill = document.createElement('span');
      fill.className = 'visitor-count-fill';
      fill.style.width = `${location.visits / maxVisits * 100}%`;
      track.append(fill);
      const number = document.createElement('strong');
      number.textContent = format.format(location.visits);
      countLayout.append(track, number);
      count.append(countLayout);
      row.append(city, country, count);
      rows.append(row);
    });
    // Large points go first, keeping quieter nearby places accessible.
    [...locations].sort((a, b) => b.visits - a.visits).forEach(location => {
      if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) return;
      const x = (location.longitude + 180) * 2;
      const y = (84 - location.latitude) * 2;
      if (x < 0 || x > 720 || y < 0 || y > 296) return;
      const place = location.city || location.region;
      const where = place ? `${place}, ${location.country}` : location.country;
      const label = `${where} · ${format.format(location.visits)} ${location.visits === 1 ? 'visit' : 'visits'}`;
      const radius = 3.5 + Math.min(4, Math.log10(location.visits + 1) * 2.5);
      const weight = Math.min(1, Math.log(Math.max(1, location.visits)) / Math.log(50));
      const shade = [147, 171, 127].map((value, i) => Math.round(value + ([48, 77, 65][i] - value) * weight));
      const group = svg('g', { class: 'visitor-marker', tabindex: '0', role: 'button', 'aria-label': label, 'aria-describedby': 'visitor-tooltip' });
      group.append(
        svg('circle', { cx: x, cy: y, r: Math.max(12, radius + 5), fill: 'transparent' }),
        svg('circle', { cx: x, cy: y, r: radius + 4, class: 'visitor-point-halo' }),
        svg('circle', { cx: x, cy: y, r: radius, class: 'visitor-point', fill: `rgb(${shade.join(',')})` }),
      );
      const show = () => showTooltip(group, label, x, y);
      group.addEventListener('pointerenter', show);
      group.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse' && document.activeElement !== group) hideTooltip(); });
      group.addEventListener('focus', show);
      group.addEventListener('blur', hideTooltip);
      group.addEventListener('click', show);
      group.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); show(); }
      });
      markers.append(group);
    });
    map.setAttribute('aria-label', `Visitor map: visits from ${locations.length} locations`);
    document.querySelector('#visitor-table-wrap').hidden = locations.length === 0;
    status.hidden = locations.length > 0;
    status.textContent = locations.length ? '' : 'New visitor locations will appear here.';
    retry.hidden = true;
  };

  let loading = false;
  const load = async () => {
    if (loading) return;
    loading = true;
    retry.hidden = true;
    status.hidden = false;
    status.textContent = 'Loading visitor locations…';
    try {
      await tracking;
      const response = await fetch(`${api}visitor-stats`, { signal: AbortSignal.timeout(20000), credentials: 'omit' });
      if (!response.ok) throw new Error('Statistics unavailable');
      render(await response.json());
    } catch {
      status.textContent = 'Visitor statistics are temporarily unavailable.';
      retry.hidden = false;
    } finally {
      loading = false;
    }
  };
  retry.addEventListener('click', load);
  load();
})();
