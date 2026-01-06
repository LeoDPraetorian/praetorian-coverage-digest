import { hostSearch } from './host-search.js';

async function main() {
  try {
    const result = await hostSearch.execute({
      query: 'port:443 nginx',
      page: 1
    });

    if (result.matches.length > 0) {
      console.log(JSON.stringify(result.matches[0], null, 2));
    } else {
      console.log('No results found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
