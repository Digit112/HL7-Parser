# HL7 Specification Documents

This folder contains JSON files defining the available messages, segments, data types, and tables in HL7.

These definitions all look like key-value pairs with a key having a metatype part and a type-id part, separated by a space, the type-id itself sometimes has spaces.

An HL7 message is split into segments which are themselves subdivided into components, these components may be a composite (split into subcomponents) or a primitive. Subcomponents must be primitives.

| Depth | Field Name      | Metatypes that can occupy this field |
| :---: | :-------------- | :----------------------------------- |
| 0     | Message         | MESSAGE                              |
| 1     | Segment         | SEGMENT                              |
| 2     | Component       | COMPOSITE, PRIMITIVE                 |
| 3     | Subcomponent    | PRIMITIVE                            |

Think of a metatype (which isn't a real HL7 concept by the way) as categorizations that all HL7 types - including segments and messages themselves - fall into. They govern the way in which the type hierarchy can be arranged. Because a segment is divided into components, and all components must have metatype of COMPOSITE or PRIMITIVE, a segment's constituents must never have a metatype of MESSAGE. For example, if you specify that an "MSH" segment has a constituent of type "ORU R01", the metatype checker will see that this is invalid and yell at you.

## Messages, Segments, Composites, & Primitives

The definitions for Messages, Segments, Composites, and Primitives are shown below. Note that the former three are specified as a collection of what my implementation calls its "constituents".

```
"PRIMITIVE <type-id>": {
	"description": "<description>",
	"long-description": "<long description>",
	"from": "<section>",
	"length": <integer>
}
```

```
"<MESSAGE | SEGMENT | COMPOSITE> <type-id>": {
	"description": "<description>",
	"long-description": "<long description>",
	"from": "<section>",
	"constituents": [
		{
			"description": "<description>",
			"long-description": "<long description>",
			"from": "<section>",
			"type": "<type-id>",
			"length": <integer>,
			"optionality": "<O | C | R | B>",
			"repeatability": <integer>,
			"table": "<table-id>"
		},
		...
	}]
}
```

In both cases, the `type-id` key is the unique identifier for this message, segment, or data type as defined by HL7. Examples include "ORU R01", "MSH", and "ST".

The `description`, `long-description`, and `from` fields are all the same - will be displayed to the user, optional, typically  HL7 documentation, and default to an empty string. `description` is shown more readily than `long-description`, and `from` is a dot-delimited specifier for a section of the HL7 specification, for example `"2.A.33.1"` which describes the Namespace ID field of the Hierarchic designator composite.

The constituent `type` field must match the `type-id` key on some other definition.

The `length` fields are optional. In the primitive definition, excluding the length causes it to default to infinity ("length" really means "maximum length"). In the composite definition, you specify the lengths of each constituent. Excluding the length causes it to inherit the length on the table, if specified, or the type of the constituent if not, this is common since the length of a constituent is often the length of its type.

The length of an entire messsage, segment, or composite is always the sum of the lengths of the constituents plus the number of delimiters needed to separate them.

The values for "optionality" correspond to "Optional", "Conditional", "Required", "Backward Compatible", and "Withdrawn".
The options "C", "B", and "W" are internally treated identically to optional ("O"), but are conformant with the specification and also provide information to readers of the file.

"repeatability" is the maximum number of times this constituent can appear, with -1 meaning it can appear an unlimited number of times. Default is 1.

"table" is specified on fields like ID or HD which are really enums.

## Tables

Tables are like enum types and have definitions that look like this:

```
"TABLE <table-id>": {
	"description": "<description>",
	"long-description": "<long description>",
	"from": "<section>",
	"length": <integer>,
	"values": {
		"<value 1>": "<description 1>",
		"<value 2>": "<description 2>",
		...,
		"<value n>": "<description n>"
	}
}
```

They don't map 1-to-1 to HL7's concept of a "type" and are instead bucketed into types. For example, an "ID" field might refer to a value from table "0155" - "Accept/application acknowledgment conditions" or perhaps a value from table "0399" - "Country code", or could be a user-defined ID.

The descriptions can all be whatever you like but - of course - are ideally retrieved at least in part from HL7 documentation. Specify the `from` value as a dot-delimited ID for a section of the documentation, for example `"2.15.9.17"` for the definition of table "0399" - Country Codes.

## Initialization Process

Upon initialization, every .json file in this directory and subdirectories is read and their definitions concatenateed. The order in which the definitions are read is irrelevant.
In addition, validators.js is executed and this is expected to register validators for each type of field with code like the following:

```
field_validator.register(<name>, (val) => {
	// Returns an HL7ValidationResult
}
```

`field_validator` is a global variable accessible from this file.

## Interpreter Leniency

An important note is that the restrictions are only enforced by the system when writing messages. In reading them, Unicode is supported in all fields including ones supposed to be restricted to ASCII-only, and the length limits are freely surpassed. Additionally, unrecognized table values are accepted - all such violations are logged internally and may be written out to console or file after reading succeeded.

Unrecognized types and tables are parsed as best as possible, including entire unrecognized messages and segments. So long all the recognized segments are not malformed, and the very first segment is MSH, all unrecognized segments will be split into components. None of their types will be known, they will all therefore be treated as raw character strings, all unrecognized components will be presumed primmitives, this process will store a log of many many errors on the final, parsed entity.