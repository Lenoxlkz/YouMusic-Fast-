async function run() {
  const response = await fetch('http://localhost:3000/api/innertube', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: 'next',
        body: { videoId: 'fJ9rUzIMcZQ' }
      })
  });
  const data = await response.json();
  const tabs = data?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs;
  if (!tabs) return console.log('no tabs');
  tabs.forEach((tab, i) => {
     console.log(`Tab ${i}:`, tab.tabRenderer?.title);
  });
}
run();
