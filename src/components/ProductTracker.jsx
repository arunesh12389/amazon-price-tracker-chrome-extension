/* global chrome */
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Box,
  Alert,
  Skeleton,
  CardMedia,
  Divider,
  Snackbar,
} from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

const ProductTracker = () => {
  const [product, setProduct] = useState(null);
  const [threshold, setThreshold] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: 'GET_PRODUCT_INFO' },
          (response) => {
            setProduct(response);
            setLoading(false);
          }
        );
      }
    });
  }, []);

  const handleTrackPrice = async () => {
    if (!product || !threshold) {
      setError('Please set a price threshold');
      return;
    }

    const thresholdPrice = parseFloat(threshold);
    if (thresholdPrice <= 0) {
      setError('Please enter a valid price threshold');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        url: product.url,
        name: product.name,
        price: product.currentPrice,
        threshold: thresholdPrice
      }),
      });

      if (!response.ok) throw new Error('Failed to track price');

      setIsTracking(true);
      setShowSuccess(true);
      setError(null);
    } catch (error) {
      setError('Error tracking price. Please try again.');
    }
  };

  if (loading) {
    return (
      <Card sx={{ minWidth: 275, boxShadow: 3 }}>
        <CardContent>
          <Skeleton variant="text" height={40} />
          <Skeleton variant="text" height={60} />
          <Skeleton variant="rectangular" height={40} />
        </CardContent>
      </Card>
    );
  }

  if (!product) {
    return (
      <Alert
        severity="info"
        sx={{
          borderRadius: 2,
          boxShadow: 2,
          '& .MuiAlert-icon': { fontSize: '1.5rem' },
        }}
      >
        No product info found on this page.
      </Alert>
    );
  }

  return (
    <Card
      sx={{
        minWidth: 275,
        boxShadow: 3,
        transition: 'box-shadow 0.3s',
        '&:hover': { boxShadow: 6 },
      }}
    >
      {product.image && (
        <CardMedia
          component="img"
          height="180"
          image={product.image}
          alt={product.name}
        />
      )}
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <ShoppingCartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          {product.name}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body1" sx={{ mb: 1 }}>
          Current Price: <b>${product.currentPrice}</b>
        </Typography>
        <TextField
          label="Price Threshold"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          type="number"
          InputProps={{ startAdornment: <span>$</span> }}
          sx={{ mb: 2, width: '100%' }}
        />
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<NotificationsActiveIcon />}
            onClick={handleTrackPrice}
            disabled={isTracking}
          >
            {isTracking ? 'Tracking' : 'Track Price'}
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            View
          </Button>
        </Box>
      </CardContent>
      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={() => setShowSuccess(false)}
        message="Product is being tracked!"
      />
    </Card>
  );
};

export default ProductTracker;
