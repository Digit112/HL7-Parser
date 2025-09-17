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
		if (error.citations == null || error.citations.length == 0) {
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
			
			let all_cited_errors = [].concat(...(error.citations.map(citation => citation.errors)))
			let errors_body_div = render_errors(all_cited_errors, false)
			errors_body_div.style.display = "none"
			
			error_header_div.append(expand_button, error_header_p)
			errors_div.append(error_header_div, errors_body_div)
		}
	}
	
	return errors_div
}
