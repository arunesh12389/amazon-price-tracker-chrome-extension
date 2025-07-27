import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const PriceHistory = () => {
  const [priceHistory, setPriceHistory] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchHistoryAndPrediction = async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0].url) throw new Error('No URL found');

        const response = await fetch(
          `http://localhost:8000/api/history-prediction?url=${encodeURIComponent(tabs[0].url)}`
        );
        if (!response.ok) throw new Error('Failed to fetch price history and prediction');

        const data = await response.json();
        setPriceHistory(data.history || []);
        setPrediction(data.prediction || null);

        if (data.history && data.history.length > 0) {
          const prices = data.history.map((point) => point.price);
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
          setStats({ minPrice, maxPrice, avgPrice });
        }

        setError(null);
      } catch (err) {
        setError('Error fetching price history. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistoryAndPrediction();
  }, []);

  if (loading) {
    return (
      <Card sx={{ minWidth: 275, boxShadow: 3, borderRadius: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        sx={{
          borderRadius: 2,
          boxShadow: 2,
          '& .MuiAlert-icon': { fontSize: '1.5rem' },
        }}
      >
        {error}
      </Alert>
    );
  }

  if (!priceHistory.length) {
    return (
      <Alert
        severity="info"
        sx={{
          borderRadius: 2,
          boxShadow: 2,
          '& .MuiAlert-icon': { fontSize: '1.5rem' },
        }}
      >
        No price history available yet
      </Alert>
    );
  }

  // Show collecting message if not enough history for prediction
  const notEnoughForPrediction = priceHistory.length > 0 && (!prediction || !prediction.dates || prediction.dates.length === 0);

  const chartLabels = priceHistory.map((point) =>
    new Date(point.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  );

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Price History',
        data: priceHistory.map((point) => point.price),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  // Add prediction to chart if available
  if (prediction && prediction.dates && prediction.prices) {
    chartData.labels = [
      ...chartLabels,
      ...prediction.dates.filter((d) => !chartLabels.includes(d)),
    ];
    chartData.datasets.push({
      label: 'Prediction',
      data: [
        ...Array(priceHistory.length).fill(null),
        ...prediction.prices,
      ],
      borderColor: 'rgb(255, 99, 132)',
      backgroundColor: 'rgba(255, 99, 132, 0.3)',
      borderDash: [8, 4],
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 5,
    });
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 10,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
        },
        bodyFont: {
          size: 13,
        },
        callbacks: {
          label: (context) => `Price: $${context.parsed.y.toFixed(2)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: (value) => `$${value.toFixed(2)}`,
        },
      },
    },
  };

  return (
    <Card
      sx={{
        minWidth: 275,
        boxShadow: 3,
        borderRadius: 2,
        '&:hover': { boxShadow: 6 },
        transition: 'box-shadow 0.3s ease-in-out',
      }}
    >
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Price History {prediction && prediction.recommendation && (
            <span style={{ fontWeight: 400, fontSize: 14, color: prediction.recommendation === 'buy' ? 'green' : 'orange', marginLeft: 8 }}>
              ({prediction.recommendation === 'buy' ? 'Buy' : 'Wait'} suggested)
            </span>
          )}
        </Typography>

        {notEnoughForPrediction && (
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2, boxShadow: 2 }}>
            Collecting price data, please check back later for predictions.
          </Alert>
        )}

        {stats && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Lowest: ${stats.minPrice.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Average: ${stats.avgPrice.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Highest: ${stats.maxPrice.toFixed(2)}
              </Typography>
            </Box>
            <Divider />
          </Box>
        )}

        <Box sx={{ height: 300, mt: 2 }}>
          <Line data={chartData} options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                labels: {
                  boxWidth: 10,
                  usePointStyle: true,
                },
              },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                titleFont: { size: 14 },
                bodyFont: { size: 13 },
                callbacks: {
                  label: (context) => `Price: $${context.parsed.y?.toFixed(2)}`,
                },
              },
            },
            scales: {
              y: {
                beginAtZero: false,
                ticks: {
                  callback: (value) => `$${value.toFixed(2)}`,
                },
              },
            },
          }} />
        </Box>

        {prediction && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <b>Prediction:</b> {prediction.recommendation ? (prediction.recommendation === 'buy' ? 'Buy' : 'Wait') : 'N/A'}
              {typeof prediction.confidence === 'number' && (
                <> (Confidence: {(prediction.confidence * 100).toFixed(1)}%)</>
              )}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default PriceHistory;
