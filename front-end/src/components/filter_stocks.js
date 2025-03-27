const fs = require('fs');

fs.readFile('datas.json', 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading the file:', err);
    return;
  }

  const stocks = JSON.parse(data);

  const filteredStocks = stocks.filter(stock => stock.segment === "BSE_EQ");

  const uniqueStocks = [];
  const namesSet = new Set();

  filteredStocks.forEach(stock => {
    if (!namesSet.has(stock.name)) {
      namesSet.add(stock.name);
      uniqueStocks.push(stock);
    }
  });

  fs.writeFile('filtered_unique_datas.json', JSON.stringify(uniqueStocks, null, 2), (err) => {
    if (err) {
      console.error('Error writing to the file:', err);
      return;
    }
    console.log('Filtered and unique data has been written to filtered_unique_datas.json');
  });
});
