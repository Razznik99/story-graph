
import { getSystemInstruction } from './system-instructions';
import { tools } from './tools';

console.log('Verifying AI modules...');

try {
    const modes = ['CREATE_MODE', 'WRITE_MODE', 'RESEARCH_MODE', 'BRAINSTORM_MODE', 'ANALYSIS_MODE', 'CHARACTER_MODE', 'QA_MODE'];

    modes.forEach(mode => {
        const instruction = getSystemInstruction(mode);
        if (!instruction || instruction.length < 100) {
            throw new Error(`System instruction for ${mode} is too short or empty.`);
        }
        if (!instruction.includes('TRUTH AND DATA ACCESS RULES')) {
            throw new Error(`System instruction for ${mode} missing base instructions.`);
        }
        console.log(`- ${mode} instruction verified.`);
    });

    if (!Array.isArray(tools) || tools.length === 0) {
        throw new Error('Tools definition is empty or not an array.');
    }
    console.log(`- Tools verified: ${tools.length} tools found.`);

    // Check specific tools exist
    const requiredTools = ['getCardTypes', 'getCards', 'getEvents'];
    requiredTools.forEach(t => {
        // @ts-ignore
        if (!tools.find(tool => tool.name === t)) {
            throw new Error(`Missing required tool: ${t}`);
        }
    });

    console.log('Verification successful!');
} catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
}
