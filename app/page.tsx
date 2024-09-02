export default function Home() {
  return (
    <main className="flex h-dvh flex-col items-center justify-between p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <div className="fixed left-0 top-0 flex w-full items-end justify-center lg:static lg:size-auto">
          <a
            className="pointer-events-none flex place-items-center gap-2 p-8 text-2xl lg:pointer-events-auto lg:p-0"
            href="https://vercel.com?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Finnhub Web App
          </a>
        </div>
      </div>

      <div className="my-10 flex w-full flex-wrap place-items-center justify-center gap-4">
        <input
          placeholder="Enter stock symbol or name"
          className="flex min-w-fit justify-center rounded-xl border border-b border-gray-300 bg-gray-200 bg-gradient-to-b from-zinc-200 p-4 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit"
        ></input>
        <button
          className="focus:shadow-outline min-w-fit rounded bg-white px-4 py-2 font-bold text-black hover:bg-neutral-300 focus:outline-none"
          type="button"
        >
          Search
        </button>
      </div>
    </main>
  );
}
