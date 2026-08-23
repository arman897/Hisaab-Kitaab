// Ledgerly — Application Logic

// --- Constants ---
const CATEGORIES = {
  expense: ['Food & Dining', 'Rent & Maid Salary', 'Transport & Fuel', 'Shopping', 'Bills & Utilities', 'Medical & Healthcare', 'Education', 'Travel & Commute', 'UPI / Cash Transfer', 'Miscellaneous'],
  purchase: ['Electronics', 'Appliances', 'Furniture', 'Apparel', 'Vehicles & Bikes', 'Gold & Jewelry', 'Property & Land', 'Other Assets'],
  income: ['Salary', 'Freelance & Business', 'Investments (SIP / Dividends)', 'Gifts & Pocket Money', 'Refunds & Cashback', 'Other'],
  lend: ['Friend Loan', 'Family Support', 'Business Advance', 'Other Receivable'],
  borrow: ['Bank Loan', 'Friend Debt', 'Family Debt', 'Other Payable'],
  donation: ['Charity & Goodwill', 'Disaster Relief', 'Religious / Temple', 'Gifts & Grants', 'Sponsorship']
};

const COUNTERPARTY_LABELS = {
  expense: { label: 'Store / Merchant', placeholder: 'E.g., Swiggy, Zomato, local kirana shop...' },
  purchase: { label: 'Store / Merchant', placeholder: 'E.g., Croma, Reliance Digital, Amazon India...' },
  income: { label: 'Source / Payer', placeholder: 'E.g., TCS Pay Office, Client name, Bank interest...' },
  lend: { label: 'Recipient (Lent To)', placeholder: 'E.g., Rahul Sharma, Priya Nair...' },
  borrow: { label: 'Creditor (Borrowed From)', placeholder: 'E.g., HDFC Bank, Uncle Ramesh...' },
  donation: { label: 'Charity / Organization', placeholder: 'E.g., PM Cares Fund, local orphanage, temple...' }
};

// --- Application State ---
let state = {
  user: null,
  profiles: ['Personal', 'Shared / Family'],
  currentProfile: 'Personal',
  transactions: [],
  activeTab: 'dashboard',
  filters: {
    profile: 'all',
    type: 'all',
    month: '', // YYYY-MM (will default to current month in UI)
    search: ''
  }
};

// Chart instances tracker
let charts = {
  dbTrend: null,
  dbCategory: null,
  analMonthly: null,
  analCategory: null
};

// --- Generate Unique ID Fallback ---
function generateId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'tx-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
}

// --- Local Storage Management ---
function saveToLocalStorage() {
  localStorage.setItem('ledgerly_profiles', JSON.stringify(state.profiles));
  localStorage.setItem('ledgerly_current_profile', state.currentProfile);
  localStorage.setItem('ledgerly_transactions', JSON.stringify(state.transactions));
}

function loadFromLocalStorage() {
  const localProfiles = localStorage.getItem('ledgerly_profiles');
  const localCurrentProfile = localStorage.getItem('ledgerly_current_profile');
  const localTransactions = localStorage.getItem('ledgerly_transactions');
  const localUser = localStorage.getItem('ledgerly_user');

  if (localProfiles) {
    state.profiles = JSON.parse(localProfiles);
  }
  if (localCurrentProfile && state.profiles.includes(localCurrentProfile)) {
    state.currentProfile = localCurrentProfile;
  } else if (state.profiles.length > 0) {
    state.currentProfile = state.profiles[0];
  }
  
  if (localTransactions) {
    state.transactions = JSON.parse(localTransactions);
  } else {
    // Seed initial mock data if empty for a stunning first impressions demo
    seedMockData();
    saveToLocalStorage();
  }

  if (localUser) {
    state.user = JSON.parse(localUser);
  }
}

// --- Authentication Management ---
function saveUserSession() {
  localStorage.setItem('ledgerly_user', state.user ? JSON.stringify(state.user) : '');
}

function checkAuthStatus() {
  const authContainer = document.getElementById('auth-container');
  const appLayout = document.querySelector('.app-layout');
  
  if (!state.user) {
    if (authContainer) authContainer.style.display = 'flex';
    if (appLayout) appLayout.style.display = 'none';
  } else {
    if (authContainer) authContainer.style.display = 'none';
    if (appLayout) {
      appLayout.style.display = '';
      window.dispatchEvent(new Event('resize'));
    }
    updateUserWidgets();
  }
}

function updateUserWidgets() {
  const sidebarUserName = document.getElementById('sidebar-user-name');
  const sidebarUserEmail = document.getElementById('sidebar-user-email');
  const sidebarUserAvatar = document.getElementById('sidebar-user-avatar');
  
  if (state.user) {
    if (sidebarUserName) sidebarUserName.textContent = state.user.name;
    if (sidebarUserEmail) sidebarUserEmail.textContent = state.user.email;
    if (sidebarUserAvatar) {
      const initials = state.user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      sidebarUserAvatar.textContent = initials || 'GU';
    }
  }
}

function setupAuth() {
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const groupUsername = document.getElementById('group-username');
  const btnAuthSubmit = document.getElementById('btn-auth-submit');
  const authForm = document.getElementById('auth-form');
  const btnAuthGuest = document.getElementById('btn-auth-guest');
  const btnLogout = document.getElementById('btn-logout');
  const mobileLogout = document.getElementById('mobile-logout');
  const mobileThemeToggle = document.getElementById('mobile-theme-toggle');
  
  const googleBtn = document.getElementById('btn-social-google');
  const githubBtn = document.getElementById('btn-social-github');
  
  let currentAuthMode = 'login';
  
  if (tabLogin) {
    tabLogin.addEventListener('click', () => {
      currentAuthMode = 'login';
      tabLogin.classList.add('active');
      if (tabSignup) tabSignup.classList.remove('active');
      if (groupUsername) groupUsername.style.display = 'none';
      if (btnAuthSubmit) btnAuthSubmit.textContent = 'Log In';
      document.getElementById('auth-username').removeAttribute('required');
    });
  }
  
  if (tabSignup) {
    tabSignup.addEventListener('click', () => {
      currentAuthMode = 'signup';
      tabSignup.classList.add('active');
      if (tabLogin) tabLogin.classList.remove('active');
      if (groupUsername) groupUsername.style.display = 'flex';
      if (btnAuthSubmit) btnAuthSubmit.textContent = 'Sign Up';
      document.getElementById('auth-username').setAttribute('required', 'true');
    });
  }
  
  if (authForm) {
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value;
      const usernameInput = document.getElementById('auth-username');
      const name = usernameInput ? usernameInput.value.trim() : '';
      
      let accounts = [];
      const localAccounts = localStorage.getItem('ledgerly_accounts');
      if (localAccounts) accounts = JSON.parse(localAccounts);
      
      const demoAccount = { name: 'Aarav Sharma', email: 'admin@ledgerly.in', password: 'admin123' };
      if (!accounts.some(acc => acc.email === demoAccount.email)) {
        accounts.push(demoAccount);
        localStorage.setItem('ledgerly_accounts', JSON.stringify(accounts));
      }
      
      if (currentAuthMode === 'signup') {
        if (password.length < 6) {
          showToast('Password must be at least 6 characters long', 'error');
          return;
        }
        if (accounts.some(acc => acc.email === email)) {
          showToast('An account with this email already exists', 'error');
          return;
        }
        
        const newAcc = { name, email, password };
        accounts.push(newAcc);
        localStorage.setItem('ledgerly_accounts', JSON.stringify(accounts));
        
        state.user = { name, email };
        saveUserSession();
        showToast(`Welcome to Ledgerly, ${name}!`, 'success');
        checkAuthStatus();
        render();
      } else {
        const found = accounts.find(acc => acc.email === email && acc.password === password);
        if (found) {
          state.user = { name: found.name, email: found.email };
          saveUserSession();
          showToast(`Logged in successfully as ${found.name}`, 'success');
          checkAuthStatus();
          render();
        } else {
          showToast('Invalid email or password. Use demo account (admin@ledgerly.in / admin123)', 'error');
        }
      }
    });
  }
  
  if (btnAuthGuest) {
    btnAuthGuest.addEventListener('click', () => {
      state.user = { name: 'Guest User', email: 'Local Storage Mode' };
      saveUserSession();
      showToast('Logged in as Guest (Data saved locally)', 'info');
      checkAuthStatus();
      render();
    });
  }
  
  if (googleBtn) {
    googleBtn.addEventListener('click', () => {
      state.user = { name: 'Amit Verma', email: 'amit.verma@gmail.com' };
      saveUserSession();
      showToast('Successfully authenticated with Google!', 'success');
      checkAuthStatus();
      render();
    });
  }
  
  if (githubBtn) {
    githubBtn.addEventListener('click', () => {
      state.user = { name: 'Karan Patel', email: 'karan.patel@github.com' };
      saveUserSession();
      showToast('Successfully authenticated with GitHub!', 'success');
      checkAuthStatus();
      render();
    });
  }
  
  const triggerLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      state.user = null;
      saveUserSession();
      showToast('Logged out successfully', 'info');
      if (authForm) authForm.reset();
      checkAuthStatus();
    }
  };
  
  if (btnLogout) btnLogout.addEventListener('click', triggerLogout);
  if (mobileLogout) mobileLogout.addEventListener('click', triggerLogout);
  
  if (mobileThemeToggle) {
    mobileThemeToggle.addEventListener('click', () => {
      const themeBtn = document.getElementById('theme-toggle');
      if (themeBtn) themeBtn.click();
    });
  }
}

// --- Seed Mock Data ---
function seedMockData() {
  const now = new Date();
  const year = now.getFullYear();
  
  // Format target months: June, July, August (relative to current year)
  const m8 = `${year}-08`; // Current Month
  const m7 = `${year}-07`; // Last Month
  const m6 = `${year}-06`; // Two months ago

  const mockTxs = [
    // --- JUNE (m6) ---
    { id: generateId(), date: `${m6}-01`, profile: 'Personal', type: 'income', category: 'Salary', amount: 85000.00, counterparty: 'Tata Consultancy Services', description: 'Monthly salary credit' },
    { id: generateId(), date: `${m6}-05`, profile: 'Personal', type: 'expense', category: 'Rent & Maid Salary', amount: 20000.00, counterparty: 'Imperial Heights Owner', description: 'Apartment rent' },
    { id: generateId(), date: `${m6}-08`, profile: 'Personal', type: 'expense', category: 'Food & Dining', amount: 540.00, counterparty: 'Swiggy Delivery', description: 'Biryani order' },
    { id: generateId(), date: `${m6}-12`, profile: 'Personal', type: 'purchase', category: 'Electronics', amount: 24999.00, counterparty: 'Croma Retail', description: 'New office monitor' },
    { id: generateId(), date: `${m6}-15`, profile: 'Shared / Family', type: 'expense', category: 'Bills & Utilities', amount: 4500.00, counterparty: 'Tata Power Co.', description: 'Electricity bill' },
    { id: generateId(), date: `${m6}-18`, profile: 'Personal', type: 'donation', category: 'Charity & Goodwill', amount: 1500.00, counterparty: 'Goonj NGO', description: 'Monsoon relief donation' },
    { id: generateId(), date: `${m6}-22`, profile: 'Personal', type: 'lend', category: 'Friend Loan', amount: 3000.00, counterparty: 'Rahul Sharma', description: 'Lent for concert tickets' },
    { id: generateId(), date: `${m6}-28`, profile: 'Personal', type: 'expense', category: 'Bills & Utilities', amount: 650.00, counterparty: 'Netflix & Spotify', description: 'Monthly subscription' },
    
    // --- JULY (m7) ---
    { id: generateId(), date: `${m7}-01`, profile: 'Personal', type: 'income', category: 'Salary', amount: 85000.00, counterparty: 'Tata Consultancy Services', description: 'Monthly salary credit' },
    { id: generateId(), date: `${m7}-03`, profile: 'Personal', type: 'income', category: 'Freelance & Business', amount: 15500.00, counterparty: 'Design Project Client', description: 'Logo redesign invoice' },
    { id: generateId(), date: `${m7}-05`, profile: 'Personal', type: 'expense', category: 'Rent & Maid Salary', amount: 20000.00, counterparty: 'Imperial Heights Owner', description: 'Apartment rent' },
    { id: generateId(), date: `${m7}-06`, profile: 'Personal', type: 'expense', category: 'Food & Dining', amount: 3240.00, counterparty: 'Blinkit Delivery', description: 'Weekly groceries' },
    { id: generateId(), date: `${m7}-10`, profile: 'Shared / Family', type: 'expense', category: 'Food & Dining', amount: 1850.00, counterparty: 'Barbeque Nation', description: 'Family celebration dinner' },
    { id: generateId(), date: `${m7}-12`, profile: 'Personal', type: 'borrow', category: 'Family Debt', amount: 5000.00, counterparty: 'Uncle Ramesh', description: 'Borrowed for car repair excess' },
    { id: generateId(), date: `${m7}-15`, profile: 'Shared / Family', type: 'expense', category: 'Bills & Utilities', amount: 999.00, counterparty: 'Airtel Broadband', description: 'Wifi internet bill' },
    { id: generateId(), date: `${m7}-20`, profile: 'Personal', type: 'donation', category: 'Religious / Temple', amount: 2100.00, counterparty: 'Siddhivinayak Temple Trust', description: 'Annual donation' },
    { id: generateId(), date: `${m7}-22`, profile: 'Personal', type: 'income', category: 'Refunds & Cashback', amount: 3000.00, counterparty: 'Rahul Sharma', description: 'Rahul paid back the loan' },
    
    // --- AUGUST (m8) ---
    { id: generateId(), date: `${m8}-01`, profile: 'Personal', type: 'income', category: 'Salary', amount: 85000.00, counterparty: 'Tata Consultancy Services', description: 'Monthly salary credit' },
    { id: generateId(), date: `${m8}-02`, profile: 'Personal', type: 'expense', category: 'Rent & Maid Salary', amount: 20000.00, counterparty: 'Imperial Heights Owner', description: 'Apartment rent' },
    { id: generateId(), date: `${m8}-04`, profile: 'Personal', type: 'expense', category: 'Food & Dining', amount: 2450.00, counterparty: 'Instamart Delivery', description: 'Groceries' },
    { id: generateId(), date: `${m8}-06`, profile: 'Personal', type: 'expense', category: 'Transport & Fuel', amount: 850.00, counterparty: 'Ola Cabs', description: 'Weekend travel' },
    { id: generateId(), date: `${m8}-08`, profile: 'Shared / Family', type: 'expense', category: 'Food & Dining', amount: 2200.00, counterparty: 'PVR Cinemas', description: 'Movie tickets & snacks' },
    { id: generateId(), date: `${m8}-10`, profile: 'Personal', type: 'lend', category: 'Friend Loan', amount: 5000.00, counterparty: 'Priya Nair', description: 'Lent for certification course fee' },
    { id: generateId(), date: `${m8}-12`, profile: 'Personal', type: 'purchase', category: 'Apparel', amount: 3500.00, counterparty: 'Myntra Store', description: 'Running shoes & jacket' },
    { id: generateId(), date: `${m8}-14`, profile: 'Personal', type: 'donation', category: 'Charity & Goodwill', amount: 500.00, counterparty: 'GiveIndia Foundation', description: 'Monthly support donation' }
  ];

  state.transactions = mockTxs;
  state.profiles = ['Personal', 'Shared / Family'];
}

// --- Toast System ---
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = 'info';
  if (type === 'success') icon = 'check-circle';
  else if (type === 'error') icon = 'alert-triangle';

  toast.innerHTML = `
    <i data-lucide="${icon}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  // Slide out after 3.2s
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 3200);
}

// --- Tab Navigation Engine ---
function setupTabNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  const viewAllBtn = document.getElementById('btn-view-all-transactions');

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      const tabId = link.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  if (viewAllBtn) {
    viewAllBtn.addEventListener('click', () => {
      switchTab('transactions');
    });
  }
}

function switchTab(tabId) {
  state.activeTab = tabId;
  
  // Update nav active classes
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('data-tab') === tabId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Update visible section
  document.querySelectorAll('.tab-content').forEach(section => {
    if (section.id === `tab-${tabId}`) {
      section.classList.add('active');
    } else {
      section.classList.remove('active');
    }
  });

  // Update Page Title
  const titleEl = document.getElementById('page-title');
  const subtitleEl = document.getElementById('page-subtitle');
  
  const titleMap = {
    dashboard: { title: 'Dashboard Overview', sub: 'Summary of your financial status' },
    transactions: { title: 'Transactions Ledger', sub: 'Filter, search and modify history' },
    loans: { title: 'Lend & Borrow Tracker', sub: 'Monitor outstanding accounts with friends & family' },
    analytics: { title: 'Financial Analytics', sub: 'Monthly breakdowns and category spending' },
    settings: { title: 'Application Settings', sub: 'Manage profiles, export and import database' }
  };

  if (titleEl && subtitleEl && titleMap[tabId]) {
    titleEl.textContent = titleMap[tabId].title;
    subtitleEl.textContent = titleMap[tabId].sub;
  }

  // Trigger content-specific rendering
  render();
}

// --- Theme Toggler ---
function setupThemeToggler() {
  const themeBtn = document.getElementById('theme-toggle');
  const themeText = document.getElementById('theme-text');
  
  if (!themeBtn) return;

  themeBtn.addEventListener('click', () => {
    let currentTheme = document.documentElement.getAttribute('data-theme');
    let nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', nextTheme);
    document.querySelector('meta[name="color-scheme"]').content = nextTheme;
    localStorage.setItem('color-scheme', nextTheme);
    
    if (themeText) {
      themeText.textContent = nextTheme === 'dark' ? 'Dark Mode' : 'Light Mode';
    }
    
    showToast(`Switched to ${nextTheme === 'dark' ? 'dark' : 'light'} theme`, 'info');
    
    // Redraw charts since text/grid colors might need updating
    renderCharts();
  });

  // Sync initial button text
  const initialTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  if (themeText) {
    themeText.textContent = initialTheme === 'dark' ? 'Dark Mode' : 'Light Mode';
  }
}

// --- Profile Management Logic ---
function populateProfileSelectors() {
  const pSelect = document.getElementById('profile-selector');
  const filterPSelect = document.getElementById('filter-profile');
  const modalPSelect = document.getElementById('modal-profile');

  // Active Profile Selector in Sidebar
  if (pSelect) {
    pSelect.innerHTML = state.profiles.map(p => `<option value="${p}" ${p === state.currentProfile ? 'selected' : ''}>${p}</option>`).join('');
  }

  // Filter Selector in Transactions Ledger
  if (filterPSelect) {
    filterPSelect.innerHTML = `<option value="all">All Profiles</option>` + 
      state.profiles.map(p => `<option value="${p}">${p}</option>`).join('');
  }

  // Modal Profile Select Dropdown
  if (modalPSelect) {
    modalPSelect.innerHTML = state.profiles.map(p => `<option value="${p}" ${p === state.currentProfile ? 'selected' : ''}>${p}</option>`).join('');
  }

  // Update Avatar and Label
  const avatarEl = document.getElementById('active-profile-avatar');
  const nameEl = document.getElementById('active-profile-name');
  if (avatarEl) {
    avatarEl.textContent = state.currentProfile.substring(0, 2).toUpperCase();
  }
  if (nameEl) {
    nameEl.textContent = state.currentProfile;
  }
}

function setupProfileActions() {
  const pSelect = document.getElementById('profile-selector');
  const formCreate = document.getElementById('form-create-profile');
  const inlineAddBtn = document.getElementById('btn-add-profile-inline');
  const newNameInput = document.getElementById('new-profile-name');

  // Change Profile Event
  if (pSelect) {
    pSelect.addEventListener('change', (e) => {
      state.currentProfile = e.target.value;
      saveToLocalStorage();
      populateProfileSelectors();
      showToast(`Switched active profile to ${state.currentProfile}`, 'info');
      render();
    });
  }

  // Create Profile Event from Settings
  if (formCreate) {
    formCreate.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = newNameInput.value.trim();
      if (!name) return;
      
      if (state.profiles.includes(name)) {
        showToast('Profile name already exists!', 'error');
        return;
      }

      state.profiles.push(name);
      state.currentProfile = name;
      newNameInput.value = '';
      
      saveToLocalStorage();
      populateProfileSelectors();
      showToast(`Created profile "${name}"`, 'success');
      render();
    });
  }

  // Create Profile Inline button in Sidebar (scrolls/redirects to settings tab)
  if (inlineAddBtn) {
    inlineAddBtn.addEventListener('click', () => {
      switchTab('settings');
      setTimeout(() => {
        if (newNameInput) newNameInput.focus();
      }, 100);
    });
  }
}

function renderProfileSettingsList() {
  const listContainer = document.getElementById('profile-settings-list');
  if (!listContainer) return;

  listContainer.innerHTML = state.profiles.map(profile => {
    const count = state.transactions.filter(t => t.profile === profile).length;
    // Don't show delete button if it's the last remaining profile
    const deleteAction = state.profiles.length > 1 
      ? `<button class="icon-btn-small text-danger btn-delete-profile" data-profile="${profile}" title="Delete profile & transactions">
           <i data-lucide="trash"></i>
         </button>`
      : `<span class="text-muted font-small">Default</span>`;

    return `
      <li class="profile-settings-item">
        <div>
          <span class="profile-settings-name">${profile}</span>
          <span class="text-secondary font-small" style="margin-left: 8px;">(${count} transactions)</span>
        </div>
        ${deleteAction}
      </li>
    `;
  }).join('');

  lucide.createIcons();

  // Attach delete events
  listContainer.querySelectorAll('.btn-delete-profile').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetProfile = e.currentTarget.getAttribute('data-profile');
      if (confirm(`Are you absolutely sure you want to delete profile "${targetProfile}" and all its ${state.transactions.filter(t => t.profile === targetProfile).length} transactions?`)) {
        // Delete profile and filter out all transactions
        state.profiles = state.profiles.filter(p => p !== targetProfile);
        state.transactions = state.transactions.filter(t => t.profile !== targetProfile);
        
        // If current profile was deleted, switch to first available
        if (state.currentProfile === targetProfile) {
          state.currentProfile = state.profiles[0];
        }

        saveToLocalStorage();
        populateProfileSelectors();
        showToast(`Deleted profile "${targetProfile}"`, 'success');
        render();
      }
    });
  });
}

// --- Data Export & Import Operations ---
function setupBackupAndUtilities() {
  const exportBtn = document.getElementById('btn-export-data');
  const importInput = document.getElementById('import-file-input');
  const clearBtn = document.getElementById('btn-clear-database');

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
        profiles: state.profiles,
        transactions: state.transactions
      }, null, 2));
      
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `ledgerly_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Database exported successfully!', 'success');
    });
  }

  if (importInput) {
    importInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(event) {
        try {
          const importedData = JSON.parse(event.target.result);
          
          if (!importedData.profiles || !Array.isArray(importedData.profiles) ||
              !importedData.transactions || !Array.isArray(importedData.transactions)) {
            throw new Error("Invalid backup format");
          }

          if (confirm("Importing this backup will overwrite your current transactions and profiles. Do you want to continue?")) {
            state.profiles = importedData.profiles;
            state.transactions = importedData.transactions;
            
            // Validate current profile fallback
            if (state.profiles.length > 0) {
              state.currentProfile = state.profiles[0];
            } else {
              state.profiles = ['Default'];
              state.currentProfile = 'Default';
            }

            saveToLocalStorage();
            populateProfileSelectors();
            showToast('Database restored successfully!', 'success');
            render();
          }
        } catch (err) {
          showToast('Import failed. Invalid JSON backup file.', 'error');
          console.error(err);
        }
        // Reset file input so same file can be imported again
        importInput.value = '';
      };
      reader.readAsText(file);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm("⚠️ DANGER ZONE! ⚠️\n\nAre you absolutely sure you want to delete ALL data? This will permanently wipe all profiles and transactions. This cannot be undone!")) {
        state.profiles = ['Personal'];
        state.currentProfile = 'Personal';
        state.transactions = [];
        saveToLocalStorage();
        populateProfileSelectors();
        showToast('All database records cleared.', 'error');
        render();
      }
    });
  }
}

// --- Transaction Modal & CRUD Operations ---
function setupTransactionModal() {
  const modal = document.getElementById('transaction-modal');
  const openBtn = document.getElementById('btn-new-transaction');
  const closeBtn = document.getElementById('btn-modal-close');
  const cancelBtn = document.getElementById('btn-modal-cancel');
  const form = document.getElementById('transaction-form');
  const typeBtns = document.querySelectorAll('.transaction-type-selector .type-btn');
  const categorySelect = document.getElementById('modal-category');
  const customCatInput = document.getElementById('modal-custom-category');
  const toggleCustomBtn = document.getElementById('btn-toggle-custom-category');
  const amountInput = document.getElementById('modal-amount');
  const dateInput = document.getElementById('modal-date');
  const counterpartyInput = document.getElementById('modal-counterparty');
  const counterpartyLabel = document.getElementById('modal-counterparty-label');
  const editIdInput = document.getElementById('edit-transaction-id');
  const descInput = document.getElementById('modal-description');
  const modalProfileSelect = document.getElementById('modal-profile');

  // Open Modal
  if (openBtn && modal) {
    openBtn.addEventListener('click', () => {
      // Clear form
      form.reset();
      editIdInput.value = '';
      document.getElementById('modal-title').textContent = 'Add Transaction';
      
      // Default dates and profile
      dateInput.value = new Date().toISOString().split('T')[0];
      if (modalProfileSelect) {
        modalProfileSelect.value = state.currentProfile;
      }

      // Default transaction type setup
      setActiveType('expense');
      
      // Reset custom category state
      categorySelect.classList.remove('display-none');
      customCatInput.classList.add('display-none');
      toggleCustomBtn.textContent = 'Custom';

      modal.showModal();
    });
  }

  // Close Modal
  const closeModal = () => {
    if (modal) modal.close();
  };

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  // Close when clicking outside modal box
  if (modal) {
    modal.addEventListener('click', (e) => {
      const rect = modal.getBoundingClientRect();
      const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
      if (!isInDialog) {
        modal.close();
      }
    });
  }

  // Transaction type toggle event
  typeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type');
      setActiveType(type);
    });
  });

  function setActiveType(type) {
    // Check radio input
    const radio = document.querySelector(`.transaction-type-selector input[value="${type}"]`);
    if (radio) radio.checked = true;

    // Update active visual button state
    typeBtns.forEach(b => {
      if (b.getAttribute('data-type') === type) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    // Populate categories select dynamically
    if (categorySelect && CATEGORIES[type]) {
      categorySelect.innerHTML = CATEGORIES[type].map(cat => `<option value="${cat}">${cat}</option>`).join('');
    }

    // Update Counterparty label and placeholder
    if (counterpartyLabel && COUNTERPARTY_LABELS[type]) {
      counterpartyLabel.textContent = COUNTERPARTY_LABELS[type].label;
      counterpartyInput.placeholder = COUNTERPARTY_LABELS[type].placeholder;
    }
  }

  // Toggle custom category text input
  if (toggleCustomBtn && categorySelect && customCatInput) {
    toggleCustomBtn.addEventListener('click', () => {
      const isSelectVisible = !categorySelect.classList.contains('display-none');
      if (isSelectVisible) {
        categorySelect.classList.add('display-none');
        customCatInput.classList.remove('display-none');
        customCatInput.focus();
        toggleCustomBtn.textContent = 'Select';
      } else {
        categorySelect.classList.remove('display-none');
        customCatInput.classList.add('display-none');
        toggleCustomBtn.textContent = 'Custom';
      }
    });
  }

  // Handle Form Submission (Add or Update)
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const editId = editIdInput.value;
      const type = form.elements['type'].value;
      const amount = parseFloat(amountInput.value);
      const date = dateInput.value;
      const counterparty = counterpartyInput.value.trim();
      const description = descInput.value.trim();
      const profile = modalProfileSelect.value;
      
      // Determine category (select vs custom text)
      let category = '';
      if (!categorySelect.classList.contains('display-none')) {
        category = categorySelect.value;
      } else {
        category = customCatInput.value.trim() || 'Other';
      }

      if (isNaN(amount) || amount <= 0) {
        showToast('Please enter a valid amount greater than 0', 'error');
        return;
      }

      const txData = {
        id: editId || generateId(),
        date,
        profile,
        type,
        category,
        amount,
        counterparty,
        description
      };

      if (editId) {
        // Edit Mode
        const idx = state.transactions.findIndex(t => t.id === editId);
        if (idx !== -1) {
          state.transactions[idx] = txData;
          showToast('Transaction updated successfully!', 'success');
        }
      } else {
        // Create Mode
        state.transactions.unshift(txData);
        showToast('Transaction added successfully!', 'success');
      }

      saveToLocalStorage();
      modal.close();
      render();
    });
  }
}

// Open Dialog and populate for Editing
window.editTransaction = function(id) {
  const modal = document.getElementById('transaction-modal');
  const form = document.getElementById('transaction-form');
  const editIdInput = document.getElementById('edit-transaction-id');
  const amountInput = document.getElementById('modal-amount');
  const dateInput = document.getElementById('modal-date');
  const counterpartyInput = document.getElementById('modal-counterparty');
  const descInput = document.getElementById('modal-description');
  const modalProfileSelect = document.getElementById('modal-profile');
  const categorySelect = document.getElementById('modal-category');
  const customCatInput = document.getElementById('modal-custom-category');
  const toggleCustomBtn = document.getElementById('btn-toggle-custom-category');

  const tx = state.transactions.find(t => t.id === id);
  if (!tx || !modal) return;

  document.getElementById('modal-title').textContent = 'Edit Transaction';
  editIdInput.value = tx.id;
  amountInput.value = tx.amount;
  dateInput.value = tx.date;
  counterpartyInput.value = tx.counterparty;
  descInput.value = tx.description || '';
  
  if (modalProfileSelect) {
    modalProfileSelect.value = tx.profile;
  }

  // Open radio and trigger select populator
  const radio = document.querySelector(`.transaction-type-selector input[value="${tx.type}"]`);
  if (radio) radio.checked = true;

  // Manual trigger of type setup
  const typeBtns = document.querySelectorAll('.transaction-type-selector .type-btn');
  typeBtns.forEach(b => {
    if (b.getAttribute('data-type') === tx.type) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });

  if (categorySelect && CATEGORIES[tx.type]) {
    categorySelect.innerHTML = CATEGORIES[tx.type].map(cat => `<option value="${cat}">${cat}</option>`).join('');
  }

  const counterpartyLabel = document.getElementById('modal-counterparty-label');
  if (counterpartyLabel && COUNTERPARTY_LABELS[tx.type]) {
    counterpartyLabel.textContent = COUNTERPARTY_LABELS[tx.type].label;
    counterpartyInput.placeholder = COUNTERPARTY_LABELS[tx.type].placeholder;
  }

  // Check if category is predefined
  if (CATEGORIES[tx.type] && CATEGORIES[tx.type].includes(tx.category)) {
    categorySelect.value = tx.category;
    categorySelect.classList.remove('display-none');
    customCatInput.classList.add('display-none');
    toggleCustomBtn.textContent = 'Custom';
  } else {
    // Custom category
    customCatInput.value = tx.category;
    categorySelect.classList.add('display-none');
    customCatInput.removeAttribute('style'); // remove display none
    customCatInput.classList.remove('display-none');
    toggleCustomBtn.textContent = 'Select';
  }

  modal.showModal();
};

// Delete Transaction Trigger
window.deleteTransaction = function(id) {
  if (confirm('Are you sure you want to delete this transaction?')) {
    state.transactions = state.transactions.filter(t => t.id !== id);
    saveToLocalStorage();
    showToast('Transaction deleted.', 'error');
    render();
  }
};

// --- Filters Panel Logic ---
function setupFilters() {
  const filterP = document.getElementById('filter-profile');
  const filterT = document.getElementById('filter-type');
  const filterM = document.getElementById('filter-month');
  const filterS = document.getElementById('filter-search');
  const clearBtn = document.getElementById('btn-clear-filters');

  // Default month filter to current month
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  state.filters.month = currentMonthStr;
  
  if (filterM) {
    filterM.value = currentMonthStr;
  }

  const applyFilters = () => {
    if (filterP) state.filters.profile = filterP.value;
    if (filterT) state.filters.type = filterT.value;
    if (filterM) state.filters.month = filterM.value;
    if (filterS) state.filters.search = filterS.value.trim().toLowerCase();
    
    render();
  };

  if (filterP) filterP.addEventListener('change', applyFilters);
  if (filterT) filterT.addEventListener('change', applyFilters);
  if (filterM) filterM.addEventListener('change', applyFilters);
  if (filterS) filterS.addEventListener('input', applyFilters);

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (filterP) filterP.value = 'all';
      if (filterT) filterT.value = 'all';
      if (filterM) filterM.value = '';
      if (filterS) filterS.value = '';

      state.filters = {
        profile: 'all',
        type: 'all',
        month: '',
        search: ''
      };
      
      showToast('Filters cleared', 'info');
      render();
    });
  }
}

// --- Data Filtering and Processing for Rendering ---
function getFilteredTransactions() {
  return state.transactions.filter(t => {
    // 1. Profile filter
    if (state.filters.profile !== 'all' && t.profile !== state.filters.profile) {
      return false;
    }
    // 2. Type filter
    if (state.filters.type !== 'all' && t.type !== state.filters.type) {
      return false;
    }
    // 3. Month filter (date is YYYY-MM-DD, filter is YYYY-MM)
    if (state.filters.month && !t.date.startsWith(state.filters.month)) {
      return false;
    }
    // 4. Search Filter (matches description or counterparty)
    if (state.filters.search) {
      const matchDesc = t.description && t.description.toLowerCase().includes(state.filters.search);
      const matchCounterparty = t.counterparty && t.counterparty.toLowerCase().includes(state.filters.search);
      const matchCat = t.category && t.category.toLowerCase().includes(state.filters.search);
      if (!matchDesc && !matchCounterparty && !matchCat) {
        return false;
      }
    }
    return true;
  });
}

// --- Currency Formatting Utility ---
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
}

// Format Type Column visually with HTML & badge styling
function getTypeHTML(type) {
  let badgeColor = '';
  let icon = 'info';
  let label = type;

  switch(type) {
    case 'income':
      badgeColor = 'text-success';
      icon = 'trending-up';
      label = 'Income';
      break;
    case 'expense':
      badgeColor = 'text-danger';
      icon = 'trending-down';
      label = 'Expense';
      break;
    case 'purchase':
      badgeColor = 'text-danger';
      icon = 'shopping-bag';
      label = 'Purchase';
      break;
    case 'lend':
      badgeColor = 'text-info';
      icon = 'arrow-up-right';
      label = 'Lended';
      break;
    case 'borrow':
      badgeColor = 'text-warning';
      icon = 'arrow-down-left';
      label = 'Borrowed';
      break;
    case 'donation':
      badgeColor = 'text-purple';
      icon = 'heart';
      label = 'Donation';
      break;
  }

  return `<span class="table-type ${badgeColor}"><i data-lucide="${icon}"></i>${label}</span>`;
}

// --- Dynamic Render Engine ---
function render() {
  // Sync active profile indicators
  const pNameEl = document.getElementById('active-profile-name');
  if (pNameEl && pNameEl.textContent !== state.currentProfile) {
    populateProfileSelectors();
  }

  // Update Header current date text based on filters or actual month
  const headerDateEl = document.getElementById('current-date-display');
  if (headerDateEl) {
    if (state.filters.month) {
      const [y, m] = state.filters.month.split('-');
      const d = new Date(y, parseInt(m) - 1, 1);
      headerDateEl.textContent = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else {
      headerDateEl.textContent = 'All Transactions';
    }
  }

  // 1. Render content depending on activeTab
  if (state.activeTab === 'dashboard') {
    renderDashboardTab();
  } else if (state.activeTab === 'transactions') {
    renderTransactionsTab();
  } else if (state.activeTab === 'loans') {
    renderLoansTab();
  } else if (state.activeTab === 'analytics') {
    renderAnalyticsTab();
  } else if (state.activeTab === 'settings') {
    renderProfileSettingsList();
  }

  // Run lucide script to replace icon nodes
  lucide.createIcons();
}

// --- Dashboard Tab Render ---
function renderDashboardTab() {
  const profileTxs = state.transactions.filter(t => t.profile === state.currentProfile);
  
  // Calculate Monthly numbers (based on current active month)
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  // Filter transactions for current profile + current month
  const monthlyTxs = profileTxs.filter(t => t.date.startsWith(currentMonthStr));
  
  let incomeVal = 0;
  let expenseVal = 0;
  let donationVal = 0;
  
  monthlyTxs.forEach(t => {
    if (t.type === 'income') incomeVal += t.amount;
    else if (t.type === 'expense' || t.type === 'purchase') expenseVal += t.amount;
    else if (t.type === 'donation') donationVal += t.amount;
  });

  // Calculate Cumulative balance and lend/borrow numbers for the entire history of the profile
  let totalLended = 0;
  let totalBorrowed = 0;
  let cumulativeIncome = 0;
  let cumulativeExpense = 0;
  let cumulativeDonations = 0;

  profileTxs.forEach(t => {
    if (t.type === 'income') cumulativeIncome += t.amount;
    else if (t.type === 'expense' || t.type === 'purchase') cumulativeExpense += t.amount;
    else if (t.type === 'lend') totalLended += t.amount;
    else if (t.type === 'borrow') totalBorrowed += t.amount;
    else if (t.type === 'donation') cumulativeDonations += t.amount;
  });

  // Settle calculations: Lend increases what people owe you. Borrow increases what you owe others.
  // We need to deduct settlements.
  // Net balance represents Cash Available = Cash In (Income + Borrowed) - Cash Out (Expense + Lended + Donated)
  const balanceVal = (cumulativeIncome + totalBorrowed) - (cumulativeExpense + totalLended + cumulativeDonations);
  const netLoansVal = totalLended - totalBorrowed;

  // Set values in elements
  document.getElementById('kpi-balance').textContent = formatCurrency(balanceVal);
  
  const balanceSubEl = document.getElementById('kpi-balance-sub');
  if (balanceSubEl) {
    balanceSubEl.textContent = `All-time Net Worth (Profile: ${state.currentProfile})`;
  }

  const kpiInc = document.getElementById('kpi-income');
  kpiInc.textContent = formatCurrency(incomeVal);
  document.getElementById('kpi-income-sub').textContent = `${monthlyTxs.filter(t => t.type === 'income').length} items this month`;

  const kpiExp = document.getElementById('kpi-expense');
  kpiExp.textContent = formatCurrency(expenseVal);
  document.getElementById('kpi-expense-sub').textContent = `${monthlyTxs.filter(t => t.type === 'expense' || t.type === 'purchase').length} items this month`;

  const kpiLoans = document.getElementById('kpi-loans');
  kpiLoans.textContent = (netLoansVal >= 0 ? '+' : '') + formatCurrency(netLoansVal);
  kpiLoans.className = `kpi-value ${netLoansVal >= 0 ? 'text-success' : 'text-danger'}`;
  document.getElementById('kpi-loans-sub').textContent = `Lent: ${formatCurrency(totalLended)} | Borrowed: ${formatCurrency(totalBorrowed)}`;

  document.getElementById('kpi-donations').textContent = formatCurrency(donationVal);
  document.getElementById('kpi-donations-sub').textContent = `${monthlyTxs.filter(t => t.type === 'donation').length} donations this month`;

  // Render recent 5 transactions table
  const recentTbody = document.getElementById('recent-transactions-tbody');
  if (recentTbody) {
    const sortedTxs = [...profileTxs].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 5);
    
    if (sortedTxs.length === 0) {
      recentTbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 30px 10px;">No transactions recorded for this profile. Click "Add Transaction" to start.</td></tr>`;
    } else {
      recentTbody.innerHTML = sortedTxs.map(t => {
        const amtColor = (t.type === 'income' || t.type === 'borrow') ? 'text-success' : 'text-danger';
        const prefix = (t.type === 'income' || t.type === 'borrow') ? '+' : '-';
        return `
          <tr>
            <td>${t.date}</td>
            <td><span class="badge" style="background: rgba(99,102,241,0.08);">${t.profile}</span></td>
            <td>${getTypeHTML(t.type)}</td>
            <td><span class="table-category">${t.category}</span></td>
            <td>
              <div style="font-weight: 500;">${t.counterparty}</div>
              <div class="text-secondary font-small">${t.description || ''}</div>
            </td>
            <td class="text-right ${amtColor} font-medium">${prefix}${formatCurrency(t.amount)}</td>
            <td class="text-center">
              <div style="display:flex; justify-content:center; gap: 4px;">
                <button onclick="editTransaction('${t.id}')" class="icon-btn-small" title="Edit"><i data-lucide="edit-3"></i></button>
                <button onclick="deleteTransaction('${t.id}')" class="icon-btn-small text-danger" title="Delete"><i data-lucide="trash-2"></i></button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  // Draw Charts
  renderCharts();
}

// --- Transactions Tab Render ---
function renderTransactionsTab() {
  const tbody = document.getElementById('full-transactions-tbody');
  if (!tbody) return;

  const filtered = getFilteredTransactions();
  // Sort descending by date
  filtered.sort((a,b) => b.date.localeCompare(a.date));

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 40px 10px;">No matching transactions found. Try expanding your filter criteria.</td></tr>`;
  } else {
    tbody.innerHTML = filtered.map(t => {
      const amtColor = (t.type === 'income' || t.type === 'borrow') ? 'text-success' : 'text-danger';
      const prefix = (t.type === 'income' || t.type === 'borrow') ? '+' : '-';
      return `
        <tr>
          <td>${t.date}</td>
          <td><span class="badge" style="background: rgba(99,102,241,0.08);">${t.profile}</span></td>
          <td>${getTypeHTML(t.type)}</td>
          <td><span class="table-category">${t.category}</span></td>
          <td>
            <div style="font-weight: 500;">${t.counterparty}</div>
            <div class="text-secondary font-small">${t.description || ''}</div>
          </td>
          <td class="text-right ${amtColor} font-medium">${prefix}${formatCurrency(t.amount)}</td>
          <td class="text-center">
            <div style="display:flex; justify-content:center; gap: 4px;">
              <button onclick="editTransaction('${t.id}')" class="icon-btn-small" title="Edit"><i data-lucide="edit-3"></i></button>
              <button onclick="deleteTransaction('${t.id}')" class="icon-btn-small text-danger" title="Delete"><i data-lucide="trash-2"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
}

// --- Lend & Borrow Tab Render ---
function renderLoansTab() {
  const recTbody = document.getElementById('receivables-tbody');
  const payTbody = document.getElementById('payables-tbody');
  
  if (!recTbody || !payTbody) return;

  // Group transactions by counterparty (name) and profile
  // Note: a single person might have both lend and borrow records
  // We sum them up: Balance = Sum(Lend) - Sum(Borrow)
  // If Balance > 0: John owes you (Receivable)
  // If Balance < 0: You owe John (Payable)
  const balances = {};

  state.transactions.forEach(t => {
    if (t.type !== 'lend' && t.type !== 'borrow') return;
    
    // Normalize key by counterparty name and profile
    const key = `${t.counterparty.trim()}||${t.profile}`;
    if (!balances[key]) {
      balances[key] = {
        name: t.counterparty.trim(),
        profile: t.profile,
        lended: 0,
        borrowed: 0
      };
    }

    if (t.type === 'lend') {
      balances[key].lended += t.amount;
    } else {
      balances[key].borrowed += t.amount;
    }
  });

  const receivablesList = [];
  const payablesList = [];
  
  let totalRecVal = 0;
  let totalPayVal = 0;

  Object.values(balances).forEach(b => {
    const net = b.lended - b.borrowed;
    if (net > 0.01) {
      receivablesList.push({ ...b, net });
      totalRecVal += net;
    } else if (net < -0.01) {
      payablesList.push({ ...b, net: Math.abs(net) });
      totalPayVal += Math.abs(net);
    }
  });

  // Render Receivable cards totals
  document.getElementById('loan-receivables-total').textContent = formatCurrency(totalRecVal);
  document.getElementById('loan-payables-total').textContent = formatCurrency(totalPayVal);

  // Render Receivables Table
  if (receivablesList.length === 0) {
    recTbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted" style="padding: 24px;">Nobody owes you anything right now!</td></tr>`;
  } else {
    recTbody.innerHTML = receivablesList.map(item => `
      <tr>
        <td style="font-weight:600;">${item.name}</td>
        <td><span class="badge" style="background: rgba(99,102,241,0.08);">${item.profile}</span></td>
        <td class="text-right text-success font-medium">${formatCurrency(item.net)}</td>
        <td class="text-center">
          <button class="loan-settle-btn" onclick="settleLoanAccount('${item.name}', '${item.profile}', 'receivable', ${item.net})">
            Settle
          </button>
        </td>
      </tr>
    `).join('');
  }

  // Render Payables Table
  if (payablesList.length === 0) {
    payTbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted" style="padding: 24px;">You don't owe anyone anything right now!</td></tr>`;
  } else {
    payTbody.innerHTML = payablesList.map(item => `
      <tr>
        <td style="font-weight:600;">${item.name}</td>
        <td><span class="badge" style="background: rgba(99,102,241,0.08);">${item.profile}</span></td>
        <td class="text-right text-danger font-medium">${formatCurrency(item.net)}</td>
        <td class="text-center">
          <button class="loan-settle-btn" onclick="settleLoanAccount('${item.name}', '${item.profile}', 'payable', ${item.net})">
            Settle
          </button>
        </td>
      </tr>
    `).join('');
  }
}

// Settle loan handler
window.settleLoanAccount = function(name, profile, type, amount) {
  const actionText = type === 'receivable' 
    ? `Did ${name} pay you back the outstanding balance of ${formatCurrency(amount)}?` 
    : `Did you pay back the outstanding balance of ${formatCurrency(amount)} to ${name}?`;

  if (confirm(actionText + "\n\nThis will record a balancing transaction to bring the debt to zero.")) {
    const nowStr = new Date().toISOString().split('T')[0];
    
    // Settle receivable means we receive income to offset the lended amount
    // Settle payable means we record an expense to offset the borrowed amount
    const settlementTx = {
      id: generateId(),
      date: nowStr,
      profile: profile,
      type: type === 'receivable' ? 'income' : 'expense',
      category: type === 'receivable' ? 'Refunds' : 'Miscellaneous',
      amount: amount,
      counterparty: name,
      description: `Settled outstanding loan account (${type === 'receivable' ? 'payment received' : 'debt paid'})`
    };

    state.transactions.unshift(settlementTx);
    saveToLocalStorage();
    showToast(`Settled account with ${name}! Recorded balancing transaction.`, 'success');
    render();
  }
};

// --- Analytics Tab Render ---
function renderAnalyticsTab() {
  // Populate Year filter options from transaction years
  const yearSelect = document.getElementById('analytics-year-filter');
  if (yearSelect) {
    const years = [...new Set(state.transactions.map(t => t.date.substring(0, 4)))];
    const currentYear = new Date().getFullYear().toString();
    if (!years.includes(currentYear)) years.push(currentYear);
    years.sort((a,b) => b.localeCompare(a));
    
    // Save selected value before rewriting
    const selected = yearSelect.value || currentYear;
    yearSelect.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
    yearSelect.value = selected;
    
    // Attach change event once
    if (!yearSelect.dataset.listenerAttached) {
      yearSelect.addEventListener('change', () => {
        renderAnalyticsTab();
      });
      yearSelect.dataset.listenerAttached = 'true';
    }
  }

  // Draw Charts
  renderCharts();

  // Populate Insights
  renderFinancialInsights();
}

// Generate Insights sentences dynamically
function renderFinancialInsights() {
  const container = document.getElementById('analytics-insights-container');
  if (!container) return;

  const profileTxs = state.transactions.filter(t => t.profile === state.currentProfile);
  
  if (profileTxs.length === 0) {
    container.innerHTML = `<p class="text-center text-muted" style="padding: 20px;">No insights available. Add transactions first.</p>`;
    return;
  }

  const insights = [];

  // 1. Calculate Largest Expense Category
  const expenseCats = {};
  let totalExpenses = 0;
  let totalIncome = 0;
  let totalDonations = 0;

  profileTxs.forEach(t => {
    if (t.type === 'expense' || t.type === 'purchase') {
      expenseCats[t.category] = (expenseCats[t.category] || 0) + t.amount;
      totalExpenses += t.amount;
    } else if (t.type === 'income') {
      totalIncome += t.amount;
    } else if (t.type === 'donation') {
      totalDonations += t.amount;
    }
  });

  const sortedCats = Object.entries(expenseCats).sort((a,b) => b[1] - a[1]);
  if (sortedCats.length > 0) {
    const [topCat, topAmt] = sortedCats[0];
    insights.push({
      icon: 'trending-down',
      title: 'Top Expense Category',
      desc: `Your highest spending is on <strong>${topCat}</strong>, totaling <strong>${formatCurrency(topAmt)}</strong> (${((topAmt/totalExpenses)*100).toFixed(0)}% of total spends).`
    });
  }

  // 2. Donation ratio
  if (totalIncome > 0 && totalDonations > 0) {
    const donationRatio = (totalDonations / totalIncome) * 100;
    insights.push({
      icon: 'heart',
      title: 'Donation Impact',
      desc: `You have donated <strong>${formatCurrency(totalDonations)}</strong>. This represents <strong>${donationRatio.toFixed(1)}%</strong> of your total recorded income.`
    });
  }

  // 3. Profit Margin / Savings Rate
  if (totalIncome > 0) {
    const netSavings = totalIncome - totalExpenses - totalDonations;
    const savingsRate = (netSavings / totalIncome) * 100;
    
    if (savingsRate > 0) {
      insights.push({
        icon: 'percent',
        title: 'Savings Rate',
        desc: `You saved <strong>${formatCurrency(netSavings)}</strong> which is a healthy <strong>${savingsRate.toFixed(0)}%</strong> of your income.`
      });
    } else {
      insights.push({
        icon: 'alert-circle',
        title: 'Savings Warning',
        desc: `Your expenses and donations (<strong>${formatCurrency(totalExpenses + totalDonations)}</strong>) exceed your income (<strong>${formatCurrency(totalIncome)}</strong>) by <strong>${formatCurrency(Math.abs(netSavings))}</strong>.`
      });
    }
  }

  // 4. Lend Outstanding Debtor
  const lendBalances = {};
  profileTxs.forEach(t => {
    if (t.type !== 'lend' && t.type !== 'borrow') return;
    const name = t.counterparty.trim();
    if (!lendBalances[name]) lendBalances[name] = 0;
    lendBalances[name] += (t.type === 'lend' ? t.amount : -t.amount);
  });

  const sortedDebtors = Object.entries(lendBalances).filter(e => e[1] > 0.01).sort((a,b) => b[1] - a[1]);
  if (sortedDebtors.length > 0) {
    const [debtorName, debtorAmt] = sortedDebtors[0];
    insights.push({
      icon: 'user-check',
      title: 'Largest Debtor',
      desc: `<strong>${debtorName}</strong> has the largest outstanding receivable of <strong>${formatCurrency(debtorAmt)}</strong>.`
    });
  }

  if (insights.length === 0) {
    container.innerHTML = `<p class="text-center text-muted" style="padding: 20px;">Insights will generate once you log multiple types of transactions.</p>`;
  } else {
    container.innerHTML = insights.map(item => `
      <div class="stat-item">
        <div class="stat-icon"><i data-lucide="${item.icon}"></i></div>
        <div class="stat-details">
          <span class="stat-title">${item.title}</span>
          <span class="stat-desc">${item.desc}</span>
        </div>
      </div>
    `).join('');
    lucide.createIcons();
  }
}

// --- Chart JS Implementation ---
function renderCharts() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  
  // Theme styling overrides for charts
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(100, 116, 139, 0.08)';

  // Helper: Aggregate monthly cashflow values for a profile
  // returns { labels: ['Jan', 'Feb', ...], income: [100, ...], expenses: [80, ...] }
  const getCashflowData = (year, profileOnly = true) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const incomeArr = new Array(12).fill(0);
    const expenseArr = new Array(12).fill(0);

    const txsToCount = profileOnly 
      ? state.transactions.filter(t => t.profile === state.currentProfile)
      : state.transactions;

    txsToCount.forEach(t => {
      const tYear = t.date.substring(0, 4);
      if (tYear !== year) return;

      const tMonth = parseInt(t.date.substring(5, 7)) - 1;
      if (tMonth >= 0 && tMonth < 12) {
        if (t.type === 'income') {
          incomeArr[tMonth] += t.amount;
        } else if (t.type === 'expense' || t.type === 'purchase' || t.type === 'donation') {
          // Both purchases and donations are outgoing cashflow
          expenseArr[tMonth] += t.amount;
        }
      }
    });

    return { labels: months, income: incomeArr, expenses: expenseArr };
  };

  // Helper: Aggregate Category spends for a month + profile
  const getCategorySpendData = (monthStr, profileOnly = true) => {
    const cats = {};
    const txsToCount = profileOnly 
      ? state.transactions.filter(t => t.profile === state.currentProfile)
      : state.transactions;

    txsToCount.forEach(t => {
      // If monthStr is defined, filter for that month
      if (monthStr && !t.date.startsWith(monthStr)) return;
      
      // We only count outgoing money (expenses, purchases, donations)
      if (t.type === 'expense' || t.type === 'purchase' || t.type === 'donation') {
        cats[t.category] = (cats[t.category] || 0) + t.amount;
      }
    });

    return {
      labels: Object.keys(cats),
      data: Object.values(cats)
    };
  };

  const currentYear = (state.filters.month ? state.filters.month.substring(0, 4) : new Date().getFullYear()).toString();
  const activeMonth = state.filters.month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  // 1. Dashboard Tab - Trend Chart
  const dbTrendCanvas = document.getElementById('dashboard-trend-chart');
  if (dbTrendCanvas && state.activeTab === 'dashboard') {
    const data = getCashflowData(currentYear, true);
    
    if (charts.dbTrend) charts.dbTrend.destroy();
    
    charts.dbTrend = new Chart(dbTrendCanvas, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Income',
            data: data.income,
            backgroundColor: '#10b981',
            borderRadius: 6
          },
          {
            label: 'Expenses',
            data: data.expenses,
            backgroundColor: '#f87171',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: textColor, font: { family: 'Inter' } } }
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor } },
          y: { grid: { color: gridColor }, ticks: { color: textColor } }
        }
      }
    });
  }

  // 2. Dashboard Tab - Category Distribution Doughnut Chart
  const dbCatCanvas = document.getElementById('dashboard-category-chart');
  if (dbCatCanvas && state.activeTab === 'dashboard') {
    const data = getCategorySpendData(activeMonth, true);
    
    if (charts.dbCategory) charts.dbCategory.destroy();

    if (data.data.length === 0) {
      // Draw placeholder or empty message
      charts.dbCategory = new Chart(dbCatCanvas, {
        type: 'doughnut',
        data: {
          labels: ['No Data'],
          datasets: [{ data: [1], backgroundColor: [isDark ? '#1e293b' : '#e2e8f0'] }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: textColor } },
            tooltip: { callbacks: { label: () => 'No spends this month' } }
          }
        }
      });
    } else {
      charts.dbCategory = new Chart(dbCatCanvas, {
        type: 'doughnut',
        data: {
          labels: data.labels,
          datasets: [{
            data: data.data,
            backgroundColor: ['#6366f1', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#0ea5e9', '#ec4899', '#14b8a6', '#64748b']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: { color: textColor, font: { family: 'Inter', size: 11 } }
            }
          }
        }
      });
    }
  }

  // 3. Analytics Tab - Monthly Cashflow Line/Bar Chart (Full year overview)
  const analMonthlyCanvas = document.getElementById('analytics-monthly-chart');
  if (analMonthlyCanvas && state.activeTab === 'analytics') {
    const yearFilter = document.getElementById('analytics-year-filter');
    const targetYear = yearFilter ? yearFilter.value : currentYear;
    
    const data = getCashflowData(targetYear, true);
    // Net savings line data
    const netArr = data.income.map((inc, i) => inc - data.expenses[i]);

    if (charts.analMonthly) charts.analMonthly.destroy();

    charts.analMonthly = new Chart(analMonthlyCanvas, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Total Earned',
            type: 'bar',
            data: data.income,
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            borderRadius: 6,
            order: 2
          },
          {
            label: 'Total Outgoing',
            type: 'bar',
            data: data.expenses,
            backgroundColor: 'rgba(239, 68, 68, 0.85)',
            borderRadius: 6,
            order: 3
          },
          {
            label: 'Net Cashflow',
            type: 'line',
            data: netArr,
            borderColor: '#6366f1',
            borderWidth: 3,
            fill: false,
            tension: 0.3,
            order: 1,
            pointBackgroundColor: '#6366f1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: textColor } }
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor } },
          y: { grid: { color: gridColor }, ticks: { color: textColor } }
        }
      }
    });
  }

  // 4. Analytics Tab - Spending Category Doughnut Chart (All-time or full-year)
  const analCatCanvas = document.getElementById('analytics-category-chart');
  if (analCatCanvas && state.activeTab === 'analytics') {
    // We aggregate category data for the entire profile history (or selected year)
    const yearFilter = document.getElementById('analytics-year-filter');
    const targetYear = yearFilter ? yearFilter.value : currentYear;
    
    const data = getCategorySpendData(targetYear, true);

    if (charts.analCategory) charts.analCategory.destroy();

    if (data.data.length === 0) {
      charts.analCategory = new Chart(analCatCanvas, {
        type: 'doughnut',
        data: {
          labels: ['No Spends'],
          datasets: [{ data: [1], backgroundColor: [isDark ? '#1e293b' : '#e2e8f0'] }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: textColor } } }
        }
      });
    } else {
      charts.analCategory = new Chart(analCatCanvas, {
        type: 'doughnut',
        data: {
          labels: data.labels,
          datasets: [{
            data: data.data,
            backgroundColor: ['#6366f1', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#0ea5e9', '#ec4899', '#14b8a6', '#64748b']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: textColor, font: { family: 'Inter', size: 11 } }
            }
          }
        }
      });
    }
  }
}

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', () => {
  loadFromLocalStorage();
  populateProfileSelectors();
  setupTabNavigation();
  setupThemeToggler();
  setupProfileActions();
  setupBackupAndUtilities();
  setupTransactionModal();
  setupFilters();
  setupAuth();
  checkAuthStatus();
  
  // Render active tab initially
  render();
});
