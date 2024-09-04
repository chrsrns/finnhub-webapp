"use client";

import { DateTime } from "luxon";
import {
  ChangeEvent,
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Show, uuidv4 } from "./utils";

//#region
// NOTE: These are the data struct representint the data returned by Finnhub API
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

  const [isAutoUpdate, setIsAutoUpdate] = useState(false);
  const isAutoUpdateRef = useRef(false);
  useEffect(() => {
    isAutoUpdateRef.current = isAutoUpdate;
  }, [isAutoUpdate]);

  const [isLoading, setIsLoading] = useState(false);

  const [searchErrorText, setSearchErrorText] = useState("");

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
    setSearchErrorText("");
  }, [searchText, symbolLookupThrottled]);

  useEffect(() => {
    // NOTE: For unsubscribing the old stock symbol
    // We want this because we don't want the old selection to still send updates to the client.
    if (selectedStockSymbolRef.current)
      socket.current?.send(
        JSON.stringify({
          type: "unsubscribe",
          symbol: selectedStockSymbolRef.current.displaySymbol,
        }),
      );
    // NOTE: On change of selected stock symbol, this queries the API for the latest price.
    if (selectedStockSymbol) {
      if (selectedStockSymbol.displaySymbol) {
        // NOTE: Set loading state to true here
        setIsLoading(true);
        // NOTE: Fetches the latest stock price, since the websocket does not send the latest one on subscribe.
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
          })
          // NOTE: funally set loading state to false here
          .finally(() => setIsLoading(false));
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

  // NOTE: This initializes the websocket and configures it to listen to incoming messages.
  useEffect(() => {
    if (!socket.current) {
      socket.current = new WebSocket(
        `wss://ws.finnhub.io?token=${process.env.NEXT_PUBLIC_FINNHUB_KEY}`,
      );
      socket.current.addEventListener("message", (event) => {
        if (!isAutoUpdateRef.current) return;

        // NOTE: parse the message, and if valid, add to the list of prices.
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

  //#region
  // NOTE: This region handles hover and focus events for the options and input interfaces, respectively.
  // This is so that focusing the input text shows the options, leaving the focus but hovering on the options
  // make the options stay visible, and clicking on the options makes it go away, which seems to be not possible on CSS AFAIK.

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchResultsHovered, setIsSearchResultsHovered] = useState(false);
  // NOTE: handlers for the search text input element
  function handleSearchTextChange(e: ChangeEvent<HTMLInputElement>) {
    setSearchText(e.target.value);
  }
  function handleSearchInputFocus(_: FocusEvent<HTMLInputElement>) {
    console.log("Focused");
    setIsSearchFocused(true);
  }
  function handleSearchInputBlur(_: FocusEvent<HTMLInputElement>) {
    setIsSearchFocused(false);
  }

  // NOTE: handlers for the search results events
  function handleSearchResultsMouseOver(_: MouseEvent<HTMLDivElement>) {
    setIsSearchResultsHovered(true);
  }
  function handleSearchResultsMouseLeave(_: MouseEvent<HTMLDivElement>) {
    setIsSearchResultsHovered(false);
  }

  // NOTE: handler for the auto update checkbox
  function handleCheckbox(e: ChangeEvent<HTMLInputElement>) {
    setIsAutoUpdate(e.target.checked);
  }

  // NOTE: handler for search text box enter key
  function handleSearchTextBoxKeyUp(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key == "Enter") {
      queryFromSearchText();
      if (document.activeElement instanceof HTMLElement)
        document.activeElement.blur();
    }
  }

  //#endregion

  // NOTE: Extracted to be reusable
  const queryFromSearchText = () => {
    setIsLoading(true);
    symbolLookupFetch(searchText)
      .then((data) => {
        if (data) {
          const dataFiltered = data.result.filter(
            (a) => a.displaySymbol == searchText.toUpperCase(),
          );
          if (dataFiltered.length === 1) {
            setSelectedStockSymbol(dataFiltered[0]);
          } else {
            setSearchErrorText("Stock symbol not found in API");
          }
        }
      })
      .finally(() => setIsLoading(false));
  };
  return (
    <>
      <div className={`${searchErrorText === "" ? "pb-10" : "pb-4"} pt-10`}>
        <div className="flex w-full flex-wrap place-items-center justify-center gap-4">
          <div className="relative">
            <input
              value={searchText}
              onChange={handleSearchTextChange}
              onKeyUp={handleSearchTextBoxKeyUp}
              onFocus={handleSearchInputFocus}
              onBlur={handleSearchInputBlur}
              placeholder="Enter stock symbol or name"
              className="justify-center rounded-xl border border-b border-gray-300 bg-gray-200 bg-gradient-to-b from-zinc-200 p-4 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-900 dark:from-inherit"
            ></input>
            <Show when={isSearchFocused || isSearchResultsHovered}>
              <div
                onMouseOver={handleSearchResultsMouseOver}
                onMouseLeave={handleSearchResultsMouseLeave}
                className="top-100 absolute z-10 mt-2 w-full flex-col rounded border border-neutral-400 bg-zinc-900 p-2.5"
              >
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
                          setSelectedStockSymbol(symbol);
                          setSearchErrorText("");
                          setIsSearchResultsHovered(false);
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
            </Show>
          </div>
          <button
            className="focus:shadow-outline min-w-fit rounded bg-white px-4 py-2 font-bold text-black hover:bg-neutral-300 focus:outline-none"
            type="button"
            onClick={() => {
              queryFromSearchText();
            }}
          >
            Search
          </button>
        </div>
        <div className="mt-4 text-center text-base text-red-400">
          {searchErrorText}
        </div>
      </div>

      <Show when={typeof selectedStockSymbol !== "undefined"}>
        <div className="mb-5 flex animate-fadeIn flex-wrap justify-center gap-4">
          <label className="flex flex-col justify-center align-middle font-bold text-white">
            <input
              className="leading-tight"
              type="checkbox"
              checked={isAutoUpdate}
              onChange={handleCheckbox}
            ></input>
            <span className="text-sm">Auto-Update</span>
          </label>
          <div
            className={`flex w-fit animate-fadeIn gap-2 rounded bg-neutral-800 px-3 py-1.5`}
          >
            <span>Currently Selected:</span>
            <span className="rounded bg-yellow-300 px-1.5 text-black">
              {selectedStockSymbol?.displaySymbol}
            </span>
          </div>
        </div>
      </Show>
      <div className="flex w-full flex-grow flex-col place-content-start gap-2 px-4 before:fixed before:bottom-0 before:h-1/4 before:w-full before:bg-gradient-to-t before:from-white before:via-white before:dark:from-black before:dark:via-black">
        <Show when={isLoading}>
          <div className="flex animate-fadeIn justify-center">
            <svg
              className="animate-spin"
              fill="currentColor"
              strokeWidth="0"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 512 512"
              style={{ overflow: "visible", color: "currentcolor" }}
              height="1em"
              width="1em"
            >
              <path d="M304 48a48 48 0 1 0-96 0 48 48 0 1 0 96 0zm0 416a48 48 0 1 0-96 0 48 48 0 1 0 96 0zM48 304a48 48 0 1 0 0-96 48 48 0 1 0 0 96zm464-48a48 48 0 1 0-96 0 48 48 0 1 0 96 0zM142.9 437A48 48 0 1 0 75 369.1a48 48 0 1 0 67.9 67.9zm0-294.2A48 48 0 1 0 75 75a48 48 0 1 0 67.9 67.9zM369.1 437a48 48 0 1 0 67.9-67.9 48 48 0 1 0-67.9 67.9z"></path>
            </svg>
          </div>
        </Show>
        {(() => {
          return stockPrices.map((stockPrice, _) => {
            const stockPriceData = stockPrice.data[stockPrice.data.length - 1];
            return (
              <div
                key={`${stockPriceData.s}-${stockPriceData.p}-${stockPriceData.t}-${stockPriceData.v}-${stockPriceData.distinctor}`}
                className="flex w-full animate-fadeIn flex-wrap items-center justify-center gap-2 rounded border border-neutral-400 bg-neutral-800/40 p-2"
              >
                <span className="rounded bg-yellow-300 px-1.5 text-black">
                  {stockPriceData.s}
                </span>
                <span>
                  {Number(stockPriceData.p).toLocaleString("en", {
                    style: "currency",
                    currency: "USD",
                  })}
                </span>
                <span className="">@</span>
                <span className="text-center">
                  {(() => {
                    const dateTime = DateTime.fromMillis(stockPriceData.t);

                    return dateTime.toFormat("MM/dd/yyyy hh:mm:ss a");
                  })()}
                </span>
              </div>
            );
          });
        })()}
      </div>
    </>
  );
}
