export function isValidQuarter(quarter: string) {
  return /^\d{4}-Q[1-4]$/.test(quarter);
}

function parseQuarter(quarter: string) {
  const [yearStr, qStr] = quarter.split("-Q");
  return { year: Number(yearStr), q: Number(qStr) };
}

export function currentQuarterString() {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) + 1;
  return `${now.getFullYear()}-Q${q}`;
}

export function quarterRange(quarter: string) {
  const { year, q } = parseQuarter(quarter);
  const startMonth = (q - 1) * 3;
  return {
    start: new Date(year, startMonth, 1),
    end: new Date(year, startMonth + 3, 1),
  };
}

export function quarterMonths(quarter: string) {
  const { year, q } = parseQuarter(quarter);
  const startMonth = (q - 1) * 3;
  return [0, 1, 2].map(
    (i) => `${year}-${String(startMonth + i + 1).padStart(2, "0")}`
  );
}

export function shiftQuarter(quarter: string, delta: number) {
  const { year, q } = parseQuarter(quarter);
  const total = year * 4 + (q - 1) + delta;
  const newYear = Math.floor(total / 4);
  const newQ = ((total % 4) + 4) % 4;
  return `${newYear}-Q${newQ + 1}`;
}

export function formatQuarterLabel(quarter: string) {
  const { year, q } = parseQuarter(quarter);
  return `Q${q} ${year}`;
}
