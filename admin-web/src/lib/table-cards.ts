/**
 * Phones get tables as stacked cards (see `table[data-cards]` in styles.css). The card CSS
 * shows each cell's column heading from `data-label`, so this copies the <th> text onto every
 * cell and keeps doing so as rows are added or replaced.
 */
function labelTable(table: HTMLTableElement) {
  const headings = Array.from(table.querySelectorAll("thead th")).map(
    (th) => th.textContent?.trim() ?? "",
  );
  if (headings.length === 0) return;
  for (const row of table.querySelectorAll("tbody tr")) {
    Array.from(row.children).forEach((cell, index) => {
      const heading = headings[index] ?? "";
      const label = /^actions?$/i.test(heading) ? "" : heading;
      if (cell.getAttribute("data-label") !== label) cell.setAttribute("data-label", label);
    });
  }
}

export function installTableCards() {
  if (typeof document === "undefined") return () => {};
  let queued = false;
  const run = () => {
    queued = false;
    document.querySelectorAll<HTMLTableElement>("table[data-cards]").forEach(labelTable);
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(run);
  };
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  run();
  return () => observer.disconnect();
}
