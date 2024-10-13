(function() {
    document.addEventListener('click', (event) => {
      if (event.target.tagName === 'A' && !event.target.href.startsWith('https://x.com')) {
        event.preventDefault();
        window.electron.openExternal(event.target.href);
      }
    }, true);
  })();