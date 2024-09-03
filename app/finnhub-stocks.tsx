"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";

//#region These are the data struct returned by Finnhub API at their search endpoint
interface StockSymbolItem {
  description: string;
  displaySymbol: string;
  symbol: string;
  type: string;
}
interface StockPrice {
  symbol: string;
  price: number;
}
interface SymbolLookup {
  count: number;
  result: StockSymbolItem[];
}
//#endregion

export default function FinnhubStocks() {
  const [searchText, setSearchText] = useState("");

  const [symbolLookupData, setSymbolLookupData] = useState<SymbolLookup>({
    count: 0,
    result: [],
  });
  const [stockPrices, setStockPrices] = useState<StockPrice[]>([]);
  const [selectedStockSymbol, setSelectedStockSymbol] =
    useState<StockSymbolItem>();

  // #region  Finnhub - related functions

  // NOTE: This is for throttling the fetching of data from the Finnhub API.
  // We want this since the free account only allows 20 API calls per second.
  // `useRef`s are used because we don't want to react to their changes, leading to an infinite loop otherwise
  const lastLookupCall = useRef(Date.now());
  const lastLookupQuery = useRef("");
  const API_CALL_WAIT_TIME = 300;
  const socket = useRef<WebSocket>();
  const symbolLookupFetch = useCallback((query: string) => {
    fetch(
      `https://finnhub.io/api/v1/search?q=${query}&exchange=US&token=${process.env.NEXT_PUBLIC_FINNHUB_KEY}`,
    )
      .then((res) => res.json())
      .then((data) => {
        setSymbolLookupData(data);
      });
    lastLookupCall.current = Date.now();
  }, []);
  const symbolLookupThrottled = useCallback(
    (query: string) => {
      // NOTE: only for consistent
      const now = Date.now();

      // NOTE: this conditional does the following (with some info left out, for conciseness):
      // if time between this call and previous call is far enough,
      //    just execute the fetch;
      // else,
      //    store that search text, and;
      //    if no other calls are made, calculated via another comparison,
      //      run a fetch with the stored search text
      //
      if (query && now - lastLookupCall.current > API_CALL_WAIT_TIME) {
        symbolLookupFetch(query);
      } else {
        lastLookupQuery.current = query;
        setTimeout(
          () => {
            if (
              query &&
              // NOTE: This is that 'another comparison' referred above
              Date.now() - lastLookupCall.current >= API_CALL_WAIT_TIME
            ) {
              lastLookupCall.current = Date.now();
              symbolLookupFetch(lastLookupQuery.current);
            }
          },
          API_CALL_WAIT_TIME - (now - lastLookupCall.current),
        );
      }
    },
    [symbolLookupFetch],
  );
  // #endregion

  useEffect(() => {
    symbolLookupThrottled(searchText);
  }, [searchText, symbolLookupThrottled]);

  useEffect(() => {
    if (selectedStockSymbol) {
      if (selectedStockSymbol.displaySymbol) {
        socket.current?.send(
          JSON.stringify({
            type: "subscribe",
            symbol: selectedStockSymbol.displaySymbol,
          }),
        );
      }
    }
  }, [selectedStockSymbol]);

  //#region NOTE: For unreactive reference to that state
  const stockPricesRef = useRef<StockPrice[]>();
  useEffect(() => {
    stockPricesRef.current = stockPrices;
  }, [stockPrices]);
  //#endregion
  useEffect(() => {
    if (!socket.current) {
      socket.current = new WebSocket(
        `wss://ws.finnhub.io?token=${process.env.NEXT_PUBLIC_FINNHUB_KEY}`,
      );
      socket.current.addEventListener("message", (event) => {
        const jsonRes = JSON.parse(event.data);

        // NOTE: Undefined checks
        if (!jsonRes.data) return;
        const jsonResData = jsonRes.data;
        // NOTE: The data sent by the API comes as an array.
        // The last one seems to have the latest data. This parses that.
        const price = jsonResData[jsonResData.length - 1].p || undefined;

        if (price)
          setStockPrices([
            ...(stockPricesRef.current || []),
            {
              symbol: "",
              price: price,
            },
          ]);
      });
    }
  }, []);

  // START handlers for the search text input element
  function handleSearchTextChange(e: ChangeEvent<HTMLInputElement>) {
    setSearchText(e.target.value);
  }
  // END

  return (
    <>
      <div className="flex w-full flex-wrap place-items-center justify-center gap-4 py-10">
        <div className="relative">
          <input
            value={searchText}
            onChange={handleSearchTextChange}
            placeholder="Enter stock symbol or name"
            className="peer/input justify-center rounded-xl border border-b border-gray-300 bg-gray-200 bg-gradient-to-b from-zinc-200 p-4 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-900 dark:from-inherit"
          ></input>
          <div className="top-100 absolute z-10 mt-2 hidden w-full flex-col rounded border border-neutral-400 bg-zinc-900 p-2.5 hover:flex peer-focus/input:flex">
            {(() => {
              if (symbolLookupData.count < 1 || !searchText)
                return (
                  <div className="text-center text-neutral-400">
                    Possible matches will show here
                  </div>
                );

              let results = symbolLookupData.result.slice(0, 4);
              return results.map((symbol) => (
                <div key={symbol.description}>
                  <button
                    onClick={() => {
                      console.log("Option clicked...", symbol);
                      setSelectedStockSymbol(symbol);
                    }}
                    className=""
                  >
                    <span className="me-3 font-bold">
                      {symbol.displaySymbol}
                    </span>
                    {symbol.description}
                  </button>
                  <hr className="py-1" />
                </div>
              ));
            })()}
          </div>
        </div>
        <button
          className="focus:shadow-outline min-w-fit rounded bg-white px-4 py-2 font-bold text-black hover:bg-neutral-300 focus:outline-none"
          type="button"
        >
          Search
        </button>
      </div>

      <div className="relative flex w-full flex-grow flex-col gap-2 overflow-scroll px-4 before:fixed before:bottom-0 before:h-1/4 before:w-full before:bg-gradient-to-t before:from-white before:via-white before:dark:from-black before:dark:via-black">
        {(() => {
          return stockPrices.map((stockPrice, i) => (
            <div
              key={i}
              className="flex w-full items-center justify-center rounded border border-neutral-400 bg-neutral-800/40 p-2"
            >
              <span>Time</span>
              <span className="mx-2">|</span>
              <span></span>
              {Number(stockPrice.price).toLocaleString("en", {
                style: "currency",
                currency: "USD",
              })}
            </div>
          ));
        })()}
      </div>
    </>
  );
}
