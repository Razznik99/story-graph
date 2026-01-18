import { AttributeDefinition } from '@/domain/types';

export function validateAttributes(
    rawAttributes: { attrId: string; value: unknown }[],
    definitions: AttributeDefinition[]
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const defMap = new Map(definitions.map((d) => [d.id, d]));

    for (const attr of rawAttributes) {
        const def = defMap.get(attr.attrId);

        if (!def) {
            // We can choose to ignore unknown attributes or flag them. 
            // For strictness, let's flag them, but often they might be stale data.
            // Let's ignore them for now to allow for "soft" schema changes, 
            // or if we want strictness: errors.push(`Unknown attribute ID: ${attr.attrId}`);
            continue;
        }

        if (attr.value === null || attr.value === undefined) {
            continue; // Optional values are fine? Or should we check for required?
            // Assuming attributes are nullable/optional by default in this system unless specified otherwise in config.
        }

        // Basic type checking
        switch (def.attrType) {
            case 'Text':
                if (typeof attr.value !== 'string') {
                    errors.push(`Attribute '${def.name}' expects a string value.`);
                }
                break;
            case 'Number':
                if (typeof attr.value !== 'number') {
                    // Allow string numbers?
                    if (typeof attr.value === 'string' && !isNaN(Number(attr.value))) {
                        // It's parseable, so maybe okay, but let's be strict if the UI sends proper types.
                        // If UI sends strings for numbers, we might want to strict check.
                        // For now, let's error if it's not a number.
                        errors.push(`Attribute '${def.name}' expects a number value.`);
                    } else {
                        errors.push(`Attribute '${def.name}' expects a number value.`);
                    }
                }
                break;
            case 'UnitNumber':
                // Expecting { value: number, unit: string }
                if (
                    typeof attr.value !== 'object' ||
                    !('value' in (attr.value as any)) ||
                    !('unit' in (attr.value as any))
                ) {
                    errors.push(`Attribute '${def.name}' expects a unit number value.`);
                }
                break;
            case 'Option':
                // Check if value is one of the options in config
                // config: { options: string[] }
                const options = (def.config as any)?.options;
                if (Array.isArray(options) && !options.includes(attr.value)) {
                    errors.push(`Attribute '${def.name}' has invalid option '${attr.value}'.`);
                }
                break;
            // Add other types as needed
        }
    }

    return { valid: errors.length === 0, errors };
}
