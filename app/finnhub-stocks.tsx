"use client";

import { ChangeEvent, FocusEvent, useState } from "react";
import { Show } from "./utils";

export default function FinnhubStocks() {
  const [searchText, setSearchText] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // START handlers for the search text input element
  function handleSearchTextChange(e: ChangeEvent<HTMLInputElement>) {
    setSearchText(e.target.value);
  }
  function handleSearchInputFocus(_: FocusEvent<HTMLInputElement>) {
    setIsSearchFocused(true);
  }
  function handleSearchInputBlur(_: FocusEvent<HTMLInputElement>) {
    setIsSearchFocused(false);
  }
  // END

  return (
    <>
      <div className="flex w-full flex-wrap place-items-center justify-center gap-4 py-10">
        <div className="relative">
          <input
            value={searchText}
            onChange={handleSearchTextChange}
            onFocus={handleSearchInputFocus}
            onBlur={handleSearchInputBlur}
            placeholder="Enter stock symbol or name"
            className="justify-center rounded-xl border border-b border-gray-300 bg-gray-200 bg-gradient-to-b from-zinc-200 p-4 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-900 dark:from-inherit"
          ></input>
          <Show when={isSearchFocused}>
            <div className="top-100 absolute z-10 mt-2 h-32 w-full rounded border border-neutral-400 bg-zinc-900"></div>
          </Show>
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
