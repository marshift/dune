interface Link {
	href: string;
	text: string;
}

export default {
	links: [
		{
			href: "https://notnite.com/",
			text: "jules' website",
		},
		{
			href: "https://marsh.zone/",
			text: "marsh's website",
		},
	] satisfies Link[],
};
