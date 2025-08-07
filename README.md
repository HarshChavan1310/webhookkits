# Razorpay to Interakt Webhook Integration

This project implements a webhook service that connects Razorpay payments with Interakt for WhatsApp messaging. When a customer makes a payment through Razorpay, this service:

1. Creates the customer on Interakt
2. Adds a tag to the customer
3. Sends a WhatsApp message notification

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Razorpay account with API keys
- Interakt account with API keys and WhatsApp templates

### Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your Razorpay and Interakt API keys

### Environment Variables

- `RAZORPAY_KEY_ID`: Your Razorpay Key ID
- `RAZORPAY_KEY_SECRET`: Your Razorpay Key Secret
- `INTERAKT_API_KEY`: Your Interakt API Key
- `INTERAKT_WORKSPACE_ID`: Your Interakt Workspace ID
- `PORT`: Server port (default: 3000)
- `WEBHOOK_SECRET`: Secret for verifying Razorpay webhooks

### Running the Server

```
npm start
```

For development with auto-restart:
```
npm run dev
```

## Webhook Configuration

### Razorpay Webhook Setup

1. Log in to your Razorpay Dashboard
2. Go to Settings > Webhooks
3. Add a new webhook with the following details:
   - URL: `https://your-domain.com/webhook/razorpay`
   - Secret: Same as your `WEBHOOK_SECRET` environment variable
   - Active Events: Select at least `payment.authorized`

### Interakt Template Setup

Create a WhatsApp template on Interakt with the following parameters:
- Template Name: `payment_success`
- Language: English
- Body: Include placeholders for customer name, amount, and payment ID
  Example: "Hello {{1}}, thank you for your payment of {{2}}. Your payment ID is {{3}}."

## Testing

You can use tools like ngrok to expose your local server for testing:

```
ngrok http 3000
```

Then update your Razorpay webhook URL to the ngrok URL.

## API Endpoints

- `POST /webhook/razorpay`: Endpoint for Razorpay webhooks
- `GET /health`: Health check endpoint

## Flow Diagram

```
Customer → Razorpay Payment → Webhook → Our Server → Interakt → WhatsApp Message
```
