# Ignore Property Feature

## Overview

This feature allows users to override global exclusion settings on a per-note basis using a YAML frontmatter property. When specific exclusion rules are globally enabled in the plugin settings, individual notes can disable these rules by listing them in a `cswc-disable` property.

## Use Case

Users may have global exclusion rules that work well for most of their vault, but occasionally need exceptions for specific notes. For example:
- A note documenting Windows file paths needs to count those paths despite the global "Exclude Windows Paths" setting
- A technical documentation note needs to count URLs and code blocks for accurate word counting

## Implementation

### Property Name
- `cswc-disable` (Custom Selected Word Count - disable)

### Property Format
YAML array containing exclusion rule identifiers to disable for the current note:

```yaml
---
cswc-disable: [exclude-windows-paths, exclude-urls, exclude-code-blocks]
---
```

### Supported Exclusion Identifiers

The following identifiers correspond to the global exclusion settings:

| Setting Name | Property Identifier |
|--------------|-------------------|
| Exclude Windows Paths | `exclude-windows-paths` |
| Exclude URLs | `exclude-urls` |
| Exclude Code Blocks | `exclude-code-blocks` |
| Exclude Inline Code | `exclude-inline-code` |
| Exclude Comments | `exclude-comments` |
| Exclude Headings | `exclude-headings` |
| Exclude Specific Headings | `exclude-specific-headings` |
| Exclude Words/Phrases | `exclude-words-phrases` |

### Behavior

1. **Global Settings Apply by Default**: All globally enabled exclusion rules apply to every note unless overridden.

2. **Per-Note Override**: When a note contains the `cswc-disable` property, the listed exclusion rules are disabled for that specific note only.

3. **Partial Override**: Users can disable some exclusions while keeping others active. Only the exclusions listed in `cswc-disable` are affected.

4. **Empty or Missing Property**: If the property is missing or empty, all global exclusion settings apply normally.

### Examples

#### Example 1: Disable Windows path exclusion only
```yaml
---
cswc-disable: [exclude-windows-paths]
---
```

#### Example 2: Disable multiple exclusions
```yaml
---
cswc-disable: [exclude-urls, exclude-code-blocks, exclude-inline-code]
---
```

#### Example 3: Alternative single-line format
```yaml
---
cswc-disable: exclude-windows-paths
---
```
(Should support both array and single string format for convenience)

## Technical Considerations

1. **Property Reading**: Need to parse YAML frontmatter and extract the `cswc-disable` property value.

2. **Validation**: Should handle various input formats gracefully:
   - Array format: `[item1, item2]`
   - Single string: `item`
   - Invalid values should be ignored

3. **Performance**: Property checking should be efficient as it will be performed during every count operation.

4. **Integration Points**:
   - Modify exclusion logic in `WordCountCalculator` to check for property overrides
   - Update count methods to pass note metadata/frontmatter data

## UI Integration

### Settings Reference
Users need an easy way to discover property values from within the Settings tab. Options include:

1. **Inline Help Text**: Add the property value under each exclusion toggle
2. **Property Reference Section**: Dedicated section listing all available values
3. **Collapsible Help**: Expandable section explaining the feature with all values
4. **Copy Buttons**: Allow one-click copying of property values
5. **Tooltips**: Show property values on hover

### Implementation Recommendation
Combine approaches for best user experience:
- Add subtle help text showing property value under each toggle
- Include a collapsible "Using per-note overrides" section at the top of exclusions
- Provide copy buttons for easy use

## Future Considerations

- Could extend to support enabling exclusions that are globally disabled (using a complementary property like `cswc-enable`)
- Might add validation/autocomplete support in future Obsidian versions
- Could provide UI indicators showing when exclusions are overridden in a note