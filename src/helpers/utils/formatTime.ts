function renderTime(time: number) {
	return time > 9 ? time : `0${time}`;
}
export function hoursAndMinutes(dateInput: Date) {
	return `${renderTime(dateInput.getHours())} : ${renderTime(
		dateInput.getMinutes(),
	)}`;
}

export function daysBetween(date: Date) {
	const today = new Date();
	const diffTime = date.getTime() - today.getTime();
	if (diffTime < 0) return 0;
	return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
