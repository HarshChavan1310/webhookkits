require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const axios = require('axios');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Verify Razorpay webhook signature
const verifyWebhookSignature = (req) => {
  const webhookSecret = process.env.WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];
  
  const shasum = crypto.createHmac('sha256', webhookSecret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest('hex');
  
  return digest === signature;
};

// Create customer on Interakt
const createInteraktCustomer = async (customerData) => {
  try {
    const response = await axios({
      method: 'post',
      url: `https://api.interakt.ai/v1/public/track/users/`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${process.env.INTERAKT_API_KEY}`
      },
      data: {
        userId: customerData.id,
        phoneNumber: customerData.contact,
        countryCode: '+91', // Default to India, modify as needed
        traits: {
          name: customerData.name,
          email: customerData.email
        }
      }
    });
    
    console.log('Customer created on Interakt:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating customer on Interakt:', error.response?.data || error.message);
    throw error;
  }
};

// Add tag to customer on Interakt
const addTagToCustomer = async (customerId, tag) => {
  try {
    // Prepare request data
    const requestData = {
      userId: customerId,
      tag: tag
    };
    
    // Add workspaceId only if it exists in environment variables
    if (process.env.INTERAKT_WORKSPACE_ID) {
      requestData.workspaceId = process.env.INTERAKT_WORKSPACE_ID;
    }
    
    const response = await axios({
      method: 'post',
      url: `https://api.interakt.ai/v1/public/track/users/tags/`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${process.env.INTERAKT_API_KEY}`
      },
      data: requestData
    });
    
    console.log('Tag added to customer:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error adding tag to customer:', error.response?.data || error.message);
    throw error;
  }
};

// Send WhatsApp message via Interakt
const sendWhatsAppMessage = async (customerId, templateName, params = []) => {
  try {
    const response = await axios({
      method: 'post',
      url: `https://api.interakt.ai/v1/public/message/`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${process.env.INTERAKT_API_KEY}`
      },
      data: {
        userId: customerId,
        phoneNumber: '', // Not needed if userId is provided
        countryCode: '', // Not needed if userId is provided
        type: 'Template',
        template: {
          name: templateName,
          languageCode: 'en',
          headerValues: [],
          bodyValues: params
        }
      }
    });
    
    console.log('WhatsApp message sent:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
    throw error;
  }
};

// Razorpay webhook endpoint
app.post('/webhook/razorpay', async (req, res) => {
  try {
    // Verify webhook signature
    const isValidSignature = verifyWebhookSignature(req);
    if (!isValidSignature) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }
    
    const event = req.body.event;
    console.log('Received webhook event:', event);
    
    // Handle payment.authorized event
    if (event === 'payment.authorized') {
      const payment = req.body.payload.payment.entity;
      const order = req.body.payload.payment.entity.order_id;
      
      // Get order details to extract customer information
      const orderDetails = await razorpay.orders.fetch(order);
      
      // Extract customer data
      const customerData = {
        id: payment.id, // Using payment ID as customer ID
        name: payment.notes?.customer_name || 'Customer',
        email: payment.notes?.email || payment.email,
        contact: payment.notes?.contact || payment.contact
      };
      
      // Create customer on Interakt
      await createInteraktCustomer(customerData);
      
      // Add tag to customer
      await addTagToCustomer(customerData.id, 'paid_customer');
      
      // Send WhatsApp message
      const amount = payment.amount / 100; // Convert from paise to rupees
      await sendWhatsAppMessage(
        customerData.id, 
        'payment_success', // Template name - you'll need to create this on Interakt
        [customerData.name, `₹${amount}`, payment.id]
      );
      
      return res.status(200).json({ status: 'success', message: 'Webhook processed successfully' });
    }
    
    // Handle other events if needed
    return res.status(200).json({ status: 'success', message: 'Event received but no action taken' });
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Root route handler
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Razorpay to Interakt Webhook Server is running' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export the Express app for Vercel
module.exports = app;
