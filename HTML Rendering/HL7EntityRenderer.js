class HL7EntityRenderer {
	constructor(parsed_entity) {
		if (parsed_entity == null)
			throw new Error("Parsed Entity must not be null.")
		
		this.parsed_entity = parsed_entity
	}
	
	// Renders errors on the parsed_entity object, which will have an errors array.
	// The errors cascade.
	render_errors() {
		// Generate Errors Collapsible
		let errors_div = document.createElement("div")
		let errors_header_div = document.createElement("div")
		errors_header_div.setAttribute("class", "errors-header")
		
		let errors_text = document.createElement("span")
		if (this.parsed_segment.errors.length == 0) {
			errors_text.setAttribute("class", "no-errors")
			errors_text.textContent = "Entity parsed without issue."
			
			errors_header_div.append(errors_text)
			errors_div.append(errors_header_div)
		}
		else {
			let errors_body_div = document.createElement("div")
			errors_body_div.setAttribute("class", "errors-div")
			errors_body_div.style.display = "none"
			
			errors_text.setAttribute("class", "errors")
			errors_text.textContent = `Entity parsed with ${this.parsed_segment.errors.length} issues.`
		
			// Generic button to expand/collapse the body.
			let errors_expand_button = document.createElement("button")
			errors_expand_button.setAttribute("class", "expand-button")
			errors_expand_button.textContent = "+"
			errors_expand_button.addEventListener("click", () => {
				if (errors_body_div.style.display == "none") {
					errors_body_div.style.display = "block"
					errors_expand_button.textContent = "-"
				}
				else {
					errors_body_div.style.display = "none"
					errors_expand_button.textContent = "+"
				}
			})
			
			// Generate errors.
			for (let error of this.parsed_segment.errors) {
				let error_paragraph = document.createElement("p")
				error_paragraph.setAttribute("class", "errors-text")
				error_paragraph.textContent = error.message
				
				errors_body_div.append(error_paragraph)
			}
			
			errors_header_div.append(errors_expand_button, errors_text)
			errors_div.append(errors_header_div, errors_body_div)
		}
		
		return errors_div
	}
}