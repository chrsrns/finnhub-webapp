# Finnhub Stocks API Web App

This project is a simple web application that accesses the Finnhub API to search and query the latest stock prices. It accesses their WebSocket endpoint, making sure that the latest stock prices automatically gets sent to the client and rendered. Several optimizations are done, like throttling of API requests to prevent reaching the max API calls.

This is deployed in Vercel, as it was a requirement when I submitted this for a technical interview.

> This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started on Development

> IMPORTANT: You must have a Finnhub API key. You can get one for free after registering an account to Finnhub.

First, clone the repo and `cd` to the new directory.

```bash
git clone https://github.com/chrsrns/finnhub-webapp.git
cd finnhub-webapp
```

Then, you must create a `.env` file, and inside, input the following lines, replacing "XXX" with your own token.

```
NEXT_PUBLIC_FINNHUB_KEY=XXX
```

Then, run the development server:

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deploying on Production

The easiest way to deploy this Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
