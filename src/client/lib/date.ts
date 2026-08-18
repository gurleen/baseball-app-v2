/** YYYY-MM-DD in the viewer's local timezone (not UTC, which shifts night games). */
export function toDateParam(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function today(): string {
	return toDateParam(new Date());
}

export function shiftDate(dateParam: string, days: number): string {
	const [year, month, day] = dateParam.split("-").map(Number);
	const date = new Date(year!, month! - 1, day!);
	date.setDate(date.getDate() + days);
	return toDateParam(date);
}

export function formatTime(iso: string): string {
	return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
