async function run() {
  const res = await fetch('http://localhost:3000/api/radio/fJ9rUzIMcZQ');
  const data = await res.json();
  console.log("length:", data.length);
  if (data.length > 0) {
     console.log(data.slice(0, 2).map(t => `${t.title} - ${t.artist}`));
  }
}
run();
