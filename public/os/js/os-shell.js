(function () {
  const body = document.body;
  if (!body || !body.classList.contains('os-page')) return;

  const byId = (id) => document.getElementById(id);
  const boot = byId('osBoot');
  const setup = byId('osSetup');
  const desktop = byId('osDesktop');
  const frame = byId('osFrame');
  const frameTitle = byId('osWindowTitle');
  const stepLabel = byId('osSetupStep');
  const panes = Array.from(document.querySelectorAll('.os-setup-pane'));
  const backBtn = byId('osSetupBack');
  const nextBtn = byId('osSetupNext');
  const themeBtns = Array.from(document.querySelectorAll('.os-option'));
  const nameInput = byId('osSetupName');
  const deviceInput = byId('osSetupDevice');
  const userLabel = byId('osUserLabel');
  const clockLabel = byId('osClockLabel');
  const launchpad = byId('osLaunchpad');
  const openLaunchpad = byId('osOpenLaunchpad');
  const closeLaunchpad = byId('osCloseLaunchpad');
  const dock = byId('osDock');
  const dockItems = Array.from(document.querySelectorAll('.os-dock-item'));
  const launchpadApps = Array.from(document.querySelectorAll('.os-launchpad-app'));

  const STORAGE_THEME = 'rift_os_theme_v2';
  const STORAGE_NAME = 'rift_os_name_v2';
  const STORAGE_DEVICE = 'rift_os_device_v2';

  const appTitle = body.dataset.osTitle || 'desktop';
  const appSrc = body.dataset.osSrc || '/games';
  const appKey = body.dataset.osApp || '';
  let step = 0;

  function setTheme(theme) {
    body.classList.remove('os-theme-midnight', 'os-theme-frost');
    if (theme === 'midnight') body.classList.add('os-theme-midnight');
    if (theme === 'frost') body.classList.add('os-theme-frost');
    localStorage.setItem(STORAGE_THEME, theme);
  }

  function applyProfile() {
    const name = (localStorage.getItem(STORAGE_NAME) || 'owner').trim() || 'owner';
    const device = (localStorage.getItem(STORAGE_DEVICE) || 'rift desktop').trim() || 'rift desktop';
    if (userLabel) userLabel.textContent = name.toLowerCase();
    document.title = `${device} - Rift OS`;
  }

  function showStep() {
    panes.forEach((pane, idx) => pane.classList.toggle('active', idx === step));
    if (backBtn) backBtn.disabled = step === 0;
    if (nextBtn) nextBtn.textContent = step === panes.length - 1 ? 'enter desktop' : 'continue';
    if (stepLabel) stepLabel.textContent = `step ${step + 1} of ${panes.length}`;
  }

  function finishSetup() {
    const name = ((nameInput && nameInput.value) || 'owner').trim().slice(0, 28) || 'owner';
    const device = ((deviceInput && deviceInput.value) || 'rift desktop').trim().slice(0, 32) || 'rift desktop';
    localStorage.setItem(STORAGE_NAME, name);
    localStorage.setItem(STORAGE_DEVICE, device);
    localStorage.setItem(STORAGE_DONE, 'true');
    applyProfile();
    if (setup) setup.classList.add('hidden');
    if (desktop) desktop.classList.add('active');
  }

  function runSetupFlow() {
    if (setup) setup.classList.remove('hidden');
    if (desktop) desktop.classList.remove('active');
    showStep();
  }

  function enterDesktop() {
    if (String(appKey || '').toLowerCase() === 'home') {
      window.location.replace('/os/macos26/macos26-home.html');
      return;
    }
    if (setup) setup.classList.add('hidden');
    if (desktop) desktop.classList.add('active');
    applyProfile();
  }

  function openPad(force) {
    if (!launchpad) return;
    const next = typeof force === 'boolean' ? force : !launchpad.classList.contains('active');
    launchpad.classList.toggle('active', next);
  }

  function updateClock() {
    if (!clockLabel) return;
    const now = new Date();
    const fmt = new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit', hour12: true });
    clockLabel.textContent = fmt.format(now).toLowerCase();
  }

  function setupDockMagnify() {
    if (!dock) return;
    dock.addEventListener('mousemove', (event) => {
      const maxDist = 110;
      dockItems.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const center = rect.left + rect.width / 2;
        const dist = Math.abs(event.clientX - center);
        const ratio = Math.max(0, (maxDist - dist) / maxDist);
        const scale = 1 + (ratio * 0.54);
        const lift = ratio * 14;
        item.style.transform = `translateY(${-lift}px) scale(${scale})`;
      });
    });
    dock.addEventListener('mouseleave', () => {
      dockItems.forEach((item) => {
        item.style.transform = 'translateY(0) scale(1)';
      });
    });
  }

  function setActiveAppClasses() {
    const active = appKey.toLowerCase();
    const appLinks = [...dockItems, ...launchpadApps];
    appLinks.forEach((link) => {
      const key = String(link.dataset.osApp || '').toLowerCase();
      link.classList.toggle('active', Boolean(active) && key === active);
    });
  }

  if (frame) frame.src = appSrc;
  if (frameTitle) frameTitle.textContent = `rift ${appTitle.toLowerCase()}`;

  themeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      themeBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      setTheme(btn.dataset.theme || 'aurora');
    });
  });

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (step === 0) return;
      step -= 1;
      showStep();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (step < panes.length - 1) {
        step += 1;
        showStep();
        return;
      }
      finishSetup();
    });
  }

  if (openLaunchpad) openLaunchpad.addEventListener('click', () => openPad(true));
  if (closeLaunchpad) closeLaunchpad.addEventListener('click', () => openPad(false));
  if (launchpad) {
    launchpad.addEventListener('click', (event) => {
      if (event.target === launchpad) openPad(false);
    });
  }
  launchpadApps.forEach((link) => {
    link.addEventListener('click', () => openPad(false));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') openPad(false);
  });

  const savedTheme = localStorage.getItem(STORAGE_THEME) || 'aurora';
  setTheme(savedTheme);
  const activeThemeBtn = themeBtns.find((btn) => btn.dataset.theme === savedTheme);
  if (activeThemeBtn) {
    themeBtns.forEach((b) => b.classList.remove('active'));
    activeThemeBtn.classList.add('active');
  }

  if (nameInput) nameInput.value = localStorage.getItem(STORAGE_NAME) || '';
  if (deviceInput) deviceInput.value = localStorage.getItem(STORAGE_DEVICE) || '';

  setActiveAppClasses();
  updateClock();
  setInterval(updateClock, 1000);
  setupDockMagnify();

  setTimeout(() => {
    if (boot) boot.classList.add('hidden');
    enterDesktop();
  }, 5000);
})();
