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
  const relatedTab = tabs.find(t => t.tabRenderer?.title === 'Relacionado' || t.tabRenderer?.title === 'Related');
  if (relatedTab) {
      // Need to fetch this tab's endpoint. InnerTube usually defers loading related tab until clicked, via endpoint.
      console.log("Endpoint:", relatedTab.tabRenderer?.endpoint?.browseEndpoint?.browseId);
  }
}
run();
