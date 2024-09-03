import FinnhubStocks from "./finnhub-stocks";

export default function Home() {
  return (
    <main className="flex h-dvh flex-col items-center justify-between px-12 py-24 sm:px-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <div className="fixed left-0 top-0 flex w-full items-end justify-center lg:static lg:size-auto">
          <a
            className="pointer-events-none flex place-items-center gap-2 p-8 text-2xl lg:pointer-events-auto lg:p-0"
            href="https://vercel.com?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Finnhub Stocks API Web App
          </a>
        </div>
      </div>

      <FinnhubStocks />
    </main>
  );
}
