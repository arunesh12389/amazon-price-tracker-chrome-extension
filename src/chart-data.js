// Sample price history data for testing
const samplePriceData = {
  dates: [
    '2023-01-01',
    '2023-02-01',
    '2023-03-01',
    '2023-04-01',
    '2023-05-01',
    '2023-06-01',
    '2023-07-01'
  ],
  prices: [45000, 43500, 44200, 42800, 41500, 42000, 40500],
  recommendation: 'Wait for price to drop further',
  confidence: 0.85
};

// Export the sample data
if (typeof module !== 'undefined') {
  module.exports = { samplePriceData };
}