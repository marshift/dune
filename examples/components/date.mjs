const currDate = new Date();

export default {
	iso: currDate.toISOString(),
	utc: currDate.toDateString(),
};
