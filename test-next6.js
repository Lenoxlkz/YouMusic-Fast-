import { MusicKit } from 'musicstream-sdk';
const kit = new MusicKit();
async function run() {
  const res = await kit.getRelated('fJ9rUzIMcZQ');
  console.log(JSON.stringify(res, null, 2).slice(0, 1000));
}
run();
