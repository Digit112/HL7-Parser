# HL7 Grammar Specification Documents

This folder contains JSON files defining the available messages, segments, composites, primitives, and tables in HL7. These definitions are separated into folders corresponding to their respective HL7 version as it would appear in the Verssion ID segment of an MSH header (see table 0104).

These definitions all look like key-value pairs with a key having a metatype part and a type-id part, separated by a space, the type-id itself can also have spaces.

An HL7 message is split into segments which are themselves subdivided into components, these components may be a composite (split into subcomponents) or a primitive. Subcomponents must be primitives.

| Depth | Field Name      | Metatypes that can occupy this field |
| :---: | :-------------- | :----------------------------------- |
| 0     | Message         | MESSAGE                              |
| 1     | Segment         | SEGMENT                              |
| 2     | Component       | COMPOSITE, PRIMITIVE                 |
| 3     | Subcomponent    | PRIMITIVE                            |

Think of a metatype (which isn't a real HL7 concept by the way) as categorizations that all HL7 types - including segments and messages themselves - fall into. They govern the way in which the type hierarchy can be arranged. 

*For example*, because a segment is divided into components, and all components must have metatype of COMPOSITE or PRIMITIVE, a segment's constituents must never have a metatype of MESSAGE. For example, if you specify that an "MSH" segment has a constituent of type "ORU R01", the metatype checker will see that this is invalid and yell at you, even though this grammar is not logically contradictory.

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
			"optionality": "<O | C | R | B | W>",
			"repeatability": <integer>,
			"table": "<table-id>",
			"constituents": [ ... ]
		},
		...
	}]
}
```

In both cases, the `type-id` key is the unique identifier for this message, segment, or data type as defined by HL7. Examples include "ORU R01", "MSH", and "ST".

The `description`, `long-description`, and `from` fields are all basically the same - will be displayed to the user, typically come straight from the HL7 documentation (perhaps elided), and default to an empty string. `description` should be only a few words, whereas `long-description` may be anywhere from a short sentence to a paragraph and is used to explain semantics and edge cases. `from` is a dot-delimited specifier for a section of the HL7 specification, for example `"2.A.33.1"` which describes the Namespace ID field of the Hierarchic designator composite.

The constituent `type` field must match the `type-id` key on some other definition.

The `length` fields are optional. In the primitive definition, excluding the length causes it to default to infinity ("length" really means "maximum length"). In the composite definition, you specify the lengths of each constituent. Excluding the length causes it to inherit the length on the table, if specified, or the type of the constituent if not, this is common since the length of a constituent is often the length of its type.

The length of an entire messsage, segment, or composite is always the sum of the lengths of the constituents plus the number of delimiters needed to separate them. It cannot be manually specified.

The values for `optionality` correspond to "Optional", "Conditional", "Required", "Backward Compatible", and "Withdrawn".
The options "C", "B", and "W" are internally treated identically to optional ("O"), but are conformant with the specification and also provide information to readers of the file.

`repeatability` is the maximum number of times this constituent can appear, with -1 meaning it can appear an unlimited number of times. Default is 1.

`table` is specified on fields like ID or HD which are really just enums.

### Nested constituents

The `constituents` field is recursive, it can have constituents of its own. This models the HL7 concept of "segment groups" quite well. Many restrictions apply to this field, however. Firstly, that this feature is only valid on MESSAGE entities, since they are the only entities whose constituents are segments or segment groups (which are what we are grouping). Secondly, a constituent with a `constituents` field of its own must never have the `type`, `length`, or `table` attributes. Thirdly, the constituents of a constituent are always segments (or segment groups).

The `optionality` and `repeatability` fields are really the things that make this feature so valuable. A constituent segment group with two segments inside can be made optional while those two segments are each required within the group. Thus, the two segments must appear as a pair or not at all. Or the group can be made repeatable, such that the segments must always repeat together as a pair. 

An early example is this constituent of MESSAGE ADT A01, an optional-repeatable group with a single required PR1 segment optionally followed by 1 or more required segments.

```
{
	"optionality": "O",
	"repeatability": -1,
	"constituents": [{
		"description": "Procedure",
		"type": "PR1",
		"optionality": "R"
	}, {
		"description": "Role",
		"type": "ROL",
		"optionality": "O",
		"repeatability": -1
	}]
}
```

HL7 2.3 § 2.11 refers to segment groups as a part of their "special notation" for messages as a convenience for defining segments which must appear together. In fact, it is much more, and has enormous implications for the parsing of HL7 messages. The most immediate is that some messages have multiple instances of a given segment in different groups or have one in a group and another outside a group. Since HL7 was (somewhat implicitly) ambivalent to the segment ordering except of course for the MSH segment, segment groups make it impossible to determine which of two segments is which.

To resolve this issue, later versions like HL7 2.5 § 2.5.2 impose restrictions on the ordering of fields in these situations. In short, two instances of a segment which are not repetitions of one another and which do not belong to a common group or which are both individual

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

The values are valid entries for an ID type (or similar) referencing this table. The descriptions, on the other hand, are all flavor text for readability's sake. This interface almost never actually interprets table values.

### Alternative Values

Values are typically specified as above as key-value pairs. Alternatively, the descriptions may be arrays as such:

```
"values": [
	"value 1": "desc 1",
	"value 2": ["desc 2"],
	"value 3": ["desc 3 part 1", "desc 3 part 2"]
}
```

And yes, the forms of each pair can be mix-and-matched like this.

The keys can also be arrays. In this case, they define a composite type from a table, for example an HD. Obviously, we must change the form of the whole `values` body. The dictionary becomes an array of pairs like so:

```
"values": [
	["value 1", "desc 1"],
	["value 2", ["desc 2 part 1", "desc 2 part 2"]],
	[["value 3 part 1", "value 3 part 2"], "desc 3"],
	[["value 4 part 1", "value 4 part 2"], ["desc 4 part 1", "desc 4 part 2"]],
	[["23", "myhealthapplication.com", "DNS"], "My Health Application"]
]
```

The last example takes the form that you'd expect to see in table 0300 - a user-defined table of hierarchic designators (HD). The three fields in the key correspond to the three subcomponents of that composite type.

## Usage

This folder should be zipped and the extension changed to HL7GR. This may be provided to the file input in the web page. That page will construct the resources necessary to read and write HL7 using the specification(s) in the grammar file. Each subfolder corresponds to a distinct version and is parsed in complete isolation from the others.

## Interpreter Leniency

An important note is that the restrictions are only enforced by the system when writing messages. In reading them, Unicode is supported in all fields including ones supposed to be restricted to ASCII-only, and the length limits are freely surpassed. Additionally, unrecognized table values are accepted - all such violations are logged internally and may be written out to console or file after reading succeeded.

Unrecognized types and tables are parsed as best as possible, including entire unrecognized messages and segments. So long all the recognized segments are not malformed, and the very first segment is MSH, all unrecognized segments will be split into components. None of their types will be known, they will all therefore be treated as raw character strings, all unrecognized components will be presumed primmitives, this process will store a log of many many errors on the final, parsed entity.