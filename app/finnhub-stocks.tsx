"use client";

import { DateTime } from "luxon";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { Show, uuidv4 } from "./utils";

//#region These are the data struct returned by Finnhub API at their search endpoint
interface StockSymbolItem {
  description: string;
  displaySymbol: string;
  symbol: string;
  type: string;
}
interface StockPriceResponse {
  type: "trade" | "ping";
  data: StockPriceResponseData[];
}
interface StockPriceResponseData {
  t: number;
  s: string;
  p: number;
  v: number;
  distinctor: string;
}
interface SymbolLookup {
  count: number;
  result: StockSymbolItem[];
}
//#endregion

export default function FinnhubStocks() {
  const [searchText, setSearchText] = useState("");
  const searchTextRef = useRef("");
  useEffect(() => {
    searchTextRef.current = searchText;
  }, [searchText]);

  const [symbolLookupData, setSymbolLookupData] = useState<SymbolLookup>({
    count: 0,
    result: [],
  });
  const [stockPrices, setStockPrices] = useState<StockPriceResponse[]>([]);
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
    lastLookupCall.current = Date.now();
    let fetchResult = fetch(
      `https://finnhub.io/api/v1/search?q=${query}&exchange=US&token=${process.env.NEXT_PUBLIC_FINNHUB_KEY}`,
    )
      .then((res) => {
        if (res.ok) return res.json();
        else throw new Error("");
      })
      .then((data) => {
        if (query === searchTextRef.current) {
          setSymbolLookupData(data);
          const dataCasted: SymbolLookup = data;
          return dataCasted;
        }
      })
      .catch((_) => {
        console.log("API Error");
      });
    return fetchResult;
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
            const now = Date.now();
            if (
              query &&
              // NOTE: This is that 'another comparison' referred above
              // The `-10` seems to fix an problem where the last query don't get fetched.
              now - lastLookupCall.current >= API_CALL_WAIT_TIME - 10
            ) {
              lastLookupCall.current = now;
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
    if (selectedStockSymbolRef.current)
      socket.current?.send(
        JSON.stringify({
          type: "unsubscribe",
          symbol: selectedStockSymbolRef.current.displaySymbol,
        }),
      );
    if (selectedStockSymbol) {
      if (selectedStockSymbol.displaySymbol) {
        fetch(
          `https://finnhub.io/api/v1/quote?symbol=${selectedStockSymbol.displaySymbol}&token=${process.env.NEXT_PUBLIC_FINNHUB_KEY}`,
        )
          .then((res) => {
            if (res.ok) return res.json();
            else throw new Error("");
          })
          .then((data) => {
            const stockPriceRes: StockPriceResponse = {
              type: "trade",
              data: [
                {
                  t: Date.now(),
                  p: data.c,
                  s: selectedStockSymbol.displaySymbol,
                  v: 0,
                  distinctor: uuidv4(),
                },
              ],
            };
            const resultArr = [
              stockPriceRes,
              ...(stockPricesRef.current || []),
            ];
            setStockPrices(resultArr.slice(0, 8));
          })
          .catch((_) => {
            console.log("API Error");
          });
        socket.current?.send(
          JSON.stringify({
            type: "subscribe",
            symbol: selectedStockSymbol.displaySymbol,
          }),
        );
      }
      selectedStockSymbolRef.current = selectedStockSymbol;
    }
  }, [selectedStockSymbol]);
  const selectedStockSymbolRef = useRef<StockSymbolItem>();

  //#region NOTE: For unreactive reference to that state
  const stockPricesRef = useRef<StockPriceResponse[]>();
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
        // TODO: Make type safe
        const jsonRes: StockPriceResponse = JSON.parse(event.data);
        if (jsonRes.type === "trade") {
          const jsonResMapped: StockPriceResponse = {
            type: jsonRes.type,
            data: jsonRes.data.map((a) => {
              a.distinctor = uuidv4();
              return a;
            }),
          };
          const resultArr = [jsonResMapped, ...(stockPricesRef.current || [])];
          setStockPrices(resultArr.slice(0, 8));
        }
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
          onClick={() => {
            console.log("Search button clicked");
            symbolLookupFetch(searchText).then((data) => {
              if (data) {
                const dataFiltered = data.result.filter(
                  (a) => a.displaySymbol == searchText.toUpperCase(),
                );
                console.log(dataFiltered);
                if (dataFiltered.length === 1) {
                  setSelectedStockSymbol(dataFiltered[0]);
                }
              }
            });
          }}
        >
          Search
        </button>
      </div>

      <Show when={typeof selectedStockSymbol !== "undefined"}>
        <div
          className={`mb-5 flex w-fit animate-fadeIn gap-2 rounded bg-neutral-800 px-3 py-1.5`}
        >
          <span>Currently Selected:</span>
          <span className="rounded bg-yellow-300 px-1.5 text-black">
            {selectedStockSymbol?.displaySymbol}
          </span>
        </div>
      </Show>
      <div className="relative flex w-full flex-grow flex-col-reverse place-content-start gap-2 overflow-scroll px-4 before:fixed before:bottom-0 before:h-1/4 before:w-full before:bg-gradient-to-t before:from-white before:via-white before:dark:from-black before:dark:via-black">
        {(() => {
          return stockPrices.map((stockPrice, i) => (
            <div
              key={i}
              className="flex w-full flex-wrap items-center justify-center gap-2 rounded border border-neutral-400 bg-neutral-800/40 p-2"
            >
              <span className="rounded bg-yellow-300 px-1.5 text-black">
                {stockPrice.data[stockPrice.data.length - 1].s}
              </span>
              <span>
                {Number(
                  stockPrice.data[stockPrice.data.length - 1].p,
                ).toLocaleString("en", {
                  style: "currency",
                  currency: "USD",
                })}
              </span>
              <span className="">@</span>
              <span className="text-center">
                {(() => {
                  const dateTime = DateTime.fromMillis(
                    stockPrice.data[stockPrice.data.length - 1].t,
                  );

                  return dateTime.toFormat("MM/dd/yyyy hh:mm a");
                })()}
              </span>
            </div>
          ));
        })()}
      </div>
    </>
  );
}
