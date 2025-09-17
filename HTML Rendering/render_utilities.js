/*
	Utilities used by rendering functions to avoid code duplication.
	HL7 constructs have many quirks that defy abstraction...
*/

function _toggle_show_hide(elem, expand_button) {
	if (elem.style.display == "none") {
		elem.style.display = "block"
		expand_button.textContent = "-"
	}
	else {
		elem.style.display = "none"
		expand_button.textContent = "+"
	}
}

function render_errors(errors, is_root=true) {
	let errors_div = document.createElement("div")
	if (is_root)
		errors_div.setAttribute("class", "errors-root-div")
	else
		errors_div.setAttribute("class", "errors-div")
	
	// Generate errors.
	for (let error of errors) {
		let all_cited_errors = null
		if (error.citations != null) {
			all_cited_errors = [].concat(...(error.citations.map(citation => citation.errors)))
		}
		
		if (all_cited_errors == null || all_cited_errors.length == 0) {
			let error_paragraph = document.createElement("p")
			error_paragraph.setAttribute("class", "errors-text")
			error_paragraph.textContent = error.message
			
			errors_div.append(error_paragraph)
		}
		// Error has citations. Generate cascading results.
		else {
			let error_header_div = document.createElement("div")
			error_header_div.setAttribute("class", "errors-header")
			
			let expand_button = document.createElement("button")
			expand_button.textContent = "+"
			expand_button.setAttribute("class", "expand-button")
			expand_button.addEventListener("click", function() {_toggle_show_hide(errors_body_div, this)})
			
			let error_header_p = document.createElement("p")
			error_header_p.setAttribute("class", "errors-text")
			error_header_p.textContent = error.message
			
			let errors_body_div = render_errors(all_cited_errors, false)
			errors_body_div.style.display = "none"
			
			error_header_div.append(expand_button, error_header_p)
			errors_div.append(error_header_div, errors_body_div)
		}
	}
	
	return errors_div
}

// Builds out and returns a div with the passed entity's "long description" and "from" if they exist, putting a line break between them if they both exist.
function render_long_description(underlying_entity) {
	let body = document.createElement("div")
	
	// Generate from w/ link if possible
	let from_span = null
	if (underlying_entity.from != "") {
		from_span = document.createElement("span")
		if (underlying_entity.grammar.from != "") {
			let hl7_link = document.createElement("a")
			hl7_link.setAttribute("href", underlying_entity.grammar.from)
			hl7_link.textContent = `HL7 ${underlying_entity.grammar.version_id}`
			
			from_span.append("From ", hl7_link, ` § ${underlying_entity.from}`)
		}
		else {
			from_span.append(`From HL7 ${underlying_entity.grammar.version_id} § ${underlying_entity.from}`)
		}
	}
	
	// Build description
	if (underlying_entity.long_description != "") {
		body.append(underlying_entity.long_description)
		if (from_span != null) body.append(document.createElement("br"))
	}
	if (from_span != null) {
		body.append(from_span)
	}
	
	return body
}