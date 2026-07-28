export let activeMutationRequests = 0;

export const showGlobalLoader = () => {
  if (typeof document === 'undefined') return;
  let loader = document.getElementById('global-api-blocker');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'global-api-blocker';
    Object.assign(loader.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      zIndex: '999999',
      backgroundColor: 'rgba(255, 255, 255, 0.4)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      cursor: 'wait'
    });
    
    // Add an escape hatch click listener just in case it gets permanently stuck
    loader.addEventListener('dblclick', () => {
      activeMutationRequests = 0;
      hideGlobalLoader();
    });
    
    loader.innerHTML = `
      <style>
        @keyframes global-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .global-spinner {
          border: 4px solid rgba(0, 0, 0, 0.1);
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border-left-color: #1976d2;
          animation: global-spin 1s linear infinite;
        }
      </style>
      <div class="global-spinner"></div>
    `;
    document.body.appendChild(loader);
  }
  loader.style.display = 'flex';
};

export const hideGlobalLoader = () => {
  if (typeof document === 'undefined') return;
  const loader = document.getElementById('global-api-blocker');
  if (loader) {
    loader.style.display = 'none';
  }
};

// Fallback to auto-hide if a request hangs indefinitely (30s)
let failsafeTimeout: any;

export const handleRequestStart = (method?: string) => {
  if (method && ['post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
    activeMutationRequests++;
    showGlobalLoader();
    
    clearTimeout(failsafeTimeout);
    failsafeTimeout = setTimeout(() => {
       activeMutationRequests = 0;
       hideGlobalLoader();
    }, 35000); // 35 seconds failsafe
  }
};

export const handleRequestEnd = (method?: string, isError = false) => {
  if (method && ['post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
    activeMutationRequests = Math.max(0, activeMutationRequests - 1);
    if (activeMutationRequests === 0) {
      hideGlobalLoader();
      clearTimeout(failsafeTimeout);
    }
  } else if (!method && isError) {
    // If an error happens and Axios loses the config, force hide
    activeMutationRequests = 0;
    hideGlobalLoader();
    clearTimeout(failsafeTimeout);
  }
};
