async function construct_grammars(zip) {
	// Erase existing grammars
	HL7_versions = {}
	
	// Iterate over the ZIP's contents. For every file ending in ".json", acquire the version and pass the file to the the HL7Grammar for parsing.
	// Creates HL7 grammars for all the top-level directories it sees. Prunes the empty ones later if any.
	let entries = []
	zip.forEach(async (rel_path, zip_entry) => {
		entries.push([rel_path, zip_entry])
	})
	
	for (let entry of entries) {
		let [rel_path, zip_entry] = entry
		
		// Split the path to this file into components. The first component is the name of the zip file.
		let path_parts = rel_path.split("/").filter(item => item != "")
		
		// Identify JSON files within subdirectories.
		// Each subdirectory corresponds to an HL7 version, so JSON files in the top level directory have no interpretation.
		if (path_parts.length > 2 && path_parts[path_parts.length - 1].toLowerCase().endsWith(".json")) {
			let version_number = path_parts[1]
			
			// Create the grammar for this version if it doesn't exist yet.
			if (!(version_number in HL7_versions)) HL7_versions[version_number] = new HL7Grammar(version_number)
			
			let grammar_text = await zip_entry.async("text")
			
			try {
				let grammar_definition = await JSON.parse(grammar_text)
				await HL7_versions[version_number].consume(grammar_definition, rel_path)
			}
			catch (err) {
				if (err instanceof HL7GrammarError) HL7_versions[version_number].new_error(new HL7GrammarError(err.message, rel_path))
				else if (err instanceof SyntaxError) HL7_versions[version_number].new_error(new HL7GrammarError(err.message, rel_path))
				else throw err
			}
		}
	}
	
	// Finalize all grammars.
	for (let HL7_version of Object.values(HL7_versions)) {
		HL7_version.finalize()
	}
	
	console.log("Grammar Constructed")
	return HL7_versions
}

async function load_grammar_definitions(HL7GR_file) {
	if (HL7GR_file != null) {
		const HL7GR_reader = new FileReader()
		
		HL7GR_reader.onload = async (e) => {
			const hl7_grammar = e.target.result;
			const zip_file = await JSZip.loadAsync(hl7_grammar)
			let HL7_versions = await construct_grammars(zip_file)
			
			// Show version select.
			let hl7_version_span = document.getElementById("hl7-version-span")
			let hl7_version_select = document.getElementById("hl7-version-select")
			for (let version in HL7_versions) {
				let version_option = document.createElement("option")
				version_option.textContent = version
				
				hl7_version_select.appendChild(version_option)
			}
			
			// Show errros
			let all_versions_errors_div = document.getElementById("grammar-syntax-errors-div")
			
			all_versions_errors_div.replaceChildren(
				...Object.values(HL7_versions).map(val => new HL7GrammarRenderer(val).render_errors())
			)
			
			hl7_version_span.style.display = "inline"
			all_versions_errors_div.style.display = "block"
		}

		// Read the file as an ArrayBuffer, which JSZip can process
		HL7GR_reader.readAsArrayBuffer(HL7GR_file)
	}
}

let HL7_versions = {}
const hl7_grammar_file = document.getElementById("hl7-grammar-file-select")
hl7_grammar_file.addEventListener("change", () => {
	load_grammar_definitions(hl7_grammar_file.files[0])
	hl7_grammar_file.value = null
})

const hl7_grammar_button = document.getElementById("hl7-grammar-file-select-button")
hl7_grammar_button.addEventListener("click", () => hl7_grammar_file.click())