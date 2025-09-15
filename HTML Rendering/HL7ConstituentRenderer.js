class HL7ConstituentRenderer {
	constructor(parsed_constituent) {
		this.parsed_constituent = parsed_constituent
	}
	
	// Level determines the delimiters to use (the characters themselves are stashed in this.parsed_constituent.delimiters)
	// Level must be 1 or 2, level 0 is the field delimiter which is only used by HL7SegmentRenderer
	render_constituent(constituent_description_div, entity_description_div, level) {
		let rendered = document.createElement("span")
		rendered.textContent = "constituent text"
		
		return rendered
	}
}