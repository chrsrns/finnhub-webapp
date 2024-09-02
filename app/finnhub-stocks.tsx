"use client";

export default function FinnhubStocks() {
  return (
    <>
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

      <div className="relative flex w-full flex-grow flex-col gap-2 overflow-scroll px-4 before:fixed before:bottom-0 before:h-1/4 before:w-full before:bg-gradient-to-t before:from-white before:via-white before:dark:from-black before:dark:via-black">
        {(() => {
          let objects = Array.from({ length: 14 });
          return objects.map((object, i) => (
            <div
              key={i}
              className="flex w-full items-center justify-center rounded border border-neutral-400 bg-neutral-800/40 p-2"
            >
              <span>Time</span>
              <span className="mx-2">|</span>
              <span>Price</span>
            </div>
          ));
        })()}
      </div>
    </>
  );
}
