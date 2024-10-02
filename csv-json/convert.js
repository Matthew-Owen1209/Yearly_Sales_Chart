const fs = require('fs');
const csv = require('csv-parser');

// Path to your input CSV file
const csvFilePath = '../item_history - 2024-10-01T092647.408.csv';
// Output JSON file path
const outputJsonPath = '../output.json';

// Initialize an array to store CSV data
const results = [];

// Read the CSV file
fs.createReadStream(csvFilePath)
  .pipe(csv())
  .on('data', (data) => results.push(data))
  .on('end', () => {
    // Write the results to a JSON file
    fs.writeFileSync(outputJsonPath, JSON.stringify(results, null, 2));
    console.log('CSV file successfully converted to JSON!');
  });
